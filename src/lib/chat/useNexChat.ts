"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getServerNexChatSnapshot, getNexChatSnapshot, hydrateNexChat, subscribeNexChat } from "@/lib/chat/nex-chat-store";

/** The shared Nex conversation. Restores history from this device on first use. */
export function useNexChat() {
  const snapshot = useSyncExternalStore(subscribeNexChat, getNexChatSnapshot, getServerNexChatSnapshot);
  useEffect(() => {
    hydrateNexChat();
  }, []);
  return snapshot;
}
