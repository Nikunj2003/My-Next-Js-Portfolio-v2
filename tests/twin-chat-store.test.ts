import test from "node:test";
import assert from "node:assert/strict";

import {
  INITIAL_MESSAGES,
  appendTwinExchange,
  clearTwinChat,
  configureTwinChat,
  getTwinChatSnapshot,
  hydrateTwinChat,
  sendTwinMessage,
  subscribeTwinChat,
} from "../src/lib/chat/twin-chat-store.ts";
import { CHAT_STORAGE_KEY } from "../src/lib/ai-twin.ts";

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

test("a sent message streams into one shared conversation and anchors the turn", async () => {
  configureTwinChat({ fetch: async () => ndjsonResponse(answerEvents), storage: memoryStorage() });
  hydrateTwinChat();
  let notified = 0;
  const unsubscribe = subscribeTwinChat(() => (notified += 1));
  await sendTwinMessage("hi");
  unsubscribe();
  const { messages, isLoading, turnAnchorId, announcement } = getTwinChatSnapshot();
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
  configureTwinChat({
    fetch: async () => {
      call += 1;
      return call === 1 ? new Response(JSON.stringify({ error: "busy", code: "rate_limited", retryable: true }), { status: 429 }) : ndjsonResponse(answerEvents);
    },
    storage: memoryStorage(),
  });
  hydrateTwinChat();
  await sendTwinMessage("hi");
  const failed = getTwinChatSnapshot().messages[getTwinChatSnapshot().messages.length - 1]!;
  assert.equal(failed.error?.code, "rate_limited");
  await sendTwinMessage({ text: failed.error!.retryText, retryMessageId: failed.id, retryUserMessageId: failed.error!.userMessageId });
  const { messages } = getTwinChatSnapshot();
  assert.equal(messages.filter((message) => message.role === "user").length, 1);
  assert.equal(messages[messages.length - 1]!.content, "Hello there.");
  assert.equal(messages[messages.length - 1]!.error, undefined);
});

test("clearing aborts an in-flight request and resets history", async () => {
  configureTwinChat({
    fetch: (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    storage: memoryStorage(),
  });
  hydrateTwinChat();
  const pending = sendTwinMessage("hi");
  assert.equal(getTwinChatSnapshot().isLoading, true);
  clearTwinChat();
  await pending;
  assert.deepEqual(getTwinChatSnapshot().messages, INITIAL_MESSAGES);
  assert.equal(getTwinChatSnapshot().isLoading, false);
});

test("a handed-off exchange is appended without a request, and history persists", () => {
  const storage = memoryStorage();
  configureTwinChat({ fetch: async () => assert.fail("must not fetch"), storage });
  hydrateTwinChat();
  appendTwinExchange("What is RAG?", "Retrieval-augmented generation.");
  const { messages, turnAnchorId } = getTwinChatSnapshot();
  assert.equal(messages[messages.length - 1]!.content, "Retrieval-augmented generation.");
  assert.equal(turnAnchorId, messages[messages.length - 2]!.id);
  assert.ok(storage.data.get(CHAT_STORAGE_KEY)?.includes("What is RAG?"));

  configureTwinChat({ fetch: async () => assert.fail("must not fetch"), storage });
  hydrateTwinChat();
  assert.equal(getTwinChatSnapshot().messages[getTwinChatSnapshot().messages.length - 1]!.content, "Retrieval-augmented generation.");
});
