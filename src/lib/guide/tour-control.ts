/**
 * Starts the guided tour from anywhere (hero CTA, guide stage, chat).
 * The tour UI listens for this event, so callers never import it.
 */
export const START_TOUR_EVENT = "guide:start-tour";

export function startGuideTour() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(START_TOUR_EVENT));
}
