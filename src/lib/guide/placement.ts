import type { SectionAnchor } from "@/lib/guide/anchors";

/**
 * Pure placement math for the scroll companion and its bubble. Everything is
 * in viewport pixels so it can be unit-tested without a DOM.
 */

export type Rect = { left: number; top: number; width: number; height: number };

export type DockInput = {
  viewportWidth: number;
  viewportHeight: number;
  /** Left and right edges of the page's content column. */
  content: { left: number; right: number };
  size: number;
  /** The section anchor in view, or null (other routes, panel open, tour). */
  anchor: SectionAnchor | null;
  /** Space reserved at the top (navbar + safe area) and bottom (safe area). */
  insetTop: number;
  insetBottom: number;
  /** Top of the footer in viewport pixels, when it is on screen. */
  footerTop?: number | null;
};

export type BubbleSide = "left" | "right" | "top" | "bottom";

export type Dock = {
  /** perch: sitting on or under a section's own furniture; gutter: side margin; corner: bottom-right. */
  mode: "perch" | "gutter" | "corner";
  x: number;
  y: number;
  side: "left" | "right";
  /** Sides the bubble should try, in order. */
  prefer: BubbleSide[];
  /** For top/bottom bubbles: line the bubble's left edge up with the avatar (start) or its right edge (end). */
  align: "start" | "end";
};

const MARGIN = 12;
const CORNER_INSET = 20;

/**
 * Where the companion sits. In the side gutter beside the section in view when
 * there is room for it (wide screens), otherwise the bottom-right corner,
 * lifted above the footer so it never covers the footer links.
 */
export function computeDock(input: DockInput): Dock {
  const { viewportWidth: vw, viewportHeight: vh, content, size, anchor, insetTop, insetBottom } = input;
  if (anchor) {
    const gutter = anchor.side === "left" ? content.left : vw - content.right;
    if (gutter >= size + MARGIN * 2) {
      const centerX = anchor.side === "left" ? gutter / 2 : vw - gutter / 2;
      const yMin = insetTop + MARGIN;
      const yMax = vh - insetBottom - size - MARGIN;
      const y = clamp(vh * anchor.yRatio - size / 2, yMin, yMax);
      return {
        mode: "gutter",
        x: Math.round(centerX - size / 2),
        y: Math.round(y),
        side: anchor.side,
        prefer: anchor.side === "left" ? ["right", "top", "bottom"] : ["left", "top", "bottom"],
        align: anchor.side === "left" ? "start" : "end",
      };
    }
  }
  const footerTop = input.footerTop ?? null;
  const lift = footerTop !== null && footerTop < vh ? vh - footerTop + MARGIN : 0;
  return {
    mode: "corner",
    x: vw - size - CORNER_INSET,
    y: Math.max(insetTop + MARGIN, vh - insetBottom - size - CORNER_INSET - lift),
    side: "right",
    prefer: ["left", "top"],
    align: "end",
  };
}

/** Rects measured from the section in view, in viewport pixels. */
export type Perches = {
  /** A sticky intro panel the companion can sit under (About, Experience, Skills). */
  under?: Rect | null;
  /**
   * Narrow sticky column (a case study's table of contents): sit in the empty
   * space under it; the bubble opens upward over the table of contents.
   */
  underNarrow?: Rect | null;
  /** A left-aligned page header: sit in the empty space at its right end. */
  headerRight?: Rect | null;
  /** A centred header with free space on its left (Work). */
  beside?: Rect | null;
  /** A card whose top edge the companion can perch on (AI Twin, Contact). */
  onTop?: Rect | null;
  /** The hero avatar: the companion sits at its lower left, bubble opening over the avatar. */
  hero?: Rect | null;
};

/**
 * Where the companion sits for the section in view. It prefers the section's
 * own free space: under the sticky intro panel, beside a centred header, or
 * perched on the top edge of a card. Each spot is only used while it is fully
 * on screen; otherwise it falls back to the side gutter, then the corner.
 */
