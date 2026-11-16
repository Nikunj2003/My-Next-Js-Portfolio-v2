/**
 * The conversation with Nex, shared by every surface that shows it: the inline
 * ask bubble next to the guide avatar and the full chat panel.
 *
 * Module-level store read with `useSyncExternalStore` (see `useNexChat`), so
 * the two surfaces live in separate parts of the tree and still show one
 * conversation. Everything that used to live inside `NexChat` (sending,
 * streaming, retry, abort, persistence) is here; the components only render.
 */
import { readGuidePrefs } from "@/lib/guide/prefs";
import type { VisitorId } from "@/lib/guide/paths";
import { parseCard } from "@/lib/chat/cards";
import {
  CHAT_CLIENT_TIMEOUT_MS,
  CHAT_ENDPOINT,
  CHAT_STREAM_IDLE_TIMEOUT_MS,
  createChatEventParser,
  type ChatToolCall,
  type ChatTrace,
} from "@/lib/chat-contract";
import { createStoredChatEnvelope, parseStoredChatEnvelope } from "@/lib/chat-storage";
import { CHAT_MEMORY_WINDOW, CHAT_STORAGE_KEY, LEGACY_CHAT_STORAGE_KEY, WELCOME_MESSAGE, trimConversationHistory } from "@/lib/chat/shared";
import { emitGuide } from "@/lib/guide/bus";
import type { ChatApiError, ChatRequestError, Message, SendRequest, StreamOutcome } from "@/lib/chat/types";

export const INITIAL_MESSAGES: Message[] = [{ id: "welcome", role: "assistant", content: WELCOME_MESSAGE }];
export const OFFLINE_ASSISTANT_MESSAGE = "Nex is offline right now. The case studies, contact form and resume all still work.";

export function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createChatRequestError(message: string, options: Partial<ChatRequestError> = {}): ChatRequestError {
  const error = new Error(message) as ChatRequestError;
  error.code = options.code;
  error.retryable = options.retryable;
  error.status = options.status;
  return error;
}

function sanitizeMessageError(value: unknown): Message["error"] | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as NonNullable<Message["error"]>;

  if (typeof candidate.code !== "string" || typeof candidate.retryable !== "boolean") {
    return undefined;
  }

  if (candidate.retryText !== undefined && typeof candidate.retryText !== "string") {
    return undefined;
  }

  if (candidate.userMessageId !== undefined && typeof candidate.userMessageId !== "string") {
    return undefined;
  }

  return {
    code: candidate.code,
    retryable: candidate.retryable,
    retryText: candidate.retryText,
    userMessageId: candidate.userMessageId,
    isRetrying: false,
  };
}

async function buildResponseError(response: Response) {
  const raw = await response.text();
  let payload: ChatApiError | null = null;

  try {
    payload = raw ? (JSON.parse(raw) as ChatApiError) : null;
  } catch {
    payload = null;
  }

  const fallbackMessage =
    response.status === 429
      ? "You're sending messages too quickly right now. Please wait a moment and retry."
      : response.status >= 500
        ? "Nex hit a server error. Please retry."
        : "This message could not be sent.";

  return createChatRequestError(payload?.error || fallbackMessage, {
    code: payload?.code || `http_${response.status}`,
    retryable: payload?.retryable ?? (response.status >= 500 || response.status === 429),
    status: response.status,
  });
}

/**
 * Error codes for an answer that started and then failed. The partial text
 * stays on screen next to the error, so these never replace `content`.
 */
export const PARTIAL_ANSWER_NOTES: Record<string, string> = {
  answer_cut_off: "The answer was cut off.",
  answer_connection_lost: "The connection dropped before the answer finished.",
  answer_timed_out: "The request timed out before the answer finished.",
};

/** The note to show beneath a kept partial answer, or null when the message isn't one. */
export function partialAnswerNote(message: Pick<Message, "content" | "error">): string | null {
  const code = message.error?.code;
  if (!code || !message.content.trim()) return null;
  return PARTIAL_ANSWER_NOTES[code] ?? null;
}

