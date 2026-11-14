/**
 * Pure geometry for the scroll companion and its bubble, in viewport pixels,
 * unit-tested without a DOM. The DOM side (which element a spot rides on, the
 * per-frame loop) lives in GuideCompanion.tsx.
 *
 * Why it is shaped like this (measured on the previous versions):
 * - A spot that rides on page content is read from that content every frame
 *   and applied in the same frame. Nothing chases it, so it can't lag or
 *   jitter at any scroll speed.
 * - Which spot a section uses depends only on the layout (viewport size,
 *   panel heights), never on the scroll position, so it can't flip back and
 *   forth while scrolling. Changing section starts one eased glide.
 * - The bubble's side is fixed per spot and only its position is clamped each
 *   frame, so it never swaps sides mid-scroll.
 */

export type Point = { x: number; y: number };
export type Viewport = { width: number; height: number; insetTop: number; insetBottom: number };
export type BubbleSide = "left" | "right" | "top" | "bottom";
export type Rect = { left: number; top: number; width: number; height: number };

const MARGIN = 12;
const EDGE = 8;

/** Keep the avatar on screen: below the navbar, above the bottom edge and the footer. */
export function clampToViewport(point: Point, size: number, viewport: Viewport, footerTop: number | null = null): Point {
  const minY = viewport.insetTop + MARGIN;
  let maxY = viewport.height - viewport.insetBottom - size - MARGIN;
  if (footerTop !== null && footerTop < viewport.height) maxY = Math.min(maxY, footerTop - size - MARGIN);
  return {
    x: clamp(point.x, MARGIN, viewport.width - size - MARGIN),
    y: clamp(point.y, minY, Math.max(minY, maxY)),
  };
}

/** The usable height for the bubble: the screen below the navbar. Fixed per viewport, so it never changes while scrolling. */
export function bubbleMaxHeight(viewport: Viewport) {
  return Math.max(160, Math.min(560, viewport.height - viewport.insetBottom - EDGE - (viewport.insetTop + EDGE)));
}

/**
 * The bubble beside the avatar on a given side. Left and right: bottom-aligned
 * with the avatar, clamped vertically. Top and bottom: lined up with the
 * avatar's left edge, clamped horizontally. Never resized here, so nothing
 * reflows while scrolling.
 */
export function placeBubbleBeside(
  anchor: Point,
  size: number,
  side: BubbleSide,
  bubble: { width: number; height: number },
  viewport: Viewport,
  gap = 12
): { left: number; top: number; maxHeight: number } {
  const minTop = viewport.insetTop + EDGE;
  const maxBottom = viewport.height - viewport.insetBottom - EDGE;
  const maxHeight = bubbleMaxHeight(viewport);
  const height = Math.min(bubble.height, maxHeight);
  let left: number;
  let top: number;
  if (side === "left" || side === "right") {
    left = side === "right" ? anchor.x + size + gap : anchor.x - gap - bubble.width;
    top = clamp(anchor.y + size - height, minTop, maxBottom - height);
  } else {
    top = side === "bottom" ? anchor.y + size + gap : anchor.y - gap - height;
    left = anchor.x - EDGE;
    top = clamp(top, minTop, maxBottom - height);
  }
  return { left: clamp(left, EDGE, viewport.width - EDGE - bubble.width), top, maxHeight };
}

/** How far the bubble on this side would run past the screen (0 when it fits). */
export function bubbleOverflow(anchor: Point, size: number, side: BubbleSide, bubble: { width: number; height: number }, viewport: Viewport, gap = 12) {
  const minTop = viewport.insetTop + EDGE;
  const maxBottom = viewport.height - viewport.insetBottom - EDGE;
  const height = Math.min(bubble.height, bubbleMaxHeight(viewport));
  if (side === "right") return Math.max(0, anchor.x + size + gap + bubble.width - (viewport.width - EDGE));
  if (side === "left") return Math.max(0, EDGE - (anchor.x - gap - bubble.width));
  if (side === "bottom") return Math.max(0, anchor.y + size + gap + height - maxBottom);
  return Math.max(0, minTop - (anchor.y - gap - height));
}

/**
 * Which side the bubble opens on. `current` is kept while it still fits (so
 * it never flips while the avatar moves). Otherwise, among the sides that fit,
 * the one that covers the least reading text (`avoid`), preferring earlier
 * sides; if none fits, the one that overflows least.
 */
export function chooseBubbleSide(
  anchor: Point,
  size: number,
  bubble: { width: number; height: number },
  viewport: Viewport,
  prefer: BubbleSide[],
  current: BubbleSide | null = null,
  avoid: Rect[] = [],
  gap = 12
): BubbleSide {
  const sides = [...prefer, ...(["right", "bottom", "top", "left"] as const).filter((side) => !prefer.includes(side))];
  const fits = (side: BubbleSide) => bubbleOverflow(anchor, size, side, bubble, viewport, gap) === 0;
  if (current && fits(current)) return current;
  const fitting = sides.filter(fits);
  // Among the sides that fit, the one covering the least reading text; ties
  // go to the earlier preference. A side covering nothing wins outright.
  const covered = (side: BubbleSide) => {
    const placed = placeBubbleBeside(anchor, size, side, bubble, viewport, gap);
    const rect = { left: placed.left, top: placed.top, width: bubble.width, height: Math.min(bubble.height, placed.maxHeight) };
    return avoid.reduce((sum, other) => sum + overlapArea(rect, other), 0);
  };
  if (fitting.length > 0) {
    let best = fitting[0];
    let bestCovered = covered(best);
    for (const side of fitting.slice(1)) {
      if (bestCovered === 0) break;
      const area = covered(side);
      // Only switch away from a preferred side for a clear improvement.
      if (area < bestCovered * 0.6) {
        best = side;
        bestCovered = area;
      }
    }
    return best;
  }
  return [...sides].sort((a, b) => bubbleOverflow(anchor, size, a, bubble, viewport, gap) - bubbleOverflow(anchor, size, b, bubble, viewport, gap))[0];
}

function overlapArea(a: Rect, b: Rect) {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Fixed spots that don't ride on content: the left margin, and the bottom-right corner. */
export function gutterPoint(contentLeft: number, size: number, viewport: Viewport, yRatio = 0.5): Point | null {
  if (contentLeft < size + MARGIN * 2) return null;
  return { x: contentLeft / 2 - size / 2, y: viewport.height * yRatio - size / 2 };
}

export function cornerPoint(size: number, viewport: Viewport): Point {
  return { x: viewport.width - size - 20, y: viewport.height - viewport.insetBottom - size - 20 };
}

/** Smooth start and stop, for the glide between spots. */
export function easeInOutCubic(t: number) {
  const clamped = clamp(t, 0, 1);
  return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

export function blendPoint(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/**
 * The section that owns the screen, with hysteresis: the current section keeps
 * it while it still spans the middle of the viewport, give or take a band, so
 * hovering a boundary never flips between two sections.
 */
export function activeSectionAt(
  sections: { id: string; top: number; bottom: number }[],
  viewportHeight: number,
  current: string | null,
  band = 0.08
): string | null {
  if (sections.length === 0) return null;
  const middle = viewportHeight / 2;
  const holding = sections.find((section) => section.id === current);
  if (holding && holding.top <= middle + viewportHeight * band && holding.bottom >= middle - viewportHeight * band) return current;
  const spanning = sections.find((section) => section.top <= middle && section.bottom >= middle);
  if (spanning) return spanning.id;
  const passed = sections.filter((section) => section.top <= middle);
  return passed.length > 0 ? passed[passed.length - 1].id : sections[0].id;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
