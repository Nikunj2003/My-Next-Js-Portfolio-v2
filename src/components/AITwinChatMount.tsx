"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useCompanionState } from "@/lib/guide/companion-store";

const AITwinChat = dynamic(() => import("@/components/AITwinChat"), { ssr: false });

/**
 * Loads the full conversation panel the first time it is opened, not on every
 * page load. Once loaded it stays mounted, so closing and reopening keeps its
 * state and its exit animation.
 */
export default function AITwinChatMount() {
  const { panelOpen } = useCompanionState();
  const [wanted, setWanted] = useState(panelOpen);
  if (panelOpen && !wanted) setWanted(true);
  return wanted ? <AITwinChat /> : null;
}