const NETWORK_ERROR_MESSAGE = "Couldn't reach Nex just now. Check your connection and retry.";

/** Wraps a failure of `fetch` or of reading the body. Only these count as network errors. */
function networkError(partial: boolean) {
  return createChatRequestError(partial ? PARTIAL_ANSWER_NOTES.answer_connection_lost : NETWORK_ERROR_MESSAGE, {
    code: partial ? "answer_connection_lost" : "network_error",
    retryable: true,
  });
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorState(error: unknown, retryText: string, userMessageId: string | undefined, hasPartial: boolean) {
  if (isAbortError(error)) {
    const code = hasPartial ? "answer_timed_out" : "client_timeout";
    return {
      content: hasPartial
        ? PARTIAL_ANSWER_NOTES.answer_timed_out
        : "Nex timed out before finishing the answer. Retry to send the same message again.",
      error: { code, retryable: true, retryText, userMessageId },
    } satisfies Pick<Message, "content" | "error">;
  }

  // Anything else is a chat request error we raised on purpose. An unexpected
  // exception (a bug, a TypeError from our own code) gets a generic message
  // rather than being mislabelled as a network failure.
  const requestError = error as Partial<ChatRequestError> | null;
  const known = typeof requestError?.code === "string";

  return {
    content: known ? requestError!.message || "Something went wrong while sending that message." : "Something went wrong while sending that message.",
    error: {
      code: known ? requestError!.code! : "unknown_error",
      retryable: requestError?.retryable ?? true,
      retryText,
      userMessageId,
    },
  } satisfies Pick<Message, "content" | "error">;
}

/** Longest stored message kept; anything bigger is cut, not trusted. */
const STORED_MESSAGE_MAX_CHARS = 20_000;

const strings = (value: unknown, max = 20) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, max) : [];
const finite = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/** A stored trace with every field the UI reads, or nothing. */
function sanitizeStoredTrace(value: unknown): ChatTrace | undefined {
  if (!value || typeof value !== "object") return undefined;
  const trace = value as Record<string, unknown>;
  return {
    rounds: finite(trace.rounds),
    toolCount: finite(trace.toolCount),
    elapsedMs: finite(trace.elapsedMs),
    sources: strings(trace.sources),
    refusals: strings(trace.refusals),
    model: typeof trace.model === "string" ? trace.model : "",
  };
}

/** Only in-page hashes and same-site paths; `//host` would leave the site. */
const SAFE_HREF = /^(#[\w-]+|\/(?![/\\])[^\s]*)$/;

function sanitizeStoredToolCall(value: unknown): ChatToolCall | null {
  if (!value || typeof value !== "object") return null;
  const call = value as Record<string, unknown>;
  if (typeof call.id !== "string" || typeof call.label !== "string") return null;
  return {
    id: call.id,
    name: typeof call.name === "string" ? call.name : "",
    label: call.label.slice(0, 200),
    status: "done",
    summary: typeof call.summary === "string" ? call.summary.slice(0, 500) : undefined,
    durationMs: typeof call.durationMs === "number" ? call.durationMs : undefined,
    refused: call.refused === true ? true : undefined,
    href: typeof call.href === "string" && SAFE_HREF.test(call.href) ? call.href : undefined,
    highlight: typeof call.highlight === "string" && /^[\w:-]{1,80}$/.test(call.highlight) ? call.highlight : undefined,
    card: parseCard(call.card) ? (call.card as string) : undefined,
  };
}

export function sanitizeStoredMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return INITIAL_MESSAGES;

  const parsed = value
    .filter((item): item is Message => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Message;
      return (
        typeof candidate.id === "string" &&
        (candidate.role === "user" || candidate.role === "assistant") &&
        typeof candidate.content === "string" &&
        // An empty message (an answer that failed before any text) can't be sent back as history.
        candidate.content.trim().length > 0 &&
        (candidate.suggestions === undefined || Array.isArray(candidate.suggestions))
      );
    })
    .map((message) => ({
      ...message,
      content: message.content.slice(0, STORED_MESSAGE_MAX_CHARS),
      suggestions: Array.isArray(message.suggestions) ? strings(message.suggestions, 8) : undefined,
      // Stored data is untrusted: every field the UI reads is checked. Any
      // stored tool call is finished by definition; a persisted "running"
      // state would spin forever, and a persisted `streaming` flag would leave
      // the caret blinking on a message that is already complete.
      toolCalls: Array.isArray(message.toolCalls)
        ? message.toolCalls.map(sanitizeStoredToolCall).filter((call): call is ChatToolCall => call !== null)
        : undefined,
      trace: sanitizeStoredTrace(message.trace),
      streaming: false,
      error: sanitizeMessageError(message.error),
    }));

  const trimmed = trimConversationHistory(parsed, CHAT_MEMORY_WINDOW);
  return trimmed.length > 0 ? [...INITIAL_MESSAGES, ...trimmed] : INITIAL_MESSAGES;
}

