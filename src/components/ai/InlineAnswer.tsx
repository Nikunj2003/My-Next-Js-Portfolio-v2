"use client";

import { useEffect } from "react";
import { Loader2, Wrench, X } from "lucide-react";
import { useAssistantAnswer } from "@/components/ai/useAssistantAnswer";
import { AnswerBody } from "@/components/ai/AnswerBody";
import { openAiTwin } from "@/lib/ask-twin";
import { cn } from "@/lib/utils";

/**
 * An AI answer that expands under the content it is about, instead of
 * covering the page with the side panel.
 *
 * The rule this follows: inline when the answer is about what the visitor is
 * already reading (a case-study section, an experience bullet); the panel
 * stays for anything cross-site (navigation, open-ended chat). A "Continue in
 * AI Twin" handoff is what lets a visitor go from a scoped in-page answer to
 * an open conversation without re-typing the question.
 */
export function InlineAnswer({
  question,
  className = "",
  onDismiss,
}: {
  question: string;
  className?: string;
  /** Called when the visitor closes the answer. */
  onDismiss?: () => void;
}) {
  const { status, content, toolCalls, error, ask, reset } = useAssistantAnswer();

  /*
   * Fires once per question, keyed on the question alone.
   *
   * Keying on `status` as well made this re-run on every state transition, and
   * under React StrictMode's development double-invoke that meant a second
   * request immediately superseded the first — whose abort then surfaced as a
   * spurious "took too long" error before the real answer arrived.
   */
  useEffect(() => {
    void ask(question);
  }, [question, ask]);

  const handleClose = () => {
    reset();
    onDismiss?.();
  };

  const handleContinueInTwin = () => {
    // Hands the already-answered exchange to the panel rather than making the
    // visitor re-ask: the panel appends it to its own message list and
    // persists it, same as any other turn.
    openAiTwin(question, status === "done" ? content : undefined);
    handleClose();
  };

  return (
    /*
      A `span` with `block` display, not a `div`.

      The pill that opens this sits inside headings and inside paragraph/list
      text, and a `div` is invalid HTML there — browsers close the enclosing
      `<p>` early and the answer escapes its container. A span styled as a block
      is valid in every one of those positions and still lays out as a panel.
    */
    <span
      className={cn(
        "mt-3 block overflow-hidden rounded-2xl border border-primary/20 glass-subtle p-4 sm:p-5 text-left font-normal normal-case tracking-normal",
        className
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-foreground/90">{question}</span>
        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Close answer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>

      <span className="mt-3 block border-t border-white/10 pt-3">
        {toolCalls.length > 0 && (
          <span className="mb-3 flex flex-col gap-1.5 border-l-2 border-primary/25 pl-3">
            {toolCalls.map((call) => (
              <span key={call.id} className="flex items-baseline gap-2 font-mono text-[11px] leading-relaxed">
                <Wrench
                  className={cn(
                    "mt-0.5 h-3 w-3 shrink-0",
                    call.status === "running" ? "animate-spin motion-reduce:animate-none text-primary" : "text-primary/70"
                  )}
                />
                <span className="min-w-0 break-all text-foreground/75">{call.label}</span>
                {call.status === "done" && (
                  <span className={cn("shrink-0", call.refused ? "text-amber-500/90" : "text-muted-foreground/70")}>
                    {call.refused ? "· none" : `· ${call.summary}`}
                  </span>
                )}
              </span>
            ))}
          </span>
        )}

        {/*
          Shown until the first token of prose arrives, not just while
          `status === "loading"`.

          A tool call flips the status to "streaming" before any text exists, so
          gating on "loading" alone left the panel showing a bare
          `get_case_study(...)` trace line and nothing else — it read as broken
          rather than as working.
        */}
        {(status === "loading" || ((status === "streaming" || status === "done") && !content)) && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
            {toolCalls.length > 0 ? "Reading the source…" : "Thinking…"}
          </span>
        )}

        {(status === "streaming" || status === "done") && content && (
          <span className="block text-sm leading-relaxed text-foreground/90">
            <AnswerBody content={content} />
          </span>
        )}

        {status === "error" && (
          <span className="flex flex-col gap-2">
            <span className="text-sm text-amber-500/90">{error}</span>
            <button
              type="button"
              onClick={() => void ask(question)}
              className="self-start rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/15"
            >
              Retry
            </button>
          </span>
        )}

        {status === "done" && (
          <button
            type="button"
            onClick={handleContinueInTwin}
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-primary transition-colors hover:text-primary/80"
          >
            Continue in AI Twin →
          </button>
        )}
      </span>
    </span>
  );
}

