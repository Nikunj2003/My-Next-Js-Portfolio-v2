"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useCompanionSelector } from "@/lib/guide/companion-store";

const NexChat = dynamic(() => import("@/components/NexChat"), { ssr: false });

/**
 * Loads the full conversation panel the first time it is opened, not on every
 * page load. Once loaded it stays mounted, so closing and reopening keeps its
 * state and its exit animation.
 */
export default function NexChatMount() {
  const panelOpen = useCompanionSelector((s) => s.panelOpen);
  const [wanted, setWanted] = useState(panelOpen);
  if (panelOpen && !wanted) setWanted(true);
  return wanted ? <NexChat /> : null;
}
