import test from "node:test";
import assert from "node:assert/strict";

import {
  INITIAL_MESSAGES,
  appendNexExchange,
  clearNexChat,
  configureNexChat,
  getNexChatSnapshot,
  hydrateNexChat,
  isNexChatBusy,
  partialAnswerNote,
  sendNexMessage,
  subscribeNexChat,
} from "../src/lib/chat/nex-chat-store.ts";
import { CHAT_STORAGE_KEY } from "../src/lib/nex-knowledge.ts";

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

function ndjsonResponse(events: unknown[]) {
  const body = events.map((event) => JSON.stringify(event)).join("\n") + "\n";
  return new Response(body, { status: 200, headers: { "Content-Type": "application/x-ndjson" } });
}

const answerEvents = [
  { type: "status", label: "Thinking" },
  { type: "text_delta", text: "Hello " },
  { type: "text_delta", text: "there." },
  { type: "trace", trace: { rounds: 1, toolCount: 0, elapsedMs: 10, sources: [], refusals: [], model: "m" } },
  { type: "suggestions", suggestions: ["Next?"] },
  { type: "done" },
];

function lastMessage() {
  const { messages } = getNexChatSnapshot();
  return messages[messages.length - 1];
}

test("a sent message streams into one shared conversation and anchors the turn", async () => {
  configureNexChat({ fetch: async () => ndjsonResponse(answerEvents), storage: memoryStorage() });
  hydrateNexChat();
  let notified = 0;
  const unsubscribe = subscribeNexChat(() => (notified += 1));
  await sendNexMessage("hi");
  unsubscribe();
  const { messages, isLoading, turnAnchorId, announcement } = getNexChatSnapshot();
  assert.equal(isLoading, false);
  assert.equal(messages.length, 3);
  assert.equal(messages[1].role, "user");
  assert.equal(turnAnchorId, messages[1].id);
  assert.equal(messages[2].content, "Hello there.");
  assert.deepEqual(messages[2].suggestions, ["Next?"]);
  assert.equal(messages[2].streaming, false);
  assert.equal(announcement, "Answer ready");
  assert.ok(notified > 2, "subscribers hear every change");
});

test("a failed send can be retried and replaces the failed answer instead of duplicating it", async () => {
  let call = 0;
  configureNexChat({
    fetch: async () => {
      call += 1;
      return call === 1 ? new Response(JSON.stringify({ error: "busy", code: "rate_limited", retryable: true }), { status: 429 }) : ndjsonResponse(answerEvents);
    },
    storage: memoryStorage(),
  });
  hydrateNexChat();
  await sendNexMessage("hi");
  const failed = getNexChatSnapshot().messages[getNexChatSnapshot().messages.length - 1]!;
  assert.equal(failed.error?.code, "rate_limited");
  await sendNexMessage({ text: failed.error!.retryText, retryMessageId: failed.id, retryUserMessageId: failed.error!.userMessageId });
  const { messages } = getNexChatSnapshot();
  assert.equal(messages.filter((message) => message.role === "user").length, 1);
  assert.equal(messages[messages.length - 1]!.content, "Hello there.");
  assert.equal(messages[messages.length - 1]!.error, undefined);
});

test("clearing aborts an in-flight request and resets history", async () => {
  configureNexChat({
    fetch: (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    storage: memoryStorage(),
  });
  hydrateNexChat();
  const pending = sendNexMessage("hi");
  assert.equal(getNexChatSnapshot().isLoading, true);
  clearNexChat();
  await pending;
  assert.deepEqual(getNexChatSnapshot().messages, INITIAL_MESSAGES);
  assert.equal(getNexChatSnapshot().isLoading, false);
});

test("a handed-off exchange is appended without a request, and history persists", () => {
  const storage = memoryStorage();
  configureNexChat({ fetch: async () => assert.fail("must not fetch"), storage });
  hydrateNexChat();
  appendNexExchange("What is RAG?", "Retrieval-augmented generation.");
  const { messages, turnAnchorId } = getNexChatSnapshot();
  assert.equal(messages[messages.length - 1]!.content, "Retrieval-augmented generation.");
  assert.equal(turnAnchorId, messages[messages.length - 2]!.id);
  assert.ok(storage.data.get(CHAT_STORAGE_KEY)?.includes("What is RAG?"));

  configureNexChat({ fetch: async () => assert.fail("must not fetch"), storage });
  hydrateNexChat();
  assert.equal(getNexChatSnapshot().messages[getNexChatSnapshot().messages.length - 1]!.content, "Retrieval-augmented generation.");
});

/** A response whose body yields the given lines, then either closes or errors. */
function scriptedResponse(events: unknown[], ending: "close" | "error" = "close") {
  const encoder = new TextEncoder();
  const lines = events.map((event) => encoder.encode(`${JSON.stringify(event)}\n`));
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < lines.length) controller.enqueue(lines[index++]!);
      else if (ending === "close") controller.close();
      else controller.error(new TypeError("network connection was lost"));
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "application/x-ndjson" } });
}