/**
 * Reads the NDJSON agent stream and writes it into message state as it
 * arrives, so tool calls appear while they run and text paints progressively.
 *
 * Throws a chat request error on an `error` event so the existing retry
 * classification in getErrorState handles it unchanged.
 */
export async function consumeChatStream(
  response: Response,
  assistantId: string,
  setMessages: (updater: (prev: Message[]) => Message[]) => void,
  replaceExisting: boolean,
  /** Called on every received chunk so the caller can reset its idle timer. */
  onActivity?: () => void,
  /** Called when the agent asks to move the page. */
  onNavigate?: (call: ChatToolCall) => void,
  /**
   * Called when the answer text is final, which the server marks with `trace`.
   * The answer is complete from here: later failures must not overwrite it.
   * The send still counts as in flight until the stream closes.
   */
  onAnswerComplete?: () => void
): Promise<StreamOutcome> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw createChatRequestError("Nex returned no response. Please retry.", {
      code: "empty_response",
      retryable: true,
      status: 502,
    });
  }

  const decoder = new TextDecoder();
  const parser = createChatEventParser();

  let content = "";
  let suggestions: string[] | undefined;
  let trace: ChatTrace | undefined;
  let toolCalls: ChatToolCall[] = [];
  let placed = false;
  let sawDone = false;
  let streamError: unknown;

  const patch = (updater: (message: Message) => Message) => {
    setMessages((prev) => {
      if (!placed) {
        placed = true;
        const seed: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

        if (replaceExisting && prev.some((message) => message.id === assistantId)) {
          return prev.map((message) =>
            message.id === assistantId
              ? updater({ ...message, content: "", suggestions: undefined, error: undefined, streaming: true })
              : message
          );
        }

        return [...prev, updater(seed)];
      }

      return prev.map((message) => (message.id === assistantId ? updater(message) : message));
    });
  };

  const handleEvent = (event: ReturnType<typeof parser.push>[number]) => {
    switch (event.type) {
      case "tool_call": {
        emitGuide({ type: "chat/tool_call", name: event.call.name });
        toolCalls = [...toolCalls, event.call];
        patch((message) => ({ ...message, toolCalls }));
        break;
      }
      case "tool_result": {
        emitGuide({ type: "chat/tool_result", name: event.call.name, refused: Boolean(event.call.refused) });
        toolCalls = toolCalls.map((call) => (call.id === event.call.id ? event.call : call));
        patch((message) => ({ ...message, toolCalls }));

        // The agent asked to move the page. The panel decides how (scroll,
        // route, or a "take me there" button on mobile).
        if (event.call.name === "navigate_to" && event.call.href && !event.call.refused) {
          onNavigate?.(event.call);
        }
        break;
      }
      case "text_delta": {
        // Text supersedes any progress label. Only the first delta is a phase change.
        if (!content) emitGuide({ type: "chat/stream_start" });
        content += event.text;
        patch((message) => ({ ...message, content, status: undefined }));
        break;
      }
      case "text_replace": {
        // The server rewrote the answer after streaming it (link
        // normalisation), so swap the body rather than appending to it.
        content = event.text;
        patch((message) => ({ ...message, content, status: undefined }));
        break;
      }
      case "trace": {
        trace = event.trace;
        // The server also sends a trace after a failure (it reports timing and
        // refusals). Only a trace after real text, with no error, marks a
        // finished answer; otherwise the error would be swallowed and an empty
        // answer saved, which the server then rejects as history on every send.
        if (streamError || content.trim().length === 0) break;
        patch((message) => ({ ...message, trace, streaming: false, status: undefined }));
        emitGuide({ type: "chat/answer_end", grounded: (event.trace?.sources?.length ?? 0) > 0 });
        onAnswerComplete?.();
        break;
      }
      case "suggestions": {
        suggestions = event.suggestions.filter((suggestion): suggestion is string => typeof suggestion === "string");
        // Patched now, not only at the end, so they survive a stream that fails after the answer completed.
        if (trace) patch((message) => ({ ...message, suggestions }));
        break;
      }
      case "status": {
        patch((message) => ({ ...message, status: event.label }));
        break;
      }
      case "error": {
        streamError = createChatRequestError(event.error, {
          code: event.code,
          retryable: event.retryable,
          status: 502,
        });
        break;
      }
      case "done": {
        sawDone = true;
        break;
      }
      default:
        break;
    }
  };

  let finished = false;
  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (error) {
        // Our own timeout abort keeps its identity; any other read failure is a dropped connection.
        if (isAbortError(error)) throw error;
        throw networkError(content.length > 0 && !trace);
      }
      const { done, value } = chunk;
      if (done) break;
      // Progress is proof of life: the caller's idle timer restarts here.
      onActivity?.();
      parser.push(decoder.decode(value, { stream: true })).forEach(handleEvent);
    }
    parser.flush().forEach(handleEvent);
    finished = true;
  } finally {
    // Any failure mid-stream (a bad event, a handler error) closes the
    // connection, so the server stops generating an answer nobody reads.
    if (!finished) await reader.cancel().catch(() => undefined);
  }

  if (streamError) throw streamError;

  // The server ends every answer with `done`. Text without it (and without the
  // `trace` that marks a complete answer) means the stream was cut short.
  if (!sawDone && !trace && content.trim().length > 0) {
    throw createChatRequestError(PARTIAL_ANSWER_NOTES.answer_cut_off, { code: "answer_cut_off", retryable: true, status: 502 });
  }

  return { content, suggestions, toolCalls, trace };
}


