"use client";

import { useSyncExternalStore } from "react";
import { PET_LINES } from "@/lib/guide/hero-lines";

/**
 * The line Nex is saying right now, shared by every place that shows it (the
 * hero's caption band, the footer's line above the landed Nex). One Nex, one
 * voice: whichever surface is on screen shows the same line.
 */
let spoken: string | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let petStreak = 0;
const listeners = new Set<() => void>();

function set(next: string | null) {
  if (spoken === next) return;
  spoken = next;
  listeners.forEach((listener) => listener());
}

/** Say a line for `ms`, replacing whatever was being said. */
export function say(text: string, ms = 3200) {
  set(text);
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => set(null), ms);
}

export function getSpoken() {
  return spoken;
}

/** The next line of the click streak (cycles through `PET_LINES`). */
export function sayPetLine() {
  petStreak = (petStreak % PET_LINES.length) + 1;
  say(PET_LINES[petStreak - 1], 2200);
}

export function useSpoken() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => spoken,
    () => null
  );
}
