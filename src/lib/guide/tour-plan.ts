/**
 * Where to scroll so a tour target is fully visible and nothing covers it.
 *
 * The free area is the band between the navbar and the narrator strip at the
 * bottom. A target that already fits there is left alone (no needless
 * scrolling); otherwise it is centred in the band, or top-aligned when it is
 * taller than the band, so its heading is what the visitor sees. Logic after
 * driver.js's `bringInView`, adapted for a fixed navbar and bottom narrator.
 */
export type TourScrollInput = {
  /** The target's box relative to the viewport, as it will sit (see resolveTargetBox). */
  box: { top: number; height: number };
  scrollY: number;
  viewportHeight: number;
  navbar: number;
  /** Height reserved at the bottom for the narrator. */
  reserve: number;
  gap?: number;
  maxScroll: number;
};

/** Absolute scroll position to go to, or null when the target is already in view. */
export function planTourScroll({ box, scrollY, viewportHeight, navbar, reserve, gap = 12, maxScroll }: TourScrollInput): number | null {
  const freeTop = navbar + gap;
  const freeBottom = viewportHeight - reserve - gap;
  const freeHeight = Math.max(0, freeBottom - freeTop);
  if (box.top >= freeTop && box.top + box.height <= freeBottom) return null;
  const desiredTop = box.height > freeHeight ? freeTop : freeTop + (freeHeight - box.height) / 2;
  const target = scrollY + box.top - desiredTop;
  return Math.round(Math.min(Math.max(target, 0), Math.max(0, maxScroll)));
}

type BoxSource = {
  getBoundingClientRect(): { top: number; height: number };
  parentElement: BoxSource | null;
};

/**
 * A target's box as it will sit when scrolled to. A `position: sticky` element
 * reports where it is stuck right now, which says nothing about where it lives
 * in the page, so its top is taken from the nearest non-sticky ancestor while
 * its height is its own.
 */
export function resolveTargetBox(element: BoxSource, isSticky: (node: BoxSource) => boolean) {
  const own = element.getBoundingClientRect();
  let node: BoxSource | null = element;
  while (node && isSticky(node)) node = node.parentElement;
  if (!node || node === element) return { top: own.top, height: own.height };
  return { top: node.getBoundingClientRect().top, height: own.height };
}
