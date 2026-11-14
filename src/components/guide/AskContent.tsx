"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type Components } from "react-markdown";
import { Compass, Maximize2, Send, X } from "lucide-react";
import { buildAnswerComponents } from "@/components/ai/AnswerBody";
import { TwinAssistantBody } from "@/components/ai/TwinAssistantBody";
import type { ChatToolCall } from "@/lib/chat-contract";
import { selectLatestExchange } from "@/lib/chat/latest-exchange";
import { isTwinChatBusy, partialAnswerNote, retryTwinMessage, sendTwinMessage } from "@/lib/chat/twin-chat-store";
import { useTwinChat } from "@/lib/chat/useTwinChat";
import { runGuideAction } from "@/lib/guide/actions";
import { SECTION_CHIPS } from "@/lib/guide/anchors";
import { emitGuide } from "@/lib/guide/bus";
import { dispatchCompanion, getAskDraft, setAskDraft, takePendingQuestion, useCompanionState } from "@/lib/guide/companion-store";
import { startGuideTour } from "@/lib/guide/tour-control";
import { useChatAvailability } from "@/hooks/useChatAvailability";
import { scrollToHash } from "@/lib/scroll";

/** Matches the server's per-message limit (api/chat/route.ts). */
const MAX_QUESTION_LENGTH = 1200;

type AskContentProps = {
  activeSection: string | null;
  onExpand: () => void;
  onClose: () => void;
  isMobile: boolean;
  reduceMotion: boolean;
  /** Rendered in the page (the hero) rather than in a floating bubble. */
  inline?: boolean;
};

