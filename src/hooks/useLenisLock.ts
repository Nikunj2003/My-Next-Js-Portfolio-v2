"use client";

import { useEffect } from "react";
import { acquireScrollLock, releaseScrollLock } from "@/lib/scroll-lock";

/**
 * Prevents the page from scrolling behind an open overlay while `active`.
 * Reference-counted (the palette can open over Nex); the mechanism
 * lives in `lib/scroll-lock.ts`.
 */
export function useLenisLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    acquireScrollLock();
    return releaseScrollLock;
  }, [active]);
}
