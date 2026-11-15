import type { GuideEvent } from "@/lib/guide/types";

/**
 * A single window event that anything on the page can use to drive the guide.
 *
 * Kept as a DOM event (the same pattern as `open-ai-twin`) so the chat panel,
 * the tour and section observers stay decoupled from the avatar and from each
 * other. Safe to call during SSR; it does nothing there.
 */
export const GUIDE_EVENT = "guide:event";

export function emitGuide(event: GuideEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<GuideEvent>(GUIDE_EVENT, { detail: event }));
}

export function onGuide(handler: (event: GuideEvent) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (raw: Event) => {
    const detail = (raw as CustomEvent<GuideEvent>).detail;
    if (detail && typeof detail === "object" && typeof detail.type === "string") handler(detail);
  };
  window.addEventListener(GUIDE_EVENT, listener);
  return () => window.removeEventListener(GUIDE_EVENT, listener);
}
