"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CHAT_AVAILABILITY_CACHE_MS,
  CHAT_ENDPOINT,
  type ChatAvailabilityResponse,
} from "@/lib/chat-contract";

type ChatAvailabilityStatus = "checking" | "available" | "unavailable" | "unknown";

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
      const response = await fetch(CHAT_ENDPOINT, {
        method: "GET",
        cache: "no-store",
        redirect: "error",
        signal,
      });

      if (!response.ok) {
        setStatus("unknown");
        return;
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

      setStatus("unknown");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void refresh(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [refresh]);

  return {
    status,
    isAvailable: status === "available",
    canAttemptChat: status !== "unavailable",
    refresh,
  };
}
