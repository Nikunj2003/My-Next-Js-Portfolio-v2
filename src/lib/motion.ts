/**
 * Shared entrance timing for the hero, the one section that still animates
 * in. The other sections dropped their scroll reveals: they carry their own
 * motion (sticky panels, the card deck, the timeline), and a reveal per block
 * stacked on top of it was extra work on every scroll.
 */
export const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;
export const REVEAL_DURATION_REDUCED = 0.2;
export const REVEAL_OFFSET = 24;