const trace = { type: "trace", trace: { rounds: 1, toolCount: 0, elapsedMs: 10, sources: [], refusals: [], model: "m" } };

test("the chat stays busy until the stream closes, and a second send is rejected meanwhile", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const encoder = new TextEncoder();
  configureNexChat({
    fetch: async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          async start(controller) {
            for (const event of [{ type: "text_delta", text: "Hi." }, trace]) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            await gate; // suggestions are still being generated
            controller.enqueue(encoder.encode(`${JSON.stringify({ type: "suggestions", suggestions: ["More?"] })}\n${JSON.stringify({ type: "done" })}\n`));
            controller.close();
          },
        }),
        { status: 200 }
      ),
    storage: memoryStorage(),
  });
  hydrateNexChat();
  assert.equal(isNexChatBusy(), false);
  const first = sendNexMessage("one");
  // Wait until the answer is complete (trace seen), with the stream still open.
  while (getNexChatSnapshot().announcement !== "Answer ready") await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(getNexChatSnapshot().isLoading, true, "still loading after the trace");
  assert.equal(isNexChatBusy(), true);
  assert.equal(await sendNexMessage("two"), false, "rejected while the first is in flight");
  assert.equal(getNexChatSnapshot().messages.filter((message) => message.role === "user").length, 1);
  release();
  assert.equal(await first, true);
  assert.equal(getNexChatSnapshot().isLoading, false);
  assert.equal(isNexChatBusy(), false);
  assert.equal(await sendNexMessage("   "), false, "empty messages are rejected");
});

test("a stream that ends without done keeps the partial text and marks it cut off", async () => {
  configureNexChat({ fetch: async () => scriptedResponse([{ type: "text_delta", text: "Half an ans" }]), storage: memoryStorage() });
  hydrateNexChat();
  await sendNexMessage("hi");
  const answer = lastMessage()!;
  assert.equal(answer.content, "Half an ans");
  assert.equal(answer.streaming, false);
  assert.equal(answer.error?.code, "answer_cut_off");
  assert.equal(answer.error?.retryable, true);
  assert.equal(partialAnswerNote(answer), "The answer was cut off.");
});

test("a mid-stream network drop keeps the partial text next to a retryable error", async () => {
  configureNexChat({ fetch: async () => scriptedResponse([{ type: "text_delta", text: "Partway" }], "error"), storage: memoryStorage() });
  hydrateNexChat();
  await sendNexMessage("hi");
  const answer = lastMessage()!;
  assert.equal(answer.content, "Partway");
  assert.equal(answer.error?.code, "answer_connection_lost");
  assert.equal(answer.error?.retryable, true);
});

test("a failure before any text still replaces the content with the error message", async () => {
  configureNexChat({
    fetch: async () => {
      throw new TypeError("Failed to fetch");
    },
    storage: memoryStorage(),
  });
  hydrateNexChat();
  await sendNexMessage("hi");
  const answer = lastMessage()!;
  assert.equal(answer.error?.code, "network_error");
  assert.match(answer.content, /couldn't reach/i);
});

test("a TypeError from our own code is not reported as a network failure", async () => {
  configureNexChat({
    fetch: async () => ({ ok: true, body: { getReader: () => null } }) as unknown as Response,
    storage: memoryStorage(),
  });
  hydrateNexChat();
  await sendNexMessage("hi");
  assert.equal(lastMessage()!.error?.code, "empty_response");
});

test("a failure after the answer completed does not overwrite it", async () => {
  configureNexChat({
    fetch: async () => scriptedResponse([{ type: "text_delta", text: "All done." }, trace], "error"),
    storage: memoryStorage(),
  });
  hydrateNexChat();
  assert.equal(await sendNexMessage("hi"), true);
  const answer = lastMessage()!;
  assert.equal(answer.content, "All done.");
  assert.equal(answer.error, undefined);
  assert.equal(answer.streaming, false);
  assert.equal(getNexChatSnapshot().isLoading, false);
});

test("streaming messages are not persisted until the answer finishes", async () => {
  const storage = memoryStorage();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const encoder = new TextEncoder();
  configureNexChat({
    fetch: async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          async start(controller) {
            controller.enqueue(encoder.encode(`${JSON.stringify({ type: "text_delta", text: "Partial" })}\n`));
            await gate;
            for (const event of [trace, { type: "done" }]) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            controller.close();
          },
        }),
        { status: 200 }
      ),
    storage,
  });
  hydrateNexChat();
  const pending = sendNexMessage("persist me");
  while (!getNexChatSnapshot().messages.some((message) => message.streaming && message.content)) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok(!storage.data.get(CHAT_STORAGE_KEY)?.includes("Partial"), "a half-written answer is never stored");
  release();
  await pending;
  assert.ok(storage.data.get(CHAT_STORAGE_KEY)?.includes("Partial"));
});

