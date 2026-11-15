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
    // Hidden by a wrapper: `.btn-cta-secondary` sets its own display, which
    // overrode `lg:hidden` on the button itself and showed two "Ask Nex" on desktop.
    <span className="contents lg:hidden">
      <button type="button" onClick={() => openNex("")} className="btn-cta-secondary w-full sm:w-auto">
        <MessageCircle className="h-4 w-4 text-primary" />
        Ask Nex
      </button>
    </span>
  );
}