/** The ask box: latest question and answer, chips, composer. Hosted by the companion's bubble or inline by the hero avatar. */
export function AskContent({ activeSection, onExpand, onClose, isMobile, reduceMotion, inline = false }: AskContentProps) {
  const { messages, isLoading, announcement, turnAnchorId } = useTwinChat();
  const { status } = useChatAvailability();
  const router = useRouter();
  const [input, setInputState] = useState(getAskDraft);
  const setInput = useCallback((next: string | ((current: string) => string)) => {
    setInputState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      setAskDraft(value);
      return value;
    });
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const exchange = selectLatestExchange(messages);
  const unavailable = status === "unavailable";

  const onNavigate = useCallback(
    (call: ChatToolCall) => {
      if (!call.href) return;
      // On phones the sheet covers the page; leave it to "Take me there".
      if (isMobile) return;
      window.setTimeout(() => runGuideAction({ href: call.href!, highlight: call.highlight }, router), 300);
    },
    [isMobile, router]
  );

  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      if (!message || isTwinChatBusy()) return false;
      setInput("");
      void sendTwinMessage(message, { unavailable, onNavigate }).then((accepted) => {
        // Put the text back if the store turned it down, so nothing is lost.
        if (!accepted) setInput((current) => current || message);
      });
      return true;
    },
    [onNavigate, setInput, unavailable]
  );

  const takeMeThere = useCallback(
    (call: ChatToolCall) => {
      if (!call.href) return;
      dispatchCompanion({ type: "ask/close" });
      window.setTimeout(() => runGuideAction({ href: call.href!, highlight: call.highlight }, router), reduceMotion ? 0 : 260);
    },
    [reduceMotion, router]
  );

  const components = useMemo<Components>(
    () =>
      buildAnswerComponents((href) => {
        if (isMobile) dispatchCompanion({ type: "ask/close" });
        window.setTimeout(() => scrollToHash(href), isMobile ? 200 : 0);
      }, (href) => {
        dispatchCompanion({ type: "ask/close" });
        router.push(href);
      }),
    [isMobile, router]
  );

  // Focus the composer when the bubble opens.
  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), isMobile ? 260 : 40);
    return () => window.clearTimeout(timer);
  }, [isMobile]);

  // Send a queued question ("Ask about this", the command palette): on open,
  // and whenever a new one arrives while the bubble is already up. Taken only
  // once the chat is free, so it is never dropped.
  const { pendingQuestion } = useCompanionState();
  useEffect(() => {
    if (!pendingQuestion || isLoading) return;
    // Deferred a tick: sending updates the chat store and this input.
    const timer = window.setTimeout(() => {
      if (isTwinChatBusy()) return;
      const question = takePendingQuestion();
      if (question) send(question);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isLoading, pendingQuestion, send]);

  // A new question resets the answer area to its top, once.
  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [turnAnchorId]);

  // The avatar looks at the composer while the visitor types.
  const typing = input.trim().length > 0;
  useEffect(() => {
    emitGuide({ type: "chat/typing", active: typing });
    if (!typing || !inputRef.current) {
      emitGuide({ type: "guide/point", pointAt: null });
      return;
    }
    const rect = inputRef.current.getBoundingClientRect();
    emitGuide({ type: "guide/point", pointAt: { x: rect.left + Math.min(rect.width, 24 + input.length * 7), y: rect.top + rect.height / 2 } });
  }, [input, typing]);
  useEffect(() => () => emitGuide({ type: "guide/point", pointAt: null }), []);

  const chips = exchange?.answer?.suggestions?.slice(0, 2) ?? (exchange ? [] : SECTION_CHIPS[activeSection ?? "hero"] ?? SECTION_CHIPS.hero);
  const answer = exchange?.answer ?? null;

  // Whether the answer area overflows (and so should take the wheel).
  const [bodyScrolls, setBodyScrolls] = useState(false);
  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    const check = () => setBodyScrolls(node.scrollHeight > node.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, [exchange?.question.id, answer?.content]);


  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <div className="flex items-start gap-2 border-b border-border/40 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {exchange ? "You asked" : "Nikunj's AI Twin"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">
            {exchange ? exchange.question.content : "Ask me anything about his work."}
          </p>
          {exchange && exchange.question.content.length > 90 && (
            <button type="button" onClick={onExpand} className="mt-0.5 text-[11px] font-medium text-primary-text hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Read in full
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onExpand}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:h-8 md:w-8"
          aria-label="Open full conversation"
          title="Open full conversation"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:h-8 md:w-8"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {exchange && (
        <div
          ref={bodyRef}
          // Lenis leaves this to native scrolling only while the answer
          // overflows; a short answer passes the wheel to the page.
          data-lenis-prevent={bodyScrolls || undefined}
          role="log"
          aria-live="off"
          aria-busy={Boolean(answer?.streaming) || (isLoading && !answer)}
          className="scroll-panel min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 text-sm leading-relaxed text-foreground"
          style={{ maxHeight: inline ? "min(36vh, 300px)" : undefined }}
        >
          {answer ? (
            <>
              <TwinAssistantBody message={answer} components={components} reducedMotion={reduceMotion} showTakeMeThere={isMobile} onTakeMeThere={takeMeThere} />
              {partialAnswerNote(answer) && (
                <p role="alert" className="mt-2 text-[11px] text-amber-600 dark:text-amber-300">{partialAnswerNote(answer)}</p>
              )}
            </>
          ) : (
            <p className="font-mono text-[11px] text-muted-foreground">
              Thinking<span className="ml-1 animate-pulse motion-reduce:animate-none">…</span>
            </p>
          )}
          {answer?.error?.retryable && (
            <button
              type="button"
              onClick={() => retryTwinMessage(answer, { unavailable, onNavigate })}
              disabled={isLoading}
              className="mt-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-foreground hover:bg-amber-500/15 disabled:opacity-60"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border/40 px-3 py-3">
        {chips.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => send(chip)}
                disabled={unavailable}
                className="min-h-11 max-w-full truncate rounded-full bg-primary/10 md:min-h-8 px-3 text-xs text-foreground transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
        {!exchange && (
          <button
            type="button"
            onClick={() => {
              dispatchCompanion({ type: "ask/close" });
              startGuideTour();
            }}
            className="inline-flex min-h-8 items-center gap-1.5 self-start text-xs font-semibold text-primary-text hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            Take the 60-second tour
          </button>
        )}
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={unavailable ? "The assistant is offline right now." : "Ask about his work…"}
            aria-label="Ask Nikunj's AI Twin"
            autoComplete="off"
            maxLength={MAX_QUESTION_LENGTH}
            disabled={unavailable}
            className="min-h-10 flex-1 rounded-xl border border-border/40 bg-background/60 px-3 text-base sm:text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || unavailable}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