export type NexChatSnapshot = {
  messages: Message[];
  isLoading: boolean;
  hydrated: boolean;
  /** Screen-reader announcement; the logs themselves are not live, so tokens aren't read one by one. */
  announcement: string;
  /** Id of the user message the latest turn belongs to. Surfaces anchor their scroll on it. */
  turnAnchorId: string | null;
};

type Deps = {
  fetch: typeof fetch;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  /** The visitor path the reader chose, sent with each request (an id, or null). */
  visitor?: () => VisitorId | null;
};

const defaultDeps = (): Deps => ({
  fetch: (...args) => fetch(...args),
  storage: typeof window === "undefined" ? null : safeStorage(),
  visitor: () => (typeof window === "undefined" ? null : readGuidePrefs().visitor),
});

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

let deps: Deps | null = null;
let snapshot: NexChatSnapshot = {
  messages: INITIAL_MESSAGES,
  isLoading: false,
  hydrated: false,
  announcement: "",
  turnAnchorId: null,
};
const listeners = new Set<() => void>();
let abortController: AbortController | null = null;
let sending = false;

/** For tests: swap fetch and storage, and reset state. */
export function configureNexChat(overrides: Partial<Deps>) {
  deps = { ...defaultDeps(), ...overrides };
  abortController?.abort();
  abortController = null;
  sending = false;
  snapshot = { messages: INITIAL_MESSAGES, isLoading: false, hydrated: false, announcement: "", turnAnchorId: null };
  listeners.forEach((listener) => listener());
}

/** The visitor id to send: none for the default tour or no choice yet. */
function requestVisitor() {
  const visitor = getDeps().visitor?.() ?? null;
  return visitor && visitor !== "default" ? visitor : undefined;
}

