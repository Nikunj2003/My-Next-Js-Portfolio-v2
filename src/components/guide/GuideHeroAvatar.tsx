"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Compass, MessageCircle } from "lucide-react";
import { GuideAvatarSlot } from "@/components/guide/GuideAvatarSlot";
import { openNex } from "@/lib/ask-nex";
import { emitGuide } from "@/lib/guide/bus";
import { ASLEEP_LINE, BORED_LINE, DIZZY_LINE, HOVER_LINE, PET_LINES, WAKE_LINE, greetingFor } from "@/lib/guide/hero-lines";
import { startGuideTour } from "@/lib/guide/tour-control";
import { useGuideView } from "@/lib/guide/useGuideView";
import { dispatchCompanion, openPanel, setHeroVisible, useCompanionState } from "@/lib/guide/companion-store";
import { AskContent } from "@/components/guide/AskContent";
import { useIsMobile } from "@/hooks/use-mobile";
import { introPending, markAvatarDrawn } from "@/lib/hero-intro";

/** While the ask box is open the avatar shrinks to this, toward its top edge. */
const AVATAR_ASK_SCALE = 0.55;
/** The avatar block is 364px (300 + padding); the box starts just under the shrunken avatar. */
const ASK_TOP = Math.round(364 * AVATAR_ASK_SCALE) + 14;

/** Proof points that orbit the avatar. Each links to the work that backs it. */
const ORBIT = [
  { label: "Agents", href: "/work/governed-mcp-registry", angle: -150 },
  { label: "RAG", href: "/work/knowledge-graph-rag", angle: -30 },
  { label: "Evals", href: "/work/llm-evaluation-platform", angle: 30 },
  { label: "MCP", href: "/work/governed-mcp-registry", angle: 150 },
];

/**
 * The large hero avatar. It follows the visitor's pointer across the page,
 * greets them, talks back in a speech bubble when hovered or clicked, gets
 * dizzy after five quick clicks, and dozes off if left alone.
 *
 * `data-guide-hero-avatar` is how the scroll companion knows where to hand off
 * from; `data-guide-target="hero-guide"` lets the tour and the agent point here.
 */
