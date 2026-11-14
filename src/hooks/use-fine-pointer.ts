import { useSyncExternalStore } from "react";

const QUERY = "(hover: hover) and (pointer: fine)";

// One MediaQueryList shared by every card, not one listener per instance.
let query: MediaQueryList | null = null;
const getQuery = () => (query ??= window.matchMedia(QUERY));

function subscribe(callback: () => void) {
  const list = getQuery();
  list.addEventListener("change", callback);
  return () => list.removeEventListener("change", callback);
}

/** True on devices with a precise hovering pointer (mouse, trackpad). False during SSR. */
export function useFinePointer() {
  return useSyncExternalStore(subscribe, () => getQuery().matches, () => false);
}
