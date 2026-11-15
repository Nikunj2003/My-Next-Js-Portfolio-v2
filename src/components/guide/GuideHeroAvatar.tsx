"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StaticGuideMark } from "@/components/guide/GuideAvatarSlot";
import { emitGuide } from "@/lib/guide/bus";
import { ASLEEP_LINE, BORED_LINE, DIZZY_LINE, HOVER_LINE, WAKE_LINE, greetingFor } from "@/lib/guide/hero-lines";
import { getSpoken, say as sayLine, sayPetLine, useSpoken } from "@/lib/guide/spoken";
import { useGuideView } from "@/lib/guide/useGuideView";
import { dispatchCompanion, openPanel, takeAskOpener, setHeroVisible, useCompanionState } from "@/lib/guide/companion-store";
import { AskContent } from "@/components/guide/AskContent";
import { useIsMobile } from "@/hooks/use-mobile";
import { introPending } from "@/lib/hero-intro";
import { HERO_FACE_SHARE } from "@/lib/guide/placement";

/**
 * Nex's place in the hero, and what it says.
 *
 * There is one Nex on the site: the companion (`GuideCompanion`). On desktop
 * it sits in this socket while the hero is on screen, drawn at the socket's
 * size, follows the pointer and reacts to clicks, then shrinks into the page
 * as the visitor scrolls. This component only lays out the place for it:
 *  - `GuideHeroAvatar`: the socket (ring, disc, glow and the intro's z's and
 *    pulse) sized by the identity row's `--stage`, with a still drawing that
 *    shows until the live Nex has arrived (and on phones, where the companion
 *    waits in the corner). Its button is the keyboard stop for petting Nex.
 *  - `HeroAskHost`: below the identity row, what Nex says and the proof
 *    links, or, once the visitor asks, the conversation, in the page flow.
 *
 * `data-guide-hero-avatar` is the socket the companion sits in (its layout
 * box is the stage); `data-guide-target="hero-guide"` lets the tour and the
 * agent point here.
 */

/** The face's drawn size inside the stage (the companion matches it). */
const FACE_SHARE = HERO_FACE_SHARE;

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
  const stage = useStageSize();
  const face = Math.round(stage * FACE_SHARE);

  // Whether Nex in the hero is the guide right now (`heroVisible`) is set by
  // the companion's frame loop from the scroll. Reset on unmount.
  useEffect(() => () => setHeroVisible(false), []);

  const say = useCallback((text: string, ms = 3200) => sayLine(text, ms), []);

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
      };
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
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

  // Keyboard (and pointer before the live Nex has arrived): the same reaction
  // as clicking the live Nex over this socket.
  const onClick = () => {
    emitGuide({ type: "pet/click", now: Date.now() });
    sayPetLine();
  };

  return (
    <span data-guide-hero-column data-guide-target="hero-guide" className="relative flex justify-center" style={{ width: "var(--stage)", height: "var(--stage)" }}>
      <span data-hero-part="avatar-glow" aria-hidden="true" className="pointer-events-none absolute inset-[-14%] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.16)_0%,transparent_68%)]" />
      {/* The intro moves this wrapper (in from the screen centre), and the
          live Nex follows wherever it is drawn. */}
      <span data-hero-part="stage" className="relative block h-full w-full">
        <button
          type="button"
          data-guide-hero-avatar
          onClick={onClick}
          onPointerEnter={() => {
            emitGuide({ type: "page/hover", active: true });
            if (!getSpoken()) say(HOVER_LINE, 2400);
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
          {/* Until the live Nex sits here (`html[data-nex-in-hero]`), and on phones. */}
          <span data-hero-still className="nex-socket-still relative inline-flex items-center justify-center" style={{ width: face, height: face }}>
            <StaticGuideMark size={face} />
          </span>
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
    openerRef.current = takeAskOpener();
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
    <div ref={hostRef} data-hero-part="ask-host" className="mt-5 flex w-full flex-col items-center">
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
