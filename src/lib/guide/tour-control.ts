import type { VisitorId } from "@/lib/guide/paths";

/**
 * Starts the guided tour from anywhere (hero CTA, guide stage, chat).
 * The tour UI listens for this event, so callers never import it. The
 * visitor path rides on the event, so a start that has to wait (the
 * companion still loading, a route change home) replays the same path.
 */
export const START_TOUR_EVENT = "guide:start-tour";

export type StartTourDetail = { pathId?: VisitorId };

export function startGuideTour(pathId?: VisitorId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<StartTourDetail>(START_TOUR_EVENT, { detail: { pathId } }));
}
