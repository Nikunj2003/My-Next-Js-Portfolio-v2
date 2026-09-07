"use client";

import { useCallback, useRef, useState } from "react";
import {
  CHAT_CLIENT_TIMEOUT_MS,
  CHAT_ENDPOINT,
  CHAT_STREAM_IDLE_TIMEOUT_MS,
  createChatEventParser,
  type ChatToolCall,
  type ChatTrace,
} from "@/lib/chat-contract";

type AnswerState = {
  status: "idle" | "loading" | "streaming" | "done" | "error";
  content: string;
  toolCalls: ChatToolCall[];
  trace?: ChatTrace;
  error?: string;
};

const IDLE_STATE: AnswerState = { status: "idle", content: "", toolCalls: [] };

/**
 * Drives one inline question against the same `/live-assistant` endpoint the
 * panel uses, with its own local state rather than the panel's `Message[]`.
 *
 * Deliberately NOT a thin wrapper around `consumeChatStream` — that function
 * is written against the panel's `setMessages` and a stable `assistantId`,
 * which an inline surface (a single question under a heading, no history) has
 * no use for. Reusing the markdown renderer (`AnswerBody`) is what keeps the
 * two surfaces visually identical; the streaming plumbing itself is small
 * enough that duplicating the NDJSON parsing here is clearer than threading an
 * inline answer through machinery built for a multi-turn conversation.
 */
export function useAssistantAnswer() {
  const [state, setState] = useState<AnswerState>(IDLE_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(async (question: string) => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = window.setTimeout(() => controller.abort(), CHAT_CLIENT_TIMEOUT_MS);
    let idleTimeoutId = window.setTimeout(() => controller.abort(), CHAT_STREAM_IDLE_TIMEOUT_MS);
    const resetIdleTimer = () => {
      window.clearTimeout(idleTimeoutId);
      idleTimeoutId = window.setTimeout(() => controller.abort(), CHAT_STREAM_IDLE_TIMEOUT_MS);
    };

    setState({ status: "loading", content: "", toolCalls: [] });

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, conversationHistory: [] }),
        redirect: "error",
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat service responded ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createChatEventParser();

      let content = "";
      const toolCalls: ChatToolCall[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Superseded mid-stream: stop reading rather than interleaving this
        // run's deltas into the request that replaced it.
        if (abortRef.current !== controller) return;

        resetIdleTimer();

        for (const event of parser.push(decoder.decode(value, { stream: true }))) {
          switch (event.type) {
            case "text_delta":
              content += event.text;
              setState({ status: "streaming", content, toolCalls: [...toolCalls] });
              break;
            case "text_replace":
              content = event.text;
              setState({ status: "streaming", content, toolCalls: [...toolCalls] });
              break;
            case "tool_call":
              toolCalls.push(event.call);
              setState({ status: "streaming", content, toolCalls: [...toolCalls] });
              break;
            case "tool_result": {
              const index = toolCalls.findIndex((call) => call.id === event.call.id);
              if (index >= 0) toolCalls[index] = event.call;
              setState({ status: "streaming", content, toolCalls: [...toolCalls] });
              break;
            }
            case "trace":
              setState((prev) => ({ ...prev, trace: event.trace }));
              break;
            case "error":
              throw new Error(event.error);
            default:
              break;
          }
        }
      }

      for (const event of parser.flush()) {
        if (event.type === "text_delta") content += event.text;
        if (event.type === "text_replace") content = event.text;
      }

      if (abortRef.current !== controller) return;
      setState((prev) => ({ ...prev, status: "done", content }));
    } catch (error) {
      /*
       * A superseded request must not report anything.
       *
       * `ask()` aborts whatever was in flight, and React StrictMode
       * double-invokes effects in development, so the first call is routinely
       * cancelled by the second. Both landed here and wrote "That took too long
       * to answer" over the run that was actually still working — the error
       * flashed on screen and then the real answer replaced it.
       *
       * Only the request that still owns `abortRef` may touch state, and a
       * deliberate supersede is distinguished from a genuine stall by whether
       * this controller is still the current one.
       */
      if (abortRef.current !== controller) return;

      if (error instanceof DOMException && error.name === "AbortError") {
        setState((prev) => ({ ...prev, status: "error", error: "That took too long to answer. Try asking again." }));
      } else {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: error instanceof Error ? error.message : "Something went wrong. Try asking again.",
        }));
      }
    } finally {
      window.clearTimeout(timeoutId);
      window.clearTimeout(idleTimeoutId);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(IDLE_STATE);
  }, []);

  return { ...state, ask, reset };
}
