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

/**
 * One request in flight for every consumer: five components mount this hook
 * on load, and each used to send its own GET. A failed check ("unknown") is
 * remembered briefly too, so remounts don't retry it in a loop.
 */
let inFlight: Promise<ChatAvailabilityStatus> | null = null;
let unknownUntil = 0;
const UNKNOWN_RETRY_MS = 15_000;

function checkAvailability(): Promise<ChatAvailabilityStatus> {
  if (Date.now() < unknownUntil) return Promise.resolve("unknown");
  inFlight ??= (async (): Promise<ChatAvailabilityStatus> => {
    try {
      const response = await fetch(CHAT_ENDPOINT, { method: "GET", cache: "no-store", redirect: "error" });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as Partial<ChatAvailabilityResponse>;
      const available = data.available === true;
      availabilityCache = { available, checkedAt: Date.now() };
      return available ? "available" : "unavailable";
    } catch {
      unknownUntil = Date.now() + UNKNOWN_RETRY_MS;
      return "unknown";
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
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
    const result = await checkAvailability();
    if (signal?.aborted) return;
    setStatus(result);
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
