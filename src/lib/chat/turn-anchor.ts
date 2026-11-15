/**
 * Pure math for "latest question at the top, answer streams below it".
 *
 * On send, the new user message is scrolled to the top of the scroller once.
 * Right after sending there isn't enough content below it to scroll that far,
 * so a spacer after the answer reserves the missing height; it shrinks as the
 * answer grows and disappears once the answer fills the view. Nothing scrolls
 * per token. Pattern from assistant-ui's `turnAnchor="top"`.
 */

/**
 * Where to scroll so the anchor sits `pad` px below the scroller's top.
 * Measured from bounding rects, not `offsetTop`: the chat scroller has a
 * transform and `contain`, which make `offsetParent` unreliable.
 */
export function anchorScrollTop(anchorRectTop: number, scrollerRectTop: number, scrollTop: number, pad = 16) {
  return Math.max(0, anchorRectTop - scrollerRectTop + scrollTop - pad);
}

/**
 * Spacer height needed so the scroller can reach `targetScrollTop`.
 *
 * `contentHeight` is the height of everything above the spacer, taken from the
 * spacer's own offset inside the scroller. Deriving it as `scrollHeight - spacer`
 * is wrong when the content is shorter than the scroller: `scrollHeight` is then
 * clamped to `clientHeight`, so the subtraction under-reports the content and the
 * first question never reaches the top (the short mobile sheet).
 */
export function computeReserve(opts: { targetScrollTop: number; clientHeight: number; contentHeight: number }) {
  return Math.max(0, Math.ceil(opts.targetScrollTop + opts.clientHeight - opts.contentHeight));
}

/** Content height above the spacer, from the spacer's rect and the scroller's (viewport coordinates). */
export function contentHeightAboveSpacer(opts: { spacerRectTop: number; scrollerRectTop: number; scrollTop: number }) {
  return Math.max(0, opts.spacerRectTop - opts.scrollerRectTop + opts.scrollTop);
}

/** Whether the scroller has reached the anchor target (within a pixel or two). */
export function reachedAnchor(scrollTop: number, target: number, tolerance = 2) {
  return Math.abs(scrollTop - target) <= tolerance;
}

/** Anchor once per turn: only when a new anchor id appears. */
export function shouldAnchor(previousId: string | null, nextId: string | null) {
  return nextId !== null && nextId !== previousId;
}

/** How far the real content extends below the view, ignoring the spacer. */
export function distanceToContentEnd(opts: { scrollTop: number; clientHeight: number; contentHeight: number }) {
  return opts.contentHeight - (opts.scrollTop + opts.clientHeight);
}