function getDeps() {
  deps ??= defaultDeps();
  return deps;
}

function update(changes: Partial<NexChatSnapshot>) {
  snapshot = { ...snapshot, ...changes };
  if (changes.messages) persist(snapshot.messages);
  listeners.forEach((listener) => listener());
}

function setMessages(updater: (prev: Message[]) => Message[]) {
  update({ messages: updater(snapshot.messages) });
}

function persist(messages: Message[]) {
  if (!snapshot.hydrated) return;
  // A half-written answer would restore as a finished one. Wait for the end.
  if (messages.some((message) => message.streaming)) return;
  try {
    const memory = [...INITIAL_MESSAGES, ...trimConversationHistory(messages, CHAT_MEMORY_WINDOW)];
    getDeps().storage?.setItem(CHAT_STORAGE_KEY, JSON.stringify(createStoredChatEnvelope(memory)));
  } catch (error) {
    console.warn("Failed to persist chat history:", error);
  }
}

/** True while a request is in flight, including the stream tail. A send is rejected while this is true. */
export function isNexChatBusy() {
  return sending;
}

export function subscribeNexChat(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNexChatSnapshot() {
  return snapshot;
}

const serverSnapshot = snapshot;
export function getServerNexChatSnapshot() {
  return serverSnapshot;
}

/**
 * Restores the conversation from this device. Safe to call more than once.
 * Messages appended before hydration (an exchange handed off from the bubble,
 * a question already sent) are kept after the stored history, not overwritten.
 */
export function hydrateNexChat() {
  if (snapshot.hydrated) return;
  let stored = INITIAL_MESSAGES;
  const storage = getDeps().storage;
  let migrated = false;
  try {
    let raw = storage?.getItem(CHAT_STORAGE_KEY);
    // History saved before the rename to Nex: move it across once.
    const legacy = storage?.getItem(LEGACY_CHAT_STORAGE_KEY);
    if (legacy != null) {
      storage?.removeItem(LEGACY_CHAT_STORAGE_KEY);
      if (!raw) {
        raw = legacy;
        migrated = true;
      }
    }
    if (raw) {
      const envelope = parseStoredChatEnvelope<Message>(JSON.parse(raw));
      // The stored welcome is whatever it said when saved; always show today's.
      if (envelope) stored = sanitizeStoredMessages(envelope.messages).map((message) => (message.id === WELCOME_ID ? INITIAL_MESSAGES[0]! : message));
      else storage?.removeItem(CHAT_STORAGE_KEY);
    }
  } catch (error) {
    // Unreadable: drop it, or it fails again on every load.
    console.warn("Failed to restore chat history:", error);
    try {
      storage?.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // Storage itself is unavailable; nothing to clean up.
    }
  }
  const known = new Set(stored.map((message) => message.id));
  const added = snapshot.messages.filter((message) => message.id !== WELCOME_ID && !known.has(message.id));
  const messages = added.length > 0 ? [...stored, ...added] : stored;
  snapshot = { ...snapshot, messages, hydrated: true };
  if (added.length > 0 || migrated) persist(messages);
  listeners.forEach((listener) => listener());
}

const WELCOME_ID = INITIAL_MESSAGES[0]!.id;
/** Longest message sent back as history; a pasted wall of text shouldn't ride along every turn. */
const HISTORY_ITEM_MAX_CHARS = 4000;

function conversationHistory(source: Message[], beforeMessageId?: string) {
  const endIndex = beforeMessageId ? source.findIndex((message) => message.id === beforeMessageId) : -1;
  const scoped = endIndex >= 0 ? source.slice(0, endIndex) : source;
  // A failed answer is dropped along with the question it failed to answer, so
  // the model never sees a question that has no reply.
  const dropped = new Set<string>();
  scoped.forEach((message, index) => {
    if (!message.error) return;
    dropped.add(message.id);
    const askedBy = message.error.userMessageId ?? (scoped[index - 1]?.role === "user" ? scoped[index - 1]!.id : undefined);
    if (askedBy) dropped.add(askedBy);
  });
  return trimConversationHistory(
    scoped.filter((message) => !dropped.has(message.id) && message.content.trim().length > 0),
    CHAT_MEMORY_WINDOW
  ).map((message) => ({ content: message.content.slice(0, HISTORY_ITEM_MAX_CHARS), sender: message.role === "user" ? "user" : "ai" }));
}

export type SendOptions = {
  /** The service reported itself unavailable; answer locally instead of calling it. */
  unavailable?: boolean;
  /** The agent asked to move the page. The surface that sent decides how. */
  onNavigate?: (call: ChatToolCall) => void;
};

/**
 * Sends one message. Resolves `true` when the message was accepted (even if
 * the request then failed; the failure is shown on the answer) and `false`
 * when it was rejected: empty, or another request is still in flight.
 */
export async function sendNexMessage(request: SendRequest, options: SendOptions = {}): Promise<boolean> {
  const normalized = typeof request === "string" ? { text: request } : request;
  const msg = normalized.text?.trim();
  if (!msg || sending) return false;

  if (options.unavailable) {
    // Keep the question (it was cleared from the input) and anchor the turn on
    // it, so the offline note is paired with it rather than an older question.
    const userId = createMessageId();
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: msg },
      { id: createMessageId(), role: "assistant", content: OFFLINE_ASSISTANT_MESSAGE },
    ]);
    update({ turnAnchorId: userId });
    return true;
  }

  sending = true;
  const retryMessageId = normalized.retryMessageId;
  const retryUserMessageId = normalized.retryUserMessageId;
  const isRetry = Boolean(retryMessageId && retryUserMessageId);
  const userMsgId = retryUserMessageId || createMessageId();
  const controller = new AbortController();
  abortController = controller;
  /*
   * Two timers, not one. `timeoutId` is an absolute backstop; `idleTimeoutId`
   * restarts on every received chunk, so a long answer that keeps streaming is
   * never mistaken for a stalled request.
   */
  const timeoutId = setTimeout(() => controller.abort(), CHAT_CLIENT_TIMEOUT_MS);
  let idleTimeoutId = setTimeout(() => controller.abort(), CHAT_STREAM_IDLE_TIMEOUT_MS);
  const resetIdleTimer = () => {
    clearTimeout(idleTimeoutId);
    idleTimeoutId = setTimeout(() => controller.abort(), CHAT_STREAM_IDLE_TIMEOUT_MS);
  };

  const before = snapshot.messages;
  const nextMessages =
    isRetry && retryMessageId
      ? before.map((message) =>
          message.id === retryMessageId
            ? { ...message, suggestions: undefined, error: message.error ? { ...message.error, isRetrying: true } : undefined }
            : message
        )
      : [...before, { id: userMsgId, role: "user" as const, content: msg }];

  emitGuide({ type: "chat/send" });
  update({ messages: nextMessages, isLoading: true, announcement: "", turnAnchorId: userMsgId });

  // Declared out here so the catch block clears `streaming` on the exact
  // message that was mid-stream instead of appending a second bubble.
  const assistantId = isRetry && retryMessageId ? retryMessageId : createMessageId();
  /** Set once `trace` arrives: the answer is final and nothing may overwrite it. */
  let answerComplete = false;

  try {
    let response: Response;
    try {
      response = await getDeps().fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          conversationHistory: conversationHistory(before, isRetry ? retryUserMessageId : undefined),
          // The visitor path chosen for the tour, if any (an id; the server maps it).
          visitor: requestVisitor(),
        }),
        redirect: "error",
        signal: controller.signal,
      });
    } catch (error) {
      // fetch rejects with a TypeError when the network fails; that is the only place one means "offline".
      if (isAbortError(error)) throw error;
      throw networkError(false);
    }

    if (!response.ok) throw await buildResponseError(response);

    const outcome = await consumeChatStream(
      response,
      assistantId,
      setMessages,
      isRetry && Boolean(retryMessageId),
      resetIdleTimer,
      options.onNavigate,
      () => {
        answerComplete = true;
        update({ announcement: "Answer ready" });
      }
    );

    if (outcome.content.trim().length === 0) {
      throw createChatRequestError("Nex returned an empty response. Please retry.", {
        code: "empty_response",
        retryable: true,
        status: 502,
      });
    }

    const finished: Message = {
      id: assistantId,
      role: "assistant",
      content: outcome.content,
      suggestions: outcome.suggestions,
      toolCalls: outcome.toolCalls.length > 0 ? outcome.toolCalls : undefined,
      trace: outcome.trace,
      streaming: false,
      error: undefined,
    };
    setMessages((prev) =>
      prev.some((message) => message.id === assistantId)
        ? prev.map((message) => (message.id === assistantId ? { ...message, ...finished } : message))
        : [...prev, finished]
    );
  } catch (error) {
    // A cleared chat aborts on purpose; there is nothing left to patch. The
    // avatar still has to hear that the request it was watching is over.
    if (abortController !== controller && controller.signal.aborted) {
      emitGuide({ type: "chat/reset" });
      return true;
    }
    // The answer was already complete (`trace` arrived); a late failure while
    // the stream wound down must not turn it into an error.
    if (answerComplete) {
      console.warn("AI Chat: stream failed after the answer completed:", error);
      return true;
    }
    console.error("AI Chat Error:", error);
    // Only a message that is streaming right now holds text from THIS request;
    // on a retry the placeholder still carries the previous error's wording.
    const existing = snapshot.messages.find((message) => message.id === assistantId);
    const keepPartial = Boolean(existing?.streaming && existing.content.trim());
    const raw = getErrorState(error, msg, userMsgId, keepPartial);
    const errorState = keepPartial && !(raw.error.code in PARTIAL_ANSWER_NOTES)
      ? { ...raw, error: { ...raw.error, code: "answer_cut_off" } }
      : raw;
    emitGuide({ type: "chat/error", retryable: Boolean(errorState.error?.retryable) });
    update({ announcement: errorState.content });

    // Patch the message that was already streaming rather than appending
    // beside it, and always clear `streaming`, so a failure mid-answer never
    // leaves a caret blinking on a half-written reply. A partial answer keeps
    // its text; the error sits beside it.
    setMessages((prev) =>
      prev.some((message) => message.id === assistantId)
        ? prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: keepPartial ? message.content : errorState.content,
                  suggestions: undefined,
                  status: undefined,
                  streaming: false,
                  error: { ...errorState.error, isRetrying: false },
                }
              : message
          )
        : [
            ...prev,
            { id: createMessageId(), role: "assistant", content: errorState.content, streaming: false, error: errorState.error },
          ]
    );
  } finally {
    clearTimeout(timeoutId);
    // Must be cleared too, or it aborts the NEXT request.
    clearTimeout(idleTimeoutId);
    if (abortController === controller) {
      abortController = null;
      sending = false;
      update({ isLoading: false });
    }
  }
  return true;
}

export function retryNexMessage(message: Message, options: SendOptions = {}): Promise<boolean> {
  if (!message.error?.retryable || !message.error.retryText || !message.error.userMessageId) return Promise.resolve(false);
  return sendNexMessage(
    { text: message.error.retryText, retryMessageId: message.id, retryUserMessageId: message.error.userMessageId },
    options
  );
}

/**
 * Appends an exchange that was already answered elsewhere (an inline answer
 * handed off with "Continue with Nex"), so the question isn't re-sent.
 */
export function appendNexExchange(question: string, answer: string) {
  const userId = createMessageId();
  setMessages((prev) => [
    ...prev,
    { id: userId, role: "user", content: question },
    { id: createMessageId(), role: "assistant", content: answer },
  ]);
  update({ turnAnchorId: userId });
}

export function clearNexChat() {
  // Abort first: otherwise the request keeps running against a message id that
  // no longer exists and appends an answer with no question above it.
  const controller = abortController;
  abortController = null;
  sending = false;
  controller?.abort();
  update({ messages: INITIAL_MESSAGES, isLoading: false, announcement: "", turnAnchorId: null });
  try {
    getDeps().storage?.removeItem(CHAT_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear chat history:", error);
  }
}
