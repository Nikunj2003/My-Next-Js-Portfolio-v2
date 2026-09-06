"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion } from "framer-motion";

type LenisLike = {
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
};

type LenisWindow = Window & typeof globalThis & { __lenis?: LenisLike };

/**
 * Reading-progress bar for the whole site.
 *
 * Measures document scroll rather than one article element, so it works on every
 * route. Previously this lived inside `CaseStudyToc`, which meant it only existed
 * on case-study pages and was tied to `#case-study-article`.
 *
 * Driven by a motion value and `scaleX` on a transform — never an animated
 * `width`, which would lay out on every frame.
 */
const ScrollProgress = () => {
  const progress = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      frameRef.current = null;

      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;

      // A page shorter than the viewport has nothing to track; showing a full
      // bar there would imply the reader had finished something unscrollable.
      progress.set(scrollable <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / scrollable)));
    };

    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    update();

    /**
     * Lenis animates scroll in its own rAF loop and writes to the document
     * coarsely, so the native `scroll` event makes the bar jump to position after
     * scrolling stops instead of tracking it. Subscribing to Lenis's per-frame
     * event is what makes it continuous.
     *
     * Lenis is created by an ancestor (`SmoothScroll`), and React runs child
     * effects before parent effects — so on a fresh page load `window.__lenis`
     * may not exist yet. Rather than silently falling back to the coarse native
     * path forever, poll briefly for it and upgrade when it appears. Under
     * `prefers-reduced-motion` Lenis is never created and the native listener is
     * the correct permanent path.
     */
    let lenis: LenisLike | undefined;
    let attachTimer: number | null = null;
    let attempts = 0;

    const attachNative = () => {
      window.addEventListener("scroll", schedule, { passive: true });
    };

    const tryAttachLenis = () => {
      attachTimer = null;
      lenis = (window as LenisWindow).__lenis;

      if (lenis) {
        lenis.on("scroll", update);
        update();
        return;
      }

      // ~10 frames is long enough for the parent effect to have run.
      if (attempts < 10) {
        attempts += 1;
        attachTimer = window.requestAnimationFrame(tryAttachLenis);
        return;
      }

      attachNative();
    };

    if (shouldReduceMotion) {
      attachNative();
    } else {
      tryAttachLenis();
    }

    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      if (attachTimer !== null) window.cancelAnimationFrame(attachTimer);
      if (lenis) {
        lenis.off("scroll", update);
      } else {
        window.removeEventListener("scroll", schedule);
      }
      window.removeEventListener("resize", schedule);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [progress, shouldReduceMotion]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[95] h-0.5 bg-transparent" aria-hidden="true">
      <motion.div
        className="h-full origin-left bg-gradient-to-r from-primary to-accent"
        style={{ scaleX: progress }}
      />
    </div>
  );
};

export default ScrollProgress;
