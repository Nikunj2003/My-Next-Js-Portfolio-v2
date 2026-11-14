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
 * `scrollHeight` includes the current spacer, so it is subtracted first; that
 * makes the result a fixed point (applying it and recomputing gives the same).
 */
export function computeReserve(opts: { targetScrollTop: number; clientHeight: number; scrollHeight: number; currentReserve: number }) {
  const content = opts.scrollHeight - opts.currentReserve;
  return Math.max(0, Math.ceil(opts.targetScrollTop + opts.clientHeight - content));
}

/** Anchor once per turn: only when a new anchor id appears. */
export function shouldAnchor(previousId: string | null, nextId: string | null) {
  return nextId !== null && nextId !== previousId;
}

/** How far the real content extends below the view, ignoring the spacer. */
export function distanceToContentEnd(opts: { scrollTop: number; clientHeight: number; scrollHeight: number; reserve: number }) {
  return opts.scrollHeight - opts.reserve - (opts.scrollTop + opts.clientHeight);
}
