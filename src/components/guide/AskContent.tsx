"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type Components } from "react-markdown";
import { Briefcase, Compass, CornerDownRight, Maximize2, MessageCircle, Send, X } from "lucide-react";
import { buildAnswerComponents } from "@/components/ai/AnswerBody";
import { NexAnswerBody } from "@/components/ai/NexAnswerBody";
import type { ChatToolCall } from "@/lib/chat-contract";
import { selectLatestExchange } from "@/lib/chat/latest-exchange";
import { isNexChatBusy, partialAnswerNote, retryNexMessage, sendNexMessage } from "@/lib/chat/nex-chat-store";
import { useNexChat } from "@/lib/chat/useNexChat";
import { runGuideAction } from "@/lib/guide/actions";
import { SECTION_CHIPS } from "@/lib/guide/anchors";
import { emitGuide } from "@/lib/guide/bus";
import { dispatchCompanion, getAskDraft, setAskDraft, takeComposerMode, takePendingQuestion, useCompanionSelector } from "@/lib/guide/companion-store";
import { MAX_ROLE_LENGTH, roleFitQuestion } from "@/lib/chat/role-fit";
import { startGuideTour } from "@/lib/guide/tour-control";
import { useChatAvailability } from "@/hooks/useChatAvailability";
import { NexRing } from "@/components/guide/NexRing";
import { Collapse } from "@/components/ui/collapse";
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
  /**
   * Fill a host of fixed height (the footer's band): the answer takes what
   * is left and scrolls inside, so opening or answering never changes the
   * host's size. Chips are trimmed to one row's worth there.
   */
  fill?: boolean;
  /** The answer area's height in an in-page row (CSS length); by default a compact one. */
  bodyHeight?: string;
  /**
   * A reserved place for Nex at the head of the conversation (in-page rows):
   * a ringed socket the companion flies to and rests in while it is open, in
   * place of the small chat icon.
   */
  socket?: boolean;
};