export function pickSpot(input: DockInput & { perches: Perches }): Dock {
  const { viewportHeight: vh, size, insetTop, perches } = input;
  const fits = (y: number) => y >= insetTop + MARGIN && y + size <= vh - MARGIN;

  const hero = perches.hero;
  if (hero && hero.height > 0) {
    // Stand at the hero avatar's lower-left; the bubble covers the avatar
    // (it is the same character) rather than the name, stats or buttons.
    const y = hero.top + hero.height - size;
    if (fits(y)) {
      return { mode: "perch", x: Math.round(hero.left - size / 2), y: Math.round(y), side: "left", prefer: ["right", "top"], align: "end" };
    }
  }

  const narrow = perches.underNarrow;
  if (narrow && narrow.height > 0) {
    const y = narrow.top + narrow.height + 24;
    if (fits(y)) {
      // The column is narrower than the bubble, so the bubble opens upward
      // over the table of contents (which is just navigation) rather than
      // down or sideways across the article text.
      return { mode: "perch", x: Math.round(narrow.left + 20), y: Math.round(y), side: "left", prefer: ["top", "bottom", "right"], align: "start" };
    }
  }

  const headerRight = perches.headerRight;
  if (headerRight && headerRight.height > 0) {
    const y = headerRight.top + headerRight.height / 2 - size / 2;
    if (fits(y)) {
      const x = headerRight.left + headerRight.width - size - 24;
      return { mode: "perch", x: Math.round(x), y: Math.round(y), side: "right", prefer: ["left", "bottom"], align: "end" };
    }
  }

  const under = perches.under;
  if (under && under.height > 0) {
    const y = under.top + under.height + 24;
    if (fits(y)) {
      return { mode: "perch", x: Math.round(under.left + 20), y: Math.round(y), side: "left", prefer: ["bottom", "top", "right"], align: "start" };
    }
  }

  const beside = perches.beside;
  if (beside && beside.height > 0) {
    const y = beside.top + beside.height / 2 - size / 2;
    if (fits(y)) {
      return { mode: "perch", x: Math.round(beside.left + 40), y: Math.round(y), side: "left", prefer: ["bottom", "top", "right"], align: "start" };
    }
  }

  const onTop = perches.onTop;
  if (onTop && onTop.height > 0) {
    const y = onTop.top - size * 0.62;
    if (fits(y)) {
      return { mode: "perch", x: Math.round(onTop.left + 28), y: Math.round(y), side: "left", prefer: ["top", "right", "bottom"], align: "start" };
    }
  }

  return computeDock(input);
}

export type BubbleInput = {
  anchor: Rect;
  bubble: { width: number; height: number };
  viewport: { width: number; height: number; insetTop: number; insetBottom: number };
  prefer: BubbleSide[];
  /** Rectangles the bubble must not cover. */
  avoid?: Rect[];
  gap?: number;
  align?: "start" | "end";
};

export type BubblePlacement = { side: BubbleSide; left: number; top: number };

/**
 * Puts the bubble next to the avatar on the first preferred side where it
 * fits on screen without covering anything it must avoid, clamped along the
 * other axis. If no side fits cleanly, the one with the least overflow wins.
 */
export function placeBubble({ anchor, bubble, viewport, prefer, avoid = [], gap = 12, align = "end" }: BubbleInput): BubblePlacement {
  const minTop = viewport.insetTop + 8;
  const maxBottom = viewport.height - viewport.insetBottom - 8;
  const candidates = prefer.map((side) => {
    let left: number;
    let top: number;
    if (side === "left" || side === "right") {
      left = side === "left" ? anchor.left - gap - bubble.width : anchor.left + anchor.width + gap;
      top = clamp(anchor.top + anchor.height - bubble.height, minTop, maxBottom - bubble.height);
    } else {
      top = side === "top" ? anchor.top - gap - bubble.height : anchor.top + anchor.height + gap;
      const preferred = align === "start" ? anchor.left - 8 : anchor.left + anchor.width - bubble.width;
      left = clamp(preferred, 8, viewport.width - 8 - bubble.width);
    }
    const rect = { left, top, width: bubble.width, height: bubble.height };
    const overflow =
      Math.max(0, 8 - left) +
      Math.max(0, left + bubble.width - (viewport.width - 8)) +
      Math.max(0, minTop - top) +
      Math.max(0, top + bubble.height - maxBottom);
    const collides = avoid.some((other) => intersects(rect, inflate(other, 8)));
    return { side, left: Math.round(left), top: Math.round(top), score: overflow + (collides ? 10_000 : 0) };
  });
  const best = candidates.find((candidate) => candidate.score === 0) ?? [...candidates].sort((a, b) => a.score - b.score)[0];
  // Whatever wins, it is always pulled fully back on screen. Covering a little
  // text beats being cut off at the window edge.
  return {
    side: best.side,
    left: Math.round(clamp(best.left, 8, viewport.width - 8 - bubble.width)),
    top: Math.round(clamp(best.top, minTop, maxBottom - bubble.height)),
  };
}

function intersects(a: Rect, b: Rect) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

function inflate(rect: Rect, by: number): Rect {
  return { left: rect.left - by, top: rect.top - by, width: rect.width + by * 2, height: rect.height + by * 2 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
