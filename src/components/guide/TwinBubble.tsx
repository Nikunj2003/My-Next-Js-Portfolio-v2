"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { type Components } from "react-markdown";
import { ArrowRight, Compass, Maximize2, Send, X } from "lucide-react";
import { buildAnswerComponents } from "@/components/ai/AnswerBody";
import { TwinAssistantBody } from "@/components/ai/TwinAssistantBody";
import type { ChatToolCall } from "@/lib/chat-contract";
import { selectLatestExchange } from "@/lib/chat/latest-exchange";
import { retryTwinMessage, sendTwinMessage } from "@/lib/chat/twin-chat-store";
import { useTwinChat } from "@/lib/chat/useTwinChat";
import { runGuideAction } from "@/lib/guide/actions";
import { SECTION_CHIPS } from "@/lib/guide/anchors";
import { emitGuide } from "@/lib/guide/bus";
import { dispatchCompanion, takePendingQuestion, useCompanionState } from "@/lib/guide/companion-store";
import { placeBubble, type Dock } from "@/lib/guide/placement";
import { startGuideTour } from "@/lib/guide/tour-control";
import { useLenisLock } from "@/hooks/useLenisLock";
import { useChatAvailability } from "@/hooks/useChatAvailability";
import { scrollToHash } from "@/lib/scroll";

const BUBBLE_WIDTH = 360;
const OFFSET_SPRING = { stiffness: 140, damping: 22, mass: 0.8 };
const NAVBAR = 85;

type TwinBubbleProps = {
  anchorX: MotionValue<number>;
  anchorY: MotionValue<number>;
  size: number;
  dock: Dock | null;
  visible: boolean;
  isMobile: boolean;
  /** Section in view, for context chips; null off the homepage. */
  activeSection: string | null;
  onExpand: () => void;
  returnFocus: () => void;
  /** The tour narrator renders through this slot. */
  tourContent?: ReactNode;
};

/**
 * The companion's single speech bubble: an inline ask box, a short tip, or the
 * tour narration. It sits beside the avatar on the side with room (a bottom
 * sheet on phones) and follows the avatar's springs, so it moves with it.
 *
 * The ask variant shows the latest question as its header and the answer
 * below; earlier turns live in the full conversation panel.
 */
export function TwinBubble(props: TwinBubbleProps) {
  const { anchorX, anchorY, size, dock, visible, isMobile, activeSection, onExpand, returnFocus, tourContent } = props;
  const companion = useCompanionState();
  const reduceMotion = Boolean(useReducedMotion());
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleHeight, setBubbleHeight] = useState(280);

  const showing = visible || isMobile ? companion.bubble : "none";
  const open = showing !== "none";

  // Measure so placement knows how tall the bubble is.
  useLayoutEffect(() => {
    const node = bubbleRef.current;
    if (!open || !node || isMobile) return;
    const observer = new ResizeObserver(() => setBubbleHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, [isMobile, open]);

  const placement = useMemo(() => {
    if (!dock || typeof window === "undefined") return { side: "left" as const, dx: -BUBBLE_WIDTH - 12, dy: 0 };
    const prefer = dock.prefer;
    const placed = placeBubble({
      align: dock.align,
      anchor: { left: dock.x, top: dock.y, width: size, height: size },
      bubble: { width: BUBBLE_WIDTH, height: bubbleHeight },
      viewport: { width: document.documentElement.clientWidth, height: window.innerHeight, insetTop: NAVBAR, insetBottom: 0 },
      prefer,
    });
    return { side: placed.side, dx: placed.left - dock.x, dy: placed.top - dock.y };
  }, [bubbleHeight, dock, size]);

  // The offset from the avatar springs too, so when the bubble changes side
  // (the companion moved to a new section) it glides round instead of jumping.
  const offsetX = useSpring(placement.dx, OFFSET_SPRING);
  const offsetY = useSpring(placement.dy, OFFSET_SPRING);
  useEffect(() => {
    if (reduceMotion) {
      offsetX.jump(placement.dx);
      offsetY.jump(placement.dy);
    } else {
      offsetX.set(placement.dx);
      offsetY.set(placement.dy);
    }
  }, [offsetX, offsetY, placement.dx, placement.dy, reduceMotion]);
  const x = useTransform([anchorX, offsetX], ([anchor, offset]: number[]) => anchor + offset);
  const y = useTransform([anchorY, offsetY], ([anchor, offset]: number[]) => anchor + offset);

  useLenisLock(isMobile && open && showing !== "tip");

  const close = useCallback(() => {
    if (showing === "ask") dispatchCompanion({ type: "ask/close" });
    if (showing === "tip") dispatchCompanion({ type: "tip/expire" });
    returnFocus();
  }, [returnFocus, showing]);

  const content =
    showing === "ask" ? (
      <AskContent activeSection={activeSection} onExpand={onExpand} onClose={close} isMobile={isMobile} reduceMotion={reduceMotion} />
    ) : showing === "tip" && companion.tip ? (
      <TipContent text={companion.tip.text} />
    ) : showing === "tour" ? (
      tourContent ?? null
    ) : null;

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && content && (
          <>
            {showing !== "tip" && (
              <motion.div
                key="twin-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[55] bg-black/50 glass-scrim"
                onClick={close}
                aria-hidden="true"
              />
            )}
            <motion.div
              key="twin-sheet"
              id="twin-bubble"
              ref={bubbleRef}
              role={showing === "ask" ? "dialog" : "status"}
              aria-modal={showing === "ask" ? true : undefined}
              aria-label="Nikunj's AI Twin"
              initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
              transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[min(75dvh,calc(100dvh-5rem))] flex-col rounded-t-3xl border-t border-border/60 glass-strong glass-overlay pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-accent-card"
            >
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden="true" />
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && content && (
        <motion.div
          key={`twin-bubble-${showing}`}
          id="twin-bubble"
          ref={bubbleRef}
          role={showing === "ask" ? "dialog" : "status"}
          aria-label="Nikunj's AI Twin"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
          style={{ x, y, width: BUBBLE_WIDTH, transformOrigin: originFor(placement.side) }}
          className="fixed left-0 top-0 z-50 flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-2xl border border-border/60 glass-strong glass-overlay shadow-accent-card"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function originFor(side: string) {
  if (side === "left") return "100% 100%";
  if (side === "right") return "0% 100%";
  if (side === "top") return "100% 100%";
  return "100% 0%";
}

function TipContent({ text }: { text: string }) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (hovered) return;
    const timer = window.setTimeout(() => dispatchCompanion({ type: "tip/expire" }), 6000);
    return () => window.clearTimeout(timer);
  }, [hovered]);

  return (
    <div
      className="relative px-4 py-3 pr-10 text-sm leading-relaxed text-foreground"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <p>{text}</p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            dispatchCompanion({ type: "tip/expire" });
            dispatchCompanion({ type: "ask/open" });
          }}
          className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary-text hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Ask now <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => dispatchCompanion({ type: "tip/dismiss", forever: true })}
          className="min-h-8 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Don&apos;t show tips
        </button>
      </div>
      <button
        type="button"
        onClick={() => dispatchCompanion({ type: "tip/dismiss", forever: false })}
        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Dismiss tip"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

