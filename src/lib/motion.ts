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

export function revealInitial(shouldReduceMotion: boolean | null, axis: Axis = "y", offset = REVEAL_OFFSET) {
  if (shouldReduceMotion) return { opacity: 0 };
  return { opacity: 0, [axis]: offset };
}

export function revealAnimate(axis: Axis = "y") {
  return { opacity: 1, [axis]: 0 };
}
