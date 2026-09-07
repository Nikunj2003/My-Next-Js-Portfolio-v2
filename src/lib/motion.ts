import type { Transition } from "framer-motion";

/**
 * Single source of truth for scroll-reveal motion.
 *
 * Before this existed the same fade-up was hand-copied across six section
 * components with four different durations and two of them silently falling
 * back to framer-motion's default easing. Import from here instead.
 */
export const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;
export const REVEAL_DURATION = 0.6;
export const REVEAL_DURATION_REDUCED = 0.2;
export const REVEAL_OFFSET = 24;

/** Ceiling for staggered reveals, so a long list never animates seconds late. */
export const REVEAL_MAX_DELAY = 0.4;

export function clampRevealDelay(delay: number) {
  return Math.max(0, Math.min(delay, REVEAL_MAX_DELAY));
}

export function revealTransition(shouldReduceMotion: boolean | null, delay = 0): Transition {
  if (shouldReduceMotion) {
    return { duration: REVEAL_DURATION_REDUCED, delay: 0 };
  }

  return { duration: REVEAL_DURATION, delay: clampRevealDelay(delay), ease: REVEAL_EASE };
}

type Axis = "y" | "x";

/**
 * Slide only — deliberately no opacity fade.
 *
 * Backdrop blur only reads as glass once the element is opaque enough to have a
 * visible fill, so fading a glass surface in from `opacity: 0` made it look
 * flat for the whole animation and then snap to glass at the end. With a 0.6s
 * duration plus up to 0.4s of stagger, that was a full second of every glass
 * panel on the page rendering wrong on load.
 *
 * The slide alone still reads as an entrance, and the surface is correct from
 * the first frame. Reduced motion has nothing left to animate, so it renders
 * final state immediately, which is the right outcome there anyway.
 */
export function revealInitial(shouldReduceMotion: boolean | null, axis: Axis = "y", offset = REVEAL_OFFSET) {
  if (shouldReduceMotion) return {};
  return { [axis]: offset };
}

export function revealAnimate(axis: Axis = "y") {
  return { [axis]: 0 };
}
