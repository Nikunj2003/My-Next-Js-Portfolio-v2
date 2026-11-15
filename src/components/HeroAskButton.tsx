"use client";

import { MessageCircle } from "lucide-react";
import { openNex } from "@/lib/ask-nex";

/**
 * "Ask Nex" for screens without the hero avatar (below lg). On desktop the
 * avatar beside the copy carries its own "Ask Nex", so this one hides there
 * rather than doubling it. Opens the ask box, as the avatar's does.
 */
export function HeroAskButton() {
  return (
    <button
      type="button"
      onClick={() => openNex("")}
      className="btn-cta-secondary w-full sm:w-auto lg:hidden"
    >
      <MessageCircle className="h-4 w-4 text-primary" />
      Ask Nex
    </button>
  );
}
