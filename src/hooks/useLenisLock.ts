"use client";

import { useEffect } from "react";
/**
 * Prevents Lenis from consuming the page scroll while an overlay is open.
 *
 * Lenis binds a wheel listener to `window` and scrolls the document itself, so
 * Radix setting `overflow: hidden` on the body does not stop it — the page kept
 * moving behind an open dialog.
 *
 * `lenis.stop()` is NOT the fix: when stopped, Lenis still calls
 * preventDefault() on every wheel event and returns early (see its
 * onVirtualScroll), which kills scrolling *everywhere* — including inside the
 * dialog. That is why the list would not scroll either.
 *
 * The correct mechanism is Lenis's own `data-lenis-prevent`: it walks the
 * event's composedPath and bails out entirely if any node carries the
 * attribute, leaving that element to scroll natively. Applying it to `body`
 * covers every portalled overlay, since portals mount inside body.
 *
 * Reference-counted, because more than one overlay can be open at once (the
 * palette over the AI Twin) and the first to close must not release the lock.
 */
let lockCount = 0;

const PREVENT_ATTRIBUTE = "data-lenis-prevent";

export function useLenisLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    lockCount += 1;
    if (lockCount === 1) {
      document.body.setAttribute(PREVENT_ATTRIBUTE, "");
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.removeAttribute(PREVENT_ATTRIBUTE);
      }
    };
  }, [active]);
}
