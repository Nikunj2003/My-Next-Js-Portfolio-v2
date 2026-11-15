"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GuideAvatarSlot } from "@/components/guide/GuideAvatarSlot";
import { emitGuide } from "@/lib/guide/bus";
import { ASLEEP_LINE, BORED_LINE, DIZZY_LINE, HOVER_LINE, PET_LINES, WAKE_LINE, greetingFor } from "@/lib/guide/hero-lines";
import { useGuideView } from "@/lib/guide/useGuideView";
import { dispatchCompanion, openPanel, setHeroVisible, useCompanionState } from "@/lib/guide/companion-store";
import { AskContent } from "@/components/guide/AskContent";
import { useIsMobile } from "@/hooks/use-mobile";
import { introPending, markAvatarDrawn } from "@/lib/hero-intro";
import { HERO_FACE_SHARE } from "@/lib/guide/placement";

/**
 * Nex in the hero, and what it says.
 *
 * Two pieces in the page flow, so nothing in the hero ever overlaps:
 *  - `GuideHeroAvatar`: only the face, its ring and glow, sized by the
 *    identity row's `--stage` (240px, 200px on smaller screens). The name
 *    sits either side of it on one line through the face's centre.
 *  - `HeroAskHost`: below the identity row, the caption (what Nex says) and
 *    the proof links, or, once the visitor asks, the conversation. It opens in
 *    the page: what follows moves down rather than being covered.
 *
 * `data-guide-hero-avatar` is the button the companion hands off from (its
 * layout box is the stage, untransformed); `data-guide-target="hero-guide"`
 * lets the tour and the agent point here.
 */

/** The live face's drawn size inside the stage (the hand-off's measured box). */
const FACE_SHARE = HERO_FACE_SHARE;

/** Shared between the stage and the host below it: the line Nex is saying right now. */
let spoken: string | null = null;
const spokenListeners = new Set<() => void>();
function setSpoken(next: string | null) {
  if (spoken === next) return;
  spoken = next;
  spokenListeners.forEach((listener) => listener());
}
function useSpoken() {
  return useSyncExternalStore(
    (listener) => {
      spokenListeners.add(listener);
      return () => spokenListeners.delete(listener);
    },
    () => spoken,
    () => null
  );
}

function useStageSize() {
  // Mirrors `.hero-identity { --stage }` in globals.css.
  return useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia("(max-width: 1279px), (max-height: 819px)");
      query.addEventListener("change", listener);
      return () => query.removeEventListener("change", listener);
    },
    () => (window.matchMedia("(max-width: 1279px), (max-height: 819px)").matches ? 200 : 240),
    () => 240
  );
}

export function GuideHeroAvatar() {
  const view = useGuideView();
  const companion = useCompanionState();
  const isMobile = useIsMobile();
  const stage = useStageSize();
  const face = Math.round(stage * FACE_SHARE);
  const avatarRef = useRef<HTMLButtonElement>(null);
  // The companion has taken over (the hand-off is past its swap): the hero is
  // faded out, so its frame loop can rest. Before the companion has loaded,
  // and during the tour (narrated from the corner), the hero stays live.
  const handedOff = companion.companionVisible && !companion.heroVisible && companion.bubble !== "tour";

  // Whether the hero avatar is the guide right now (`heroVisible`) is set by
  // the companion's frame loop from the scroll hand-off. Reset on unmount.
  useEffect(() => () => setHeroVisible(false), []);

  const hideTimer = useRef<number | null>(null);
  const streakRef = useRef(0);
  const say = useCallback((text: string, ms = 3200) => {
    setSpoken(text);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setSpoken(null), ms);
  }, []);

  // Greet once, when the page has settled: after the intro if it plays.
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const greet = () => {
      if (!cancelled) timer = window.setTimeout(() => say(greetingFor(new Date().getHours()), 5200), 400);
    };
    if (!introPending()) {
      timer = window.setTimeout(() => say(greetingFor(new Date().getHours()), 5200), 1400);
    } else {
      const observer = new MutationObserver(() => {
        if (!introPending()) {
          observer.disconnect();
          greet();
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-hero-intro"] });
      return () => {
        cancelled = true;
        observer.disconnect();
        window.clearTimeout(timer);
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
      };
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [say]);

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
  }, [say, view.face, view.state]);

  const onClick = () => {
    emitGuide({ type: "pet/click", now: Date.now() });
    streakRef.current = (streakRef.current % PET_LINES.length) + 1;
    say(PET_LINES[streakRef.current - 1], 2200);
  };

  return (
    // The stage. Below lg the companion avatar takes over this role, so the
    // hero shows the still drawing at a smaller size (via CSS).
    <span data-guide-hero-column data-guide-target="hero-guide" className="relative flex justify-center" style={{ width: "var(--stage)", height: "var(--stage)" }}>
      <span data-hero-part="avatar-glow" aria-hidden="true" className="pointer-events-none absolute inset-[-14%] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.16)_0%,transparent_68%)]" />
      {/* The intro moves this wrapper (in from the screen centre); the
          companion's hand-off styles the button inside it. Never the same element. */}
      <span data-hero-part="stage" className="relative block h-full w-full">
        <button
          ref={avatarRef}
          type="button"
          data-guide-hero-avatar
          onClick={onClick}
          onPointerEnter={() => {
            emitGuide({ type: "page/hover", active: true });
            if (!spoken) say(HOVER_LINE, 2400);
          }}
          onPointerLeave={() => emitGuide({ type: "page/hover", active: false })}
          onFocus={() => emitGuide({ type: "page/hover", active: true })}
          onBlur={() => emitGuide({ type: "page/hover", active: false })}
          aria-label="Nex, Nikunj's AI guide. Activate for a reaction."
          className="group relative flex h-full w-full cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span aria-hidden="true" className="nex-ring" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-[7%] rounded-full guide-disc" />
          {/* The intro's sleeping z's and its wake pulse (animated by HeroIntro). */}
          <span aria-hidden="true" data-hero-part="zz" className="pointer-events-none absolute right-[14%] top-[10%] z-20 opacity-0">
            <span className="hero-z absolute font-mono text-base font-bold text-primary">z</span>
            <span className="hero-z absolute left-4 -top-5 font-mono text-xl font-bold text-primary [animation-delay:600ms]">z</span>
            <span className="hero-z absolute left-9 -top-11 font-mono text-2xl font-bold text-primary [animation-delay:1200ms]">Z</span>
          </span>
          <span aria-hidden="true" data-hero-part="pulse" className="pointer-events-none absolute inset-[12%] rounded-full border-2 border-primary/80 opacity-0" />
          <GuideAvatarSlot size={face} followPointer settleAfterMs={10_000} paused={isMobile || handedOff} onDrawn={markAvatarDrawn} />
        </button>
      </span>
    </span>
  );
}