export function GuideHeroAvatar() {
  const view = useGuideView();
  const companion = useCompanionState();
  const isMobile = useIsMobile();
  const rootRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  // While the hero is on screen this avatar is the only character: it hosts
  // the ask box inline, in place of its speech line and buttons. Scroll away
  // and the companion carries the same conversation on.
  const askOpen = companion.bubble === "ask" && companion.heroVisible && !isMobile;
  // The companion has taken over (the hand-off is past its swap): the hero is
  // faded out, so its frame loop can rest. Before the companion has loaded,
  // and during the tour (narrated from the corner), the hero stays live.
  const handedOff = companion.companionVisible && !companion.heroVisible && companion.bubble !== "tour";

  // Whether the hero avatar is the guide right now (`heroVisible`) is set by
  // the companion's frame loop from the scroll hand-off, so the conversation
  // moves exactly when the two avatars swap. Reset when the hero unmounts.
  useEffect(() => () => setHeroVisible(false), []);

  // The box may grow past the buttons, down to the bottom of the hero section.
  const [askMaxHeight, setAskMaxHeight] = useState(480);
  useLayoutEffect(() => {
    if (!askOpen) return;
    const measure = () => {
      const root = rootRef.current;
      const section = root?.closest("section");
      if (!root || !section) return;
      const top = root.getBoundingClientRect().top + ASK_TOP;
      setAskMaxHeight(Math.max(280, Math.min(520, section.getBoundingClientRect().bottom - top - 16)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [askOpen]);

  const closeAsk = useCallback(() => {
    dispatchCompanion({ type: "ask/close" });
    avatarRef.current?.focus({ preventScroll: true });
  }, []);

  // Escape closes the inline ask box (the companion's own handler is idle while it is hidden).
  useEffect(() => {
    if (!askOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      closeAsk();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [askOpen, closeAsk]);
  const reduceMotion = Boolean(useReducedMotion());
  const [line, setLine] = useState<string | null>(null);
  const hideTimer = useRef<number | null>(null);
  const streakRef = useRef(0);

  const say = (text: string, ms = 3200) => {
    setLine(text);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setLine(null), ms);
  };

  // Greet once, shortly after the page settles.
  useEffect(() => {
    // After the intro (if it plays), so the greeting is the last beat of it.
    const timer = window.setTimeout(() => say(greetingFor(new Date().getHours()), 5200), introPending() ? 3000 : 1400);
    return () => {
      window.clearTimeout(timer);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  // React to what the guide is doing: dizzy, bored, asleep, waking.
  const lastState = useRef(view.state);
  useEffect(() => {
    const previous = lastState.current;
    lastState.current = view.state;
    if (view.state === previous) return;
    const timer = window.setTimeout(() => {
      if (view.state === "confused" && view.face === "surprised") say(DIZZY_LINE);
      else if (view.state === "bored") say(BORED_LINE, 4000);
      else if (view.state === "sleeping") say(ASLEEP_LINE, 6000);
      else if (view.state === "waking") say(WAKE_LINE, 2400);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [view.face, view.state]);

  const onClick = () => {
    const now = Date.now();
    emitGuide({ type: "pet/click", now });
    streakRef.current = (streakRef.current % PET_LINES.length) + 1;
    say(PET_LINES[streakRef.current - 1], 2200);
  };

  return (
    <div ref={rootRef} className="relative flex flex-col items-center gap-4" data-guide-target="hero-guide">
      <motion.div
        className="relative"
        style={{ transformOrigin: "50% 0%" }}
        animate={{ scale: askOpen ? AVATAR_ASK_SCALE : 1 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28 }}
      >
        {/* Orbit of proof chips */}
        <div data-hero-part="chips" className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 ${askOpen ? "opacity-0" : "opacity-100"}`}>
          {ORBIT.map((chip) => {
            const radians = (chip.angle * Math.PI) / 180;
            return (
              // The wrapper holds the chip's place on the orbit (its transform);
              // the intro animates the chip inside it. Animating the chip's own
              // transform replaced that position, so every chip sat on the
              // avatar's face until the intro ended, then jumped out.
              <span
                key={chip.label}
                className="absolute left-1/2 top-1/2"
                style={{ transform: `translate(-50%, -50%) translate(${Math.cos(radians) * 214}px, ${Math.sin(radians) * 186}px)` }}
              >
                <a
                  data-hero-chip
                  href={chip.href}
                  tabIndex={askOpen ? -1 : undefined}
                  // Hidden while the ask box is open: not clickable either.
                  className={`${askOpen ? "pointer-events-none" : "pointer-events-auto"} block rounded-full border border-primary/25 glass-subtle px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-primary-text shadow-accent-soft transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                >
                  {chip.label}
                </a>
              </span>
            );
          })}
        </div>

        {/* The intro moves this wrapper (to the screen centre and back); the
            companion's hand-off styles the button inside it. They never touch
            the same element. */}
        <div data-hero-part="stage" className="relative">
        <button
          ref={avatarRef}
          type="button"
          data-guide-hero-avatar
          onClick={onClick}
          onPointerEnter={() => {
            emitGuide({ type: "page/hover", active: true });
            if (!line) say(HOVER_LINE, 2400);
          }}
          onPointerLeave={() => emitGuide({ type: "page/hover", active: false })}
          onFocus={() => emitGuide({ type: "page/hover", active: true })}
          onBlur={() => emitGuide({ type: "page/hover", active: false })}
          aria-label="Nex, Nikunj's AI guide. Activate for a reaction."
          className="group relative flex cursor-pointer items-center justify-center rounded-full p-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* Glow and a slow ring, static under reduced motion */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.24)_0%,transparent_66%)]" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 rounded-full border border-dashed border-primary/25 motion-safe:animate-[spin_40s_linear_infinite]"
          />
          <span aria-hidden="true" className="pointer-events-none absolute inset-10 rounded-full border border-primary/10 transition-colors group-hover:border-primary/30" />
          {/* Paused once the companion has taken over (it sits at opacity 0 then, which the
              library's own offscreen check still counts as visible) and below lg, where
              the hero column is display:none. */}
          {/* The intro's sleeping z's and its wake pulse (animated by HeroIntro). */}
          <span aria-hidden="true" data-hero-part="zz" className="pointer-events-none absolute right-[16%] top-[12%] z-20 opacity-0">
            <span className="hero-z absolute font-mono text-base font-bold text-primary">z</span>
            <span className="hero-z absolute left-4 -top-5 font-mono text-xl font-bold text-primary [animation-delay:600ms]">z</span>
            <span className="hero-z absolute left-9 -top-11 font-mono text-2xl font-bold text-primary [animation-delay:1200ms]">Z</span>
          </span>
          <span aria-hidden="true" data-hero-part="pulse" className="pointer-events-none absolute inset-[14%] rounded-full border-2 border-primary/80 opacity-0" />
          <GuideAvatarSlot size={300} followPointer settleAfterMs={10_000} paused={isMobile || handedOff} onDrawn={markAvatarDrawn} />
        </button>
        </div>
      </motion.div>

      {/* The speech line and buttons stay in the layout while the ask box is
          open, so the hero never changes height and the copy beside it never
          moves. The ask box opens over them and the space the avatar frees as
          it shrinks back, with its tail pointing at the avatar. */}
      <div
        data-hero-part="avatar-ui"
        className={`flex flex-col items-center gap-4 transition-opacity duration-150 ${askOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}
        aria-hidden={askOpen || undefined}
        inert={askOpen || undefined}
      >
      {/* What it says goes here, between the avatar and its buttons: a fixed
          slot, so the face is never covered and nothing shifts when it talks.
          At rest it shows the status line. */}
      <div className="relative flex h-14 w-[min(24rem,80vw)] items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {line ? (
            <motion.p
              key={line}
              aria-live="off"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
              className="relative w-fit rounded-2xl border border-primary/25 glass-strong px-4 py-2.5 text-center text-sm font-medium text-foreground shadow-accent-soft"
            >
              {/* Tail points up at the avatar */}
              <span aria-hidden="true" className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-primary/25 bg-background/80" />
              {line}
            </motion.p>
          ) : (
            <motion.p
              key="status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
              aria-live="off"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" aria-hidden="true" />
              {view.caption}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => openNex("")}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/30 glass-subtle px-5 text-sm font-semibold text-foreground shadow-accent-soft transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
          >
            <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
            Ask Nex
          </button>
          <button
            type="button"
            onClick={startGuideTour}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary-text transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            60-second tour
          </button>
        </div>
      </div>
      </div>

      <AnimatePresence initial={false}>
        {askOpen && (
          <motion.div
            key="ask"
            id="nex-bubble-hero"
            role="dialog"
            aria-label="Nex, AI guide"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
            style={{ top: ASK_TOP, maxHeight: askMaxHeight, x: "-50%" }}
            className="absolute left-1/2 z-20 flex w-[min(26rem,100%)] flex-col overflow-hidden rounded-2xl border border-primary/25 glass-strong glass-overlay shadow-accent-card"
          >
            <span aria-hidden="true" className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-primary/25 bg-background/80" />
            <AskContent inline activeSection="hero" onExpand={openPanel} onClose={closeAsk} isMobile={false} reduceMotion={reduceMotion} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
