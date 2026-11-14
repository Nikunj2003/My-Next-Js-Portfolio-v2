"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Compass, MessageCircle } from "lucide-react";
import { GuideAvatarSlot } from "@/components/guide/GuideAvatarSlot";
import { openAiTwin } from "@/lib/ask-twin";
import { emitGuide } from "@/lib/guide/bus";
import { ASLEEP_LINE, BORED_LINE, DIZZY_LINE, HOVER_LINE, PET_LINES, WAKE_LINE, greetingFor } from "@/lib/guide/hero-lines";
import { startGuideTour } from "@/lib/guide/tour-control";
import { useGuideView } from "@/lib/guide/useGuideView";
import { useCompanionState } from "@/lib/guide/companion-store";

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
  // While the ask bubble is open over the hero, step back: the companion is talking.
  const askOpen = useCompanionState().bubble === "ask";
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
    const timer = window.setTimeout(() => say(greetingFor(new Date().getHours()), 5200), 1400);
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
    <div className="relative flex h-full flex-col items-center justify-between gap-6" data-guide-target="hero-guide">
      <div className="relative">
        {/* Speech bubble */}
        {/* Inside the avatar's own box, over its upper half, so it never
            reaches up under the navbar however the column is sized. */}
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 w-[min(22rem,80vw)] -translate-x-1/2">
          <AnimatePresence>
            {line && !askOpen && (
              <motion.p
                key={line}
                role="status"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
                className="relative mx-auto w-fit rounded-2xl border border-primary/25 glass-strong px-4 py-2.5 text-center text-sm font-medium text-foreground shadow-accent-soft"
              >
                {line}
                <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-primary/25 bg-background/80" />
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Orbit of proof chips */}
        <div className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 ${askOpen ? "opacity-0" : "opacity-100"}`}>
          {ORBIT.map((chip) => {
            const radians = (chip.angle * Math.PI) / 180;
            return (
              <a
                key={chip.label}
                href={chip.href}
                tabIndex={askOpen ? -1 : undefined}
                className="pointer-events-auto absolute left-1/2 top-1/2 rounded-full border border-primary/25 glass-subtle px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-primary-text shadow-accent-soft transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ transform: `translate(-50%, -50%) translate(${Math.cos(radians) * 196}px, ${Math.sin(radians) * 172}px)` }}
              >
                {chip.label}
              </a>
            );
          })}
        </div>

        <button
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
          aria-label="Nikunj's AI Twin. Click to play."
          className="group relative flex cursor-pointer items-center justify-center rounded-full p-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* Glow and a slow ring, static under reduced motion */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.24)_0%,transparent_66%)]" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 rounded-full border border-dashed border-primary/25 motion-safe:animate-[spin_40s_linear_infinite]"
          />
          <span aria-hidden="true" className="pointer-events-none absolute inset-10 rounded-full border border-primary/10 transition-colors group-hover:border-primary/30" />
          <GuideAvatarSlot size={280} followPointer />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => openAiTwin("")}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/30 glass-subtle px-5 text-sm font-semibold text-foreground shadow-accent-soft transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
          >
            <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
            Ask me about Nikunj
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
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground" aria-live="off">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" aria-hidden="true" />
          {view.caption}
        </p>
      </div>
    </div>
  );
}
