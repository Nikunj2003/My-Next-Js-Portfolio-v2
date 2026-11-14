/**
 * One reference-counted page scroll lock, shared by every overlay.
 *
 * With Lenis running it sets `lenis.isLocked` (not `stop()`, which halts the
 * easing loop, and never the Lenis prevent attribute on body, which disables
 * smooth scroll site-wide). That only stops wheel scrolling: touch scrolls
 * natively (`syncTouch: false`). So without Lenis (reduced motion, or before
 * it starts) or on a touch screen it also sets `overflow: hidden` on html and
 * body, saved once and restored once, so overlays closing in any order can't
 * leave the page stuck.
 *
 * SmoothScroll calls `reapplyScrollLock` after `lenis.start()`: Lenis's
 * internal reset clears `isLocked`, which let the page scroll behind an open
 * overlay after a tab switch.
 */
type LenisLike = { isLocked: boolean };
type LenisWindow = Window & { __lenis?: LenisLike };

let lockCount = 0;
let saved: { body: string; html: string } | null = null;

function getLenis(): LenisLike | undefined {
  return typeof window === "undefined" ? undefined : (window as LenisWindow).__lenis;
}

function apply(locked: boolean) {
  const lenis = getLenis();
  if (lenis) lenis.isLocked = locked;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (locked && (!lenis || touch) && !saved) {
    saved = { body: document.body.style.overflow, html: document.documentElement.style.overflow };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  if (!locked && saved) {
    document.body.style.overflow = saved.body;
    document.documentElement.style.overflow = saved.html;
    saved = null;
  }
}

export function acquireScrollLock() {
  lockCount += 1;
  if (lockCount === 1) apply(true);
}

export function releaseScrollLock() {
  // A stray release at zero must not unlock another overlay's lock.
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) apply(false);
}

/** Re-asserts the lock on the current Lenis instance (after start, or once it is created). */
export function reapplyScrollLock() {
  if (lockCount > 0) apply(true);
}

export function isScrollLocked() {
  return lockCount > 0;
}
