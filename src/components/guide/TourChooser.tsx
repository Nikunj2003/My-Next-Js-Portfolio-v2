"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { VISITOR_IDS, VISITOR_PATHS, type VisitorId } from "@/lib/guide/paths";
import { readGuidePrefs } from "@/lib/guide/prefs";
import { startGuideTour } from "@/lib/guide/tour-control";

/** One duration and curve for opening, closing and the scroll that follows. */
const MOTION_S = 0.42;
const EASE = [0.22, 1, 0.36, 1] as const;

type LenisWindow = Window & { __lenis?: { scrollTo: (y: number, options?: object) => void } };

/** One eased scroll, through Lenis when it is there. */
function scrollPageTo(top: number, reduceMotion: boolean) {
  const target = Math.max(0, Math.round(top));
  if (Math.abs(target - window.scrollY) < 2) return;
  const lenis = (window as LenisWindow).__lenis;
  if (lenis) lenis.scrollTo(target, { duration: reduceMotion ? 0 : 0.6, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
  else window.scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
}

/**
 * Which tour to take: the 60-second tour, or a path for the reader's role.
 * In the page flow, opened by "Take a tour" (hero, /work).
 *
 * It opens by growing to its measured height, so what follows slides down
 * smoothly, then scrolls the page once so the whole chooser is in view. It
 * closes the same way in reverse, and puts the page back where it was when it
 * opened (in the hero, that is the top). It stays mounted while closed, at
 * zero height and out of the tab order, so closing never cuts an animation
 * short by unmounting.
 */
export function TourChooser({ open, onClose, returnFocusTo }: { open: boolean; onClose: () => void; returnFocusTo?: () => HTMLElement | null }) {
  const reduceMotion = Boolean(useReducedMotion());
  const firstRef = useRef<HTMLButtonElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  // Where the page was when it opened, to go back to on close.
  const openedAtRef = useRef<number | null>(null);
  // The path last taken, read when it opens (prefs live on this device).
  const [last, setLast] = useState<VisitorId | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setLast(readGuidePrefs().visitor);
  }

  // The chooser's natural height, measured (it changes with the width).
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const measure = () => setHeight(Math.ceil(inner.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (open) {
      openedAtRef.current = window.scrollY;
      firstRef.current?.focus({ preventScroll: true });
      // Once it has grown: bring all of it into view, one scroll, no further than needed.
      const timer = window.setTimeout(() => {
        const box = outerRef.current?.getBoundingClientRect();
        if (!box) return;
        const overflow = box.top + (innerRef.current?.offsetHeight ?? box.height) - (window.innerHeight - 24);
        if (overflow > 0) scrollPageTo(window.scrollY + overflow, reduceMotion);
      }, reduceMotion ? 0 : MOTION_S * 1000 * 0.35);
      return () => window.clearTimeout(timer);
    }
    // Closing: back to where the page was when it opened, together with the collapse.
    const from = openedAtRef.current;
    openedAtRef.current = null;
    if (from !== null) scrollPageTo(from, reduceMotion);
  }, [open, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
      returnFocusTo?.()?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, returnFocusTo]);

  const pick = (id: VisitorId) => {
    // The tour scrolls the page itself; don't restore the old position under it.
    openedAtRef.current = null;
    onClose();
    startGuideTour(id);
  };

  return (
    <motion.div
      ref={outerRef}
      initial={false}
      animate={{ height: open ? height : 0, opacity: open ? 1 : 0 }}
      transition={{ height: { duration: reduceMotion ? 0 : MOTION_S, ease: EASE }, opacity: { duration: reduceMotion ? 0 : MOTION_S * 0.6, ease: "easeOut" } }}
      className="w-full max-w-3xl overflow-hidden"
      aria-hidden={!open}
      data-hero-expanded={open || undefined}
      // Closed: out of the tab order and the accessibility tree.
      inert={!open}
    >
      <div ref={innerRef} className="pt-[var(--hero-gap,1rem)]">
        <div role="group" aria-labelledby="tour-chooser-title" className="rounded-2xl border border-foreground/10 glass-subtle p-4 text-left shadow-accent-soft sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p id="tour-chooser-title" className="text-sm font-semibold text-foreground">
              Which tour? <span className="font-normal text-muted-foreground">Pick the one closest to why you&apos;re here.</span>
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                returnFocusTo?.()?.focus({ preventScroll: true });
              }}
              aria-label="Close tour choices"
              className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {VISITOR_IDS.map((id, i) => {
              const path = VISITOR_PATHS[id];
              const chosen = id === (last ?? "default");
              return (
                <li key={id} className={i === 0 ? "sm:col-span-2 lg:col-span-1" : undefined}>
                  <button
                    ref={i === 0 ? firstRef : undefined}
                    type="button"
                    onClick={() => pick(id)}
                    className={
                      "group flex h-full w-full flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
                      (chosen ? "border-primary/40 bg-primary/[0.08]" : "border-foreground/10 hover:border-primary/35 hover:bg-primary/[0.05]")
                    }
                  >
                    <span className="flex items-start justify-between gap-2 text-sm font-semibold leading-snug text-foreground">
                      {id === "default" ? "60-second tour" : path.label}
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-text opacity-60 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">{path.blurb}</span>
                    <span className="mt-auto pt-1 text-[11px] text-muted-foreground/80">{path.steps.length} stops</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