type AskContentProps = {
  activeSection: string | null;
  onExpand: () => void;
  onClose: () => void;
  isMobile: boolean;
  reduceMotion: boolean;
};

function AskContent({ activeSection, onExpand, onClose, isMobile, reduceMotion }: AskContentProps) {
  const { messages, isLoading, announcement, turnAnchorId } = useTwinChat();
  const { status } = useChatAvailability();
  const router = useRouter();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const exchange = selectLatestExchange(messages);
  const unavailable = status === "unavailable";

  const onNavigate = useCallback(
    (call: ChatToolCall) => {
      if (!call.href) return;
      // On phones the sheet covers the page; leave it to "Take me there".
      if (isMobile && call.href.startsWith("#")) return;
      window.setTimeout(() => runGuideAction({ href: call.href!, highlight: call.highlight }, router), 300);
    },
    [isMobile, router]
  );

  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      if (!message) return;
      setInput("");
      void sendTwinMessage(message, { unavailable, onNavigate });
    },
    [onNavigate, unavailable]
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
      }),
    [isMobile]
  );

  // Focus the composer when the bubble opens, and send any queued question.
  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), isMobile ? 260 : 40);
    const pending = takePendingQuestion();
    const sendTimer = pending ? window.setTimeout(() => send(pending), 0) : 0;
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(sendTimer);
    };
  }, [isMobile, send]);

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
        </div>
        <button
          type="button"
          onClick={onExpand}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open full conversation"
          title="Open full conversation"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {exchange && (
        <div
          ref={bodyRef}
          data-lenis-prevent
          role="log"
          aria-live="off"
          aria-busy={Boolean(answer?.streaming) || (isLoading && !answer)}
          className="scroll-panel min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-foreground"
          style={{ maxHeight: isMobile ? undefined : "min(40vh, 320px)" }}
        >
          {answer ? (
            <TwinAssistantBody message={answer} components={components} reducedMotion={reduceMotion} showTakeMeThere={isMobile} onTakeMeThere={takeMeThere} />
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
                className="min-h-8 max-w-full truncate rounded-full bg-primary/10 px-3 text-xs text-foreground transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
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
            disabled={unavailable}
            className="min-h-10 flex-1 rounded-xl border border-border/40 bg-background/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || unavailable}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