/** Proof points under the face. Each links to the work that backs it. */
const PROOF_LINKS = [
  { label: "Agents", href: "/work/documentation-automation" },
  { label: "RAG", href: "/work/knowledge-graph-rag" },
  { label: "Evals", href: "/work/llm-evaluation-platform" },
  { label: "MCP", href: "/work/governed-mcp-registry" },
];

/**
 * What Nex says, under the identity row, in a reserved band, and the
 * conversation when the visitor asks in the hero. One element in the flow:
 * the caption and links give way to the conversation, which reserves its
 * height once when it opens (the answer scrolls inside it), so streaming
 * text never moves the page.
 */
export function HeroAskHost() {
  const view = useGuideView();
  const companion = useCompanionState();
  const isMobile = useIsMobile();
  const reduceMotion = Boolean(useReducedMotion());
  const line = useSpoken();
  const open = companion.bubble === "ask" && companion.askHost === "hero" && !isMobile;
  const openerRef = useRef<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  // When it opens: remember what opened it (focus goes back there on close),
  // and bring the whole conversation into view if it isn't. One scroll,
  // after layout; never per token.
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    const timer = window.setTimeout(() => {
      const host = hostRef.current;
      if (!host) return;
      const box = host.getBoundingClientRect();
      const overflow = box.bottom - (window.innerHeight - 24);
      if (overflow <= 0) return;
      const lenis = (window as Window & { __lenis?: { scrollTo: (y: number, options?: object) => void } }).__lenis;
      const target = window.scrollY + Math.min(overflow, Math.max(0, box.top - 96));
      if (lenis) lenis.scrollTo(target, { duration: reduceMotion ? 0 : 0.6 });
      else window.scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
    }, reduceMotion ? 0 : 260);
    return () => window.clearTimeout(timer);
  }, [open, reduceMotion]);

  const close = useCallback(() => {
    dispatchCompanion({ type: "ask/close" });
    const opener = openerRef.current;
    const avatar = document.querySelector<HTMLElement>("[data-guide-hero-avatar]");
    (opener?.isConnected ? opener : avatar)?.focus({ preventScroll: true });
  }, []);

  // Escape closes it (the companion's own handler leaves in-page hosts alone).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div ref={hostRef} className="mt-4 flex w-full flex-col items-center">
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="ask"
            id="nex-host-hero"
            role="region"
            aria-label="Conversation with Nex"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22 }}
            className="nex-host flex w-full max-w-[40rem] flex-col overflow-hidden rounded-2xl border border-primary/20 text-left glass-strong shadow-accent-soft"
          >
            <AskContent inline activeSection="hero" onExpand={openPanel} onClose={close} isMobile={false} reduceMotion={reduceMotion} />
          </motion.div>
        ) : (
          <motion.div
            key="caption"
            data-hero-part="avatar-ui"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex w-full flex-col items-center"
          >
            {/* A reserved two-line band: greetings, reactions and the status
                line all use it, so nothing below moves when Nex talks. */}
            <p aria-live="off" className="flex min-h-11 max-w-[28rem] items-center justify-center text-sm leading-[1.375rem] text-muted-foreground" style={{ textWrap: "balance" }}>
              {line ?? (
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                  {view.caption}
                </span>
              )}
            </p>
            <ul className="mt-1 flex flex-wrap justify-center gap-x-5 gap-y-1">
              {PROOF_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-8 items-center text-sm font-medium text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