test("history drops the question whose answer failed and truncates long messages", async () => {
  const bodies: { conversationHistory: { content: string; sender: string }[] }[] = [];
  let call = 0;
  configureNexChat({
    fetch: async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      call += 1;
      if (call === 1) return new Response(JSON.stringify({ error: "boom", code: "server_error", retryable: false }), { status: 500 });
      return ndjsonResponse(answerEvents);
    },
    storage: memoryStorage(),
  });
  hydrateNexChat();
  await sendNexMessage("this question failed");
  await sendNexMessage("x".repeat(9000));
  await sendNexMessage("third");
  const history = bodies[2]!.conversationHistory;
  assert.ok(!history.some((item) => item.content === "this question failed"), "the failed question is not sent back");
  assert.ok(history.every((item) => item.content.length <= 4000), "each history item is capped at 4000 characters");
  assert.ok(history.some((item) => item.content.startsWith("xxxx") && item.content.length === 4000));
});

test("hydration keeps messages appended before it ran", () => {
  const storage = memoryStorage();
  configureNexChat({ fetch: async () => assert.fail("must not fetch"), storage });
  hydrateNexChat();
  appendNexExchange("Old question", "Old answer");

  configureNexChat({ fetch: async () => assert.fail("must not fetch"), storage });
  appendNexExchange("New question", "New answer"); // before hydration
  hydrateNexChat();
  const contents = getNexChatSnapshot().messages.map((message) => message.content);
  assert.ok(contents.includes("Old answer"), "stored history is restored");
  assert.ok(contents.includes("New answer"), "the early exchange survives hydration");
  assert.ok(contents.indexOf("Old answer") < contents.indexOf("New question"), "stored history comes first");
});

test("an aborted request tells the guide to reset", async () => {
  const seen: string[] = [];
  const listener = (event: Event) => seen.push((event as CustomEvent<{ type: string }>).detail.type);
  (globalThis as { window?: unknown }).window = new EventTarget();
  (globalThis as unknown as { CustomEvent: unknown }).CustomEvent ??= class extends Event {
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) {
      super(type);
      this.detail = init?.detail;
    }
  };
  (globalThis as unknown as { window: EventTarget }).window.addEventListener("guide:event", listener);
  try {
    configureNexChat({
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
      storage: memoryStorage(),
    });
    hydrateNexChat();
    const pending = sendNexMessage("hi");
    clearNexChat();
    await pending;
    assert.ok(seen.includes("chat/reset"), `expected chat/reset, saw ${seen.join(", ")}`);
  } finally {
    delete (globalThis as { window?: unknown }).window;
  }
});

test("an upstream failure (error, then trace, then done) is shown as an error, and the next send still works", async () => {
  const bodies: { conversationHistory: { content: string }[] }[] = [];
  let call = 0;
  configureNexChat({
    storage: memoryStorage(),
    fetch: async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      call += 1;
      return call === 1
        ? ndjsonResponse([
            { type: "status", label: "Thinking" },
            { type: "error", error: "Nex can't answer right now. Please contact Nikunj directly.", code: "upstream_auth_error", retryable: false },
            { type: "trace", trace: { rounds: 0, toolCount: 0, elapsedMs: 5, sources: [], refusals: [], model: "m" } },
            { type: "done" },
          ])
        : ndjsonResponse(answerEvents);
    },
  });
  hydrateNexChat();
  await sendNexMessage("first");
  const failed = lastMessage()!;
  assert.ok(failed.error, "the failure is shown, not swallowed as a finished empty answer");
  assert.match(failed.content, /can't answer right now/);
  assert.equal(await sendNexMessage("second"), true);
  for (const item of bodies[1]!.conversationHistory) assert.ok(item.content.trim().length > 0, "no empty history item");
  assert.equal(lastMessage()!.content, "Hello there.");
});

test("stored empty messages from an old failure are dropped on load", () => {
  const storage = memoryStorage({
    [CHAT_STORAGE_KEY]: JSON.stringify({ version: 2, savedAt: Date.now(), messages: [{ id: "u1", role: "user", content: "first" }, { id: "a1", role: "assistant", content: "" }] }),
  });
  configureNexChat({ fetch: async () => assert.fail("must not fetch"), storage });
  hydrateNexChat();
  assert.ok(getNexChatSnapshot().messages.every((message) => message.content.trim().length > 0));
});

test("the chosen visitor path is sent with the request; the default tour sends none", async () => {
  let body: Record<string, unknown> = {};
  const capture = async (_url: unknown, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return ndjsonResponse(answerEvents);
  };
  configureNexChat({ fetch: capture as typeof fetch, storage: memoryStorage(), visitor: () => "engineer" });
  hydrateNexChat();
  await sendNexMessage("hi");
  assert.equal(body.visitor, "engineer");
  configureNexChat({ fetch: capture as typeof fetch, storage: memoryStorage(), visitor: () => "default" });
  hydrateNexChat();
  await sendNexMessage("hi");
  assert.equal(body.visitor, undefined);
});
