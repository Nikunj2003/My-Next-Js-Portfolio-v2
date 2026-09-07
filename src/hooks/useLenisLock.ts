"use client";

import { useEffect } from "react";

/**
 * Prevents the page from scrolling behind an open overlay, without changing how
 * scrolling *feels* anywhere else.
 *
 * Three approaches were tried; only the third is correct.
 *
 * 1. `overflow: hidden` on body — does nothing. Lenis binds its wheel listener
 *    to `window` and scrolls the document itself, so the page kept moving
 *    behind an open dialog.
 *
 * 2. Marking `body` with the Lenis prevent attribute — stops the page, but silently disables
 *    smooth scrolling site-wide while any overlay is open. Lenis builds
 *    `composedPath()` and slices it up to `rootElement`, which is
 *    `document.documentElement`; `body` sits *below* html in that path, so it
 *    survives the slice and matches on EVERY wheel event. Lenis then bails out
 *    entirely and the browser scrolls natively — which is why the page reverted
 *    to default scroll speed as soon as the AI Twin opened.
 *
 * 3. `lenis.isLocked` — the actual fix. When locked, Lenis calls
 *    preventDefault() and returns early, so the page cannot move, but it stays
 *    running and keeps its easing and multipliers configured. Critically,
 *    Lenis checks the prevent attribute BEFORE the lock, so each overlay's own
 *    marked scroll pane (the chat log, the palette list) still scrolls
 *    natively at full speed.
 *
 * Note stopping Lenis is NOT interchangeable with this: stopped and locked take
 * the same early-return branch, but stopping also halts the animation loop, so
 * the first scroll after closing jumps instead of easing.
 *
 * Reference-counted, because more than one overlay can be open at once (the
 * palette over the AI Twin) and the first to close must not release the lock.
 */
let lockCount = 0;

type LenisLike = { isLocked: boolean };
type LenisWindow = Window & { __lenis?: LenisLike };

function getLenis(): LenisLike | undefined {
  return (window as LenisWindow).__lenis;
}

export function useLenisLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    lockCount += 1;
    if (lockCount === 1) {
      const lenis = getLenis();
      if (lenis) lenis.isLocked = true;
    }

    return () => {
      // Guard on the PREVIOUS count, not the clamped result. `Math.max(0, …)`
      // alone means a stray release while already at zero still satisfies
      // `=== 0` and re-runs the unlock — harmless for a boolean, but it would
      // silently unlock the page if another overlay were open and the counter
      // had drifted.
      if (lockCount === 0) return;

      lockCount -= 1;
      if (lockCount === 0) {
        const lenis = getLenis();
        if (lenis) lenis.isLocked = false;
      }
    };
  }, [active]);
}
