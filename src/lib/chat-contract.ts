export const CHAT_ENDPOINT = "/live-assistant";
export const CHAT_PRIMARY_RESPONSE_TIMEOUT_MS = 16_000;
export const CHAT_SUGGESTION_TIMEOUT_MS = 4_000;
/**
 * Ceiling for the BLOCKING part of a request: the tool-selection round.
 *
 * The answer itself no longer counts against this, because it streams and is
 * policed by an idle timer instead. Raised from 18.5s because that figure was
 * derived when the answer was blocking too, and it left the tool round only
 * ~12s — enough to abort a healthy round-0 call that simply had a large prompt
 * to read. It must also leave room for all CHAT_TOOL_ROUND_ATTEMPTS of the
 * blocking round (3 x 9s) plus the reserve, or the budget would cancel a retry
 * that was about to succeed.
 */
export const CHAT_TOTAL_RESPONSE_BUDGET_MS = 40_000;
/**
 * Absolute client-side ceiling, as a backstop only.
 *
 * Raised to clear the route's own worst case: up to ~27s for the blocking
 * tool round's 3 retry attempts, plus up to CHAT_STREAM_FIRST_CHUNK_TIMEOUT_MS
 * for the answer's first token, plus the generation and suggestion tail. This
 * is a backstop for a runtime that never sends another byte at all — the idle
 * timer is what catches an ordinary stall, and it fires far sooner.
 */
export const CHAT_CLIENT_TIMEOUT_MS = 75_000;

/**
 * Aborts only when the stream goes SILENT for this long.
 *
 * A fixed wall-clock cap measured from request start was the wrong instrument:
 * it treated a slow-but-progressing answer exactly like a dead connection. As
 * long as bytes keep arriving the request is healthy, so the timer resets on
 * every chunk and only silence is treated as a fault.
 *
 * Sized to exceed the longest legitimate gap the route can produce between two
 * heartbeats: a single "status" is sent right before the model starts
 * generating the answer, and the model can then take up to
 * CHAT_STREAM_FIRST_CHUNK_TIMEOUT_MS to produce its first token. Anything
 * shorter here would abort a request that was still healthy on the far side.
 */
export const CHAT_STREAM_IDLE_TIMEOUT_MS = 30_000;

/**
 * Allowance for the first streamed chunk.
 *
 * Wider than the idle threshold because nothing has been generated yet: this
 * window covers connection setup plus the provider's initial reasoning pass,
 * which on the free tier occasionally runs far past the between-chunk gap.
 * Reusing the stricter idle value here aborted requests that were fine.
 */
export const CHAT_STREAM_FIRST_CHUNK_TIMEOUT_MS = 25_000;
export const CHAT_AVAILABILITY_CACHE_MS = 60_000;

/** Tool rounds the agent may take before it must answer with what it has. */
export const CHAT_MAX_TOOL_ROUNDS = 3;
/** A tool round shares the primary budget; keep a floor for the final answer. */
/**
 * Attempts (not retries) for a stream that stalls before its first byte.
 *
 * Sized from 12 measured calls against the provider's free tier:
 * p50 3.5s time-to-first-byte, p90 34s, one outright stall past 60s — only
 * 58% connected within 12s. That distribution has no single timeout that is
 * both responsive and tail-safe, so the strategy is to cut early and retry:
 * three attempts at the idle threshold beat one long wait, because each retry
 * re-rolls the latency rather than continuing to wait on a request that has
 * already hit the tail.
 */
export const CHAT_TOOL_ROUND_ATTEMPTS = 3;
export const CHAT_FINAL_ANSWER_RESERVE_MS = 6_000;

export type ChatAvailabilityResponse = {
  available: boolean;
};

export type ChatErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "service_unavailable"
  | "upstream_timeout"
  | "upstream_rate_limited"
  | "upstream_auth_error"
  | "upstream_error"
  | "upstream_unreachable"
  | "internal_error";

/** A tool the agent invoked, as surfaced to the client. */
export type ChatToolCall = {
  id: string;
  name: string;
  /** Pre-formatted for display, e.g. `search_work("tenant isolation")`. */
  label: string;
  status: "running" | "done";
  summary?: string;
  durationMs?: number;
  refused?: boolean;
  /** Set by navigate_to so the client can actually move the page. */
  href?: string;
};

/** Closing summary of how the answer was produced. */
export type ChatTrace = {
  rounds: number;
  toolCount: number;
  elapsedMs: number;
  sources: string[];
  refusals: string[];
  model: string;
};

/**
 * Newline-delimited JSON events streamed from the chat endpoint.
 * NDJSON rather than SSE because the client already uses plain fetch.
 */
export type ChatStreamEvent =
  | { type: "status"; label: string }
  | { type: "tool_call"; call: ChatToolCall }
  | { type: "tool_result"; call: ChatToolCall }
  | { type: "text_delta"; text: string }
  /**
   * Replaces the accumulated answer wholesale.
   *
   * Needed because the answer streams live, but link normalisation runs on the
   * finished text and can rewrite the body rather than only append to it. In
   * that (rare) case appending a diff would corrupt the message, so the client
   * swaps in the corrected text instead.
   */
  | { type: "text_replace"; text: string }
  | { type: "trace"; trace: ChatTrace }
  | { type: "suggestions"; suggestions: string[] }
  | { type: "error"; error: string; code: ChatErrorCode; retryable: boolean }
  | { type: "done" };

/** Cap on the incremental NDJSON parse buffer. */
const MAX_STREAM_BUFFER_CHARS = 256_000;

export const CHAT_STREAM_CONTENT_TYPE = "application/x-ndjson";

/**
 * Incrementally parses an NDJSON byte stream into events.
 *
 * Chunk boundaries land mid-line often enough that a naive split drops
 * events, so the trailing partial line is buffered until its newline arrives.
 */
export function createChatEventParser() {
  let buffer = "";


  return {
    push(chunk: string): ChatStreamEvent[] {
      buffer += chunk;
      // A malformed upstream response with no newline would otherwise grow this
      // buffer without limit for the life of the stream.
      if (buffer.length > MAX_STREAM_BUFFER_CHARS) {
        buffer = buffer.slice(-MAX_STREAM_BUFFER_CHARS);
      }
      const lines = buffer.split("\n");
      // The last element is either "" (chunk ended on a newline) or a partial line.
      buffer = lines.pop() ?? "";

      const events: ChatStreamEvent[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          events.push(JSON.parse(trimmed) as ChatStreamEvent);
        } catch {
          // A malformed line should not kill the stream.
        }
      }
      return events;
    },
    /** Flush any complete event left in the buffer when the stream ends. */
    flush(): ChatStreamEvent[] {
      const trimmed = buffer.trim();
      buffer = "";
      if (!trimmed) return [];
      try {
        return [JSON.parse(trimmed) as ChatStreamEvent];
      } catch {
        return [];
      }
    },
  };
}