/** The ask box: latest question and answer, chips, composer. Hosted by the companion's bubble or inline by the hero avatar. */
export function AskContent({ activeSection, onExpand, onClose, isMobile, reduceMotion, inline = false, fill = false, bodyHeight, socket = false }: AskContentProps) {
  const { messages, isLoading, announcement, turnAnchorId } = useNexChat();
  const { status } = useChatAvailability();
  const router = useRouter();
  const [input, setInputState] = useState(getAskDraft);
  // The draft is shared with the other ask surface (hero <-> companion). It is
  // written outside the state updater, which must stay pure.
  const setInput = useCallback((next: string | ((current: string) => string)) => {
    const value = typeof next === "function" ? next(getAskDraft()) : next;
    setAskDraft(value);
    setInputState(value);
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Role-fit mode: what is typed is a role, sent wrapped as a fit question.
  const [roleFit, setRoleFit] = useState(() => takeComposerMode() === "role-fit");
  const startRoleFit = () => {
    setRoleFit(true);
    inputRef.current?.focus({ preventScroll: true });
  };
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
    (text: string, fromComposer = true) => {
      const message = text.trim();
      if (!message || isNexChatBusy()) return false;
      // A queued question ("Ask about this") leaves what the visitor is typing alone.
      if (fromComposer) setInput("");
      void sendNexMessage(message, { unavailable, onNavigate }).then((accepted) => {
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
  const pendingQuestion = useCompanionSelector((s) => s.pendingQuestion);
  useEffect(() => {
    if (!pendingQuestion || isLoading) return;
    // Deferred a tick: sending updates the chat store and this input.
    const timer = window.setTimeout(() => {
      if (isNexChatBusy()) return;
      const question = takePendingQuestion();
      if (question) send(question, false);
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

  const allChips = exchange?.answer?.suggestions?.slice(0, 2) ?? (exchange ? [] : SECTION_CHIPS[activeSection ?? "hero"] ?? SECTION_CHIPS.hero);
  const chips = fill ? allChips.slice(0, exchange ? 1 : 2) : allChips;
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
      <div className={"flex gap-3 border-b border-foreground/[0.07] px-4 py-3.5 " + (socket ? "items-center gap-4" : "items-start")}>
        {socket ? (
          <span data-guide-ask-socket aria-hidden="true" className="relative -my-1 block h-[68px] w-[68px] shrink-0">
            <span className="pointer-events-none absolute inset-[-20%] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,transparent_68%)]" />
            <NexRing outset={6} />
          </span>
        ) : (
          <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary-text">
          <MessageCircle className="h-3.5 w-3.5" />
        </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{exchange ? "You asked" : "Nex, AI guide"}</p>
          <p className="mt-0.5 line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-foreground">
            {exchange ? exchange.question.content : "Ask about Nikunj's work. I answer from his case studies."}
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
          className="scroll-panel min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-[0.9375rem] leading-relaxed text-foreground"
          style={inline && !fill ? { height: bodyHeight ?? "clamp(12rem, 34svh, 20rem)", flex: "none" } : undefined}
        >
          {answer ? (
            <>
              <NexAnswerBody message={answer} components={components} reducedMotion={reduceMotion} showTakeMeThere={isMobile} onTakeMeThere={takeMeThere} />
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
              onClick={() => retryNexMessage(answer, { unavailable, onNavigate })}
              disabled={isLoading}
              className="mt-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-foreground hover:bg-amber-500/15 disabled:opacity-60"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col border-t border-foreground/[0.07] px-4 py-3.5">
        {/* The rows above the composer ease in and out (chips come back when
            an answer ends and go while one is coming), so nothing snaps. Each
            carries its own bottom gap: a closed row takes no space at all. */}
        <Collapse open={chips.length > 0 && !isLoading}>
          <div className="pb-3">
            <p className="mb-2 text-xs text-muted-foreground">{exchange ? "Ask next" : "Try one"}</p>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => send(chip, false)}
                  disabled={unavailable}
                  className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-1.5 text-left text-[0.8125rem] leading-snug text-foreground/90 transition-colors hover:border-primary/45 hover:bg-primary/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                >
                  <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-primary-text" aria-hidden="true" />
                  <span className="min-w-0">{chip}</span>
                </button>
              ))}
            </div>
          </div>
        </Collapse>
        <Collapse open={activeSection === "contact" && !roleFit && !isLoading}>
          <div className="pb-3">
          <button
            type="button"
            onClick={startRoleFit}
            className="inline-flex min-h-8 items-center gap-1.5 self-start text-xs font-semibold text-primary-text hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
            Check a role&apos;s fit
          </button>
          </div>
        </Collapse>
        <Collapse open={roleFit}>
          <p className="pb-3 text-xs text-muted-foreground">Paste a role; Nex says how his work fits, gaps included. Nothing is sent to Nikunj.</p>
        </Collapse>
        <Collapse open={!exchange && activeSection !== "contact"}>
          <div className="pb-3">
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
          </div>
        </Collapse>
        <form
          className="flex items-center gap-1.5 rounded-full border border-foreground/10 bg-background/55 py-1 pl-4 pr-1 transition-colors focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15"
          onSubmit={(event) => {
            event.preventDefault();
            if (!input.trim()) return;
            if (roleFit) {
              if (send(roleFitQuestion(input), false)) {
                setInput("");
                setRoleFit(false);
              }
              return;
            }
            send(input);
          }}
        >
          {roleFit && (
            <button
              type="button"
              onClick={() => setRoleFit(false)}
              aria-label="Stop checking a role's fit"
              title="Back to asking"
              className="-ml-2 flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary/12 px-2.5 text-xs font-semibold text-primary-text"
            >
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              Role
              <X className="h-3 w-3 opacity-70" aria-hidden="true" />
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={unavailable ? "Nex is offline right now." : roleFit ? "Paste the role or job description…" : "Ask about his work…"}
            aria-label={roleFit ? "Role to check Nikunj's fit against" : "Ask Nex"}
            autoComplete="off"
            maxLength={roleFit ? MAX_ROLE_LENGTH : MAX_QUESTION_LENGTH}
            disabled={unavailable}
            className="min-h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70 disabled:opacity-60 sm:text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || unavailable}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[opacity,transform] active:scale-95 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
