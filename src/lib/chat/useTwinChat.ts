"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getServerTwinChatSnapshot, getTwinChatSnapshot, hydrateTwinChat, subscribeTwinChat } from "@/lib/chat/twin-chat-store";

/** The shared AI Twin conversation. Restores history from this device on first use. */
export function useTwinChat() {
  const snapshot = useSyncExternalStore(subscribeTwinChat, getTwinChatSnapshot, getServerTwinChatSnapshot);
  useEffect(() => {
    hydrateTwinChat();
  }, []);
  return snapshot;
}
