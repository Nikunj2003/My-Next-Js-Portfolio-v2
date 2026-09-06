export const CHAT_ENDPOINT = "/live-assistant";
export const CHAT_PRIMARY_RESPONSE_TIMEOUT_MS = 16_000;
export const CHAT_SUGGESTION_TIMEOUT_MS = 4_000;
export const CHAT_TOTAL_RESPONSE_BUDGET_MS = 18_500;
export const CHAT_CLIENT_TIMEOUT_MS = 24_000;
export const CHAT_AVAILABILITY_CACHE_MS = 60_000;

/** Tool rounds the agent may take before it must answer with what it has. */
export const CHAT_MAX_TOOL_ROUNDS = 3;
/** A tool round shares the primary budget; keep a floor for the final answer. */
export const CHAT_TOOL_ROUND_TIMEOUT_MS = 12_000;
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
