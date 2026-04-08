"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CHAT_AVAILABILITY_CACHE_MS,
  type ChatAvailabilityResponse,
} from "@/lib/chat-contract";

type ChatAvailabilityStatus = "checking" | "available" | "unavailable";

type AvailabilityCache = {
  available: boolean;
  checkedAt: number;
};

let availabilityCache: AvailabilityCache | null = null;

function getCachedStatus(now = Date.now()): ChatAvailabilityStatus | null {
  if (!availabilityCache) {
    return null;
  }

  if (availabilityCache.checkedAt + CHAT_AVAILABILITY_CACHE_MS < now) {
    availabilityCache = null;
    return null;
  }

  return availabilityCache.available ? "available" : "unavailable";
}

export function useChatAvailability() {
  const [status, setStatus] = useState<ChatAvailabilityStatus>(() => {
    return getCachedStatus() ?? "checking";
  });

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const cachedStatus = getCachedStatus();
    if (cachedStatus) {
      setStatus(cachedStatus);
      return;
    }

    setStatus("checking");

    try {
      const response = await fetch("/api/chat", {
        method: "GET",
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error(`Chat availability request failed with ${response.status}`);
      }

      const data = (await response.json()) as Partial<ChatAvailabilityResponse>;
      const available = data.available === true;

      availabilityCache = {
        available,
        checkedAt: Date.now(),
      };

      setStatus(available ? "available" : "unavailable");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void refresh(controller.signal);

    return () => controller.abort();
  }, [refresh]);

  return {
    status,
    isAvailable: status === "available",
    refresh,
  };
}
