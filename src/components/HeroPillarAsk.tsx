"use client";

import type { ReactNode } from "react";
import { openNex } from "@/lib/ask-nex";

/** A pillar card that asks Nex instead of linking (the pillar has no single study). */
export function HeroPillarAsk({ prompt, className, children }: { prompt: string; className: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => openNex(prompt)}
      className={className}
    >
      {children}
    </button>
  );
}
