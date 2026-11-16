import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const mobileQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia(mobileQuery);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(mobileQuery).matches;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * A touch screen with no hover: phones and tablets, either way up. They
 * scroll natively, so the guide is anchored to the page there instead of
 * being moved from the main thread (`GuideCompanion`).
 */
const touchQuery = "(hover: none) and (pointer: coarse)";

function subscribeTouch(callback: () => void) {
  const mediaQuery = window.matchMedia(touchQuery);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

export function useTouchScreen() {
  return React.useSyncExternalStore(subscribeTouch, () => window.matchMedia(touchQuery).matches, () => false);
}
