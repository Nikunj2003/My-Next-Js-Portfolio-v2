"use client";

import { useSyncExternalStore } from "react";
import { getGuideView, getServerGuideView, subscribeGuide } from "@/lib/guide/store";

/** The guide's current expression and caption. */
export function useGuideView() {
  return useSyncExternalStore(subscribeGuide, getGuideView, getServerGuideView);
}
