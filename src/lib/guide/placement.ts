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
    // The side that covers the least of what is being read. Preference order
    // only breaks near-ties (within a tenth of the bubble's own area), so a
    // preferred side covering a paragraph never beats a free one beside it.
    const slack = bubble.width * Math.min(bubble.height, bubbleMaxHeight(viewport)) * 0.1;
    let best = fitting[0];
    let bestCovered = covered(best);
    for (const side of fitting.slice(1)) {
      if (bestCovered === 0) break;
      const area = covered(side);
      if (area + slack < bestCovered) {
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

/**
 * The spot under a sticky intro panel, as one continuous function of the
 * panel's position, so the path is the same scrolling down and up and never
 * reverses:
 * - Height: the resting height under the pinned panel (`pinnedBottom + gap`),
 *   or higher once the panel scrolls away at the end of the section (it rides
 *   up with it). It never dips to the screen bottom while the panel arrives.
 * - Across: it waits in the margin while the panel arrives, then slides in
 *   under it over the last `range` px of the panel's approach.
 * With no margin (narrower screens) it just waits at the resting spot.
 */
export function underPanelPoint(input: {
  panelLeft: number;
  panelBottom: number;
  /** Where the panel's bottom sits once pinned (sticky top + its height). */
  pinnedBottom: number;
  /** The margin's x, or null when there is no margin. */
  gutterX: number | null;
  gap?: number;
  inset?: number;
  range?: number;
}): Point {
  const { panelLeft, panelBottom, pinnedBottom, gutterX, gap = 24, inset = 20, range = 280 } = input;
  const restY = pinnedBottom + gap;
  const y = Math.min(panelBottom + gap, restY);
  const spotX = panelLeft + inset;
  if (gutterX === null) return { x: spotX, y };
  const k = clamp(1 - (panelBottom - pinnedBottom) / range, 0, 1);
  return { x: gutterX + (spotX - gutterX) * easeInOutCubic(k), y };
}

/**
 * The hero hand-off as a pure function of one number, `t`: 0 = the big hero
 * avatar is the guide, 1 = the small companion is, sitting at its spot.
 *
 * `t` comes straight from the scroll position (no smoothing, no timer), so the
 * same scroll position always draws the same frame. Stopping mid-way leaves it
 * mid-way, and scrolling back plays exactly the same frames in reverse.
 *
 * One continuous motion: the avatar leaves the hero, shrinking as it goes,
 * and lands on its spot at its own size. The big hero avatar and the small
 * companion are drawn as the same disc (same centre, same face size) while
 * they cross-fade over the first 45%, so it reads as one character
 * moving, not one fading out and another appearing. Every output is
 * monotonic in `t`, so the motion never reverses.
 */
/** The share of the hand-off spent cross-fading the two avatars. */
export const FADE_SHARE = 0.45;

export function heroHandoffFrame(input: {
  t: number;
  /** The hero avatar's centre and diameter, as laid out (untransformed). */
  heroCentre: Point;
  heroDiameter: number;
  /** The companion's size and its spot's top-left. */
  size: number;
  spot: Point;
  /** The face's share of each avatar's box, to match faces rather than boxes. */
  heroFace?: number;
  companionFace?: number;
}) {
  const { heroCentre, heroDiameter, size, spot, heroFace = 0.82, companionFace = 0.76 } = input;
  const t = clamp(input.t, 0, 1);

  // Path and size share one eased progress, so the small one shrinks as it
  // travels and arrives at full size exactly on its spot (no growing in place,
  // no shrinking after it has landed).
  const u = easeInOutCubic(t);
  const startScale = (heroDiameter * heroFace) / (size * companionFace);
  const companionScale = startScale + (1 - startScale) * u;

  // The big one is drawn at the small one's size and place as long as it is
  // visible, so the two are one disc while they cross-fade. It fades out over
  // the first part and the small one fades in over the same stretch.
  // Over the first 45%: long enough to read as one face turning into the
  // other at a normal scroll speed (a quarter was over in about 70ms).
  const swap = clamp(t / FADE_SHARE, 0, 1);
  const companionOpacity = easeInOutCubic(swap);
  const heroOpacity = 1 - companionOpacity;

  // Path: from the hero's centre to the spot, on a quadratic curve whose
  // control point is at the start's x and the spot's y, so it moves to the
  // spot's height first, then across. Both coordinates move one way only.
  const from = { x: heroCentre.x - size / 2, y: heroCentre.y - size / 2 };
  const control = { x: from.x, y: spot.y };
  const position = {
    x: (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * control.x + u * u * spot.x,
    y: (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * control.y + u * u * spot.y,
  };

  // The hero follows the small one while it is still visible: the same
  // centre offset and the same face size, so they never separate.
  const centre = { x: position.x + size / 2, y: position.y + size / 2 };
  const heroScale = (size * companionScale * companionFace) / (heroDiameter * heroFace);
  const heroOffset = { x: centre.x - heroCentre.x, y: centre.y - heroCentre.y };
  return { heroScale, heroOpacity, heroOffset, companionScale, companionOpacity, position };
}

/**
 * How far the hand-off has got, from the hero avatar's position on screen: 0
 * while its top is below `start` (just under the navbar), 1 once it has
 * scrolled `distance` px further up. A plain linear map of the scroll.
 */
export function heroHandoffProgress(heroTop: number, start: number, distance: number) {
  return clamp((start - heroTop) / Math.max(1, distance), 0, 1);
}

/**
 * The trip between pages, as a pure function of `t` (0 = where the avatar was
 * on the page it left, 1 = its spot on the new page). One hop: it eases along
 * the straight line while lifting on an arc above it (higher for longer
 * trips), and squashes a little at the top of the hop. `fromScale` and
 * `toScale` let it start as the big hero avatar or end as it.
 */
export function routeTravelFrame(input: { t: number; from: Point; to: Point; fromScale?: number; toScale?: number }) {
  const { from, to, fromScale = 1, toScale = 1 } = input;
  const u = easeInOutCubic(input.t);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const hop = distance < 24 ? 0 : Math.min(140, 36 + distance * 0.18);
  const lift = hop * 4 * u * (1 - u);
  const squash = 1 + 0.06 * Math.sin(Math.PI * u);
  return {
    position: { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u - lift },
    scale: (fromScale + (toScale - fromScale) * u) * squash,
  };
}

/** How long the trip between pages takes: longer for longer trips, within limits. */
export function routeTravelMs(from: Point, to: Point) {
  return Math.round(620 + Math.min(320, Math.hypot(to.x - from.x, to.y - from.y) * 0.3));
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
