"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useSpoken } from "@/lib/guide/spoken";
import { openAsk, useCompanionSelector } from "@/lib/guide/companion-store";
import { NexRing } from "@/components/guide/NexRing";

/** The socket's diameter: Nex rests here drawn at this size. */
export const ROUTE_SOCKET = 120;

/**
 * Nex's place in a page header (/work and every case study): a reserved
 * ring in the header's free column, the same motif as the hero and the
 * footer, with what Nex says under it. The one Nex rests here while the
 * header is on screen, then leaves for its reading spot as the visitor
 * scrolls. Desktop only; narrower screens keep the corner.
 */
export function RouteNexSocket({ prompt }: { prompt: string }) {
  const line = useSpoken();
  const companion = {
    companionVisible: useCompanionSelector((s) => s.companionVisible),
    bubble: useCompanionSelector((s) => s.bubble),
    askHost: useCompanionSelector((s) => s.askHost),
  };
  const text = companion.companionVisible ? line ?? prompt : "";
  return (
    <div className="hidden shrink-0 flex-col items-center gap-3 lg:flex" style={{ width: 15 * 16 }}>
      <span data-guide-route-socket className="relative block" style={{ width: ROUTE_SOCKET, height: ROUTE_SOCKET }}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,transparent_68%)]" />
        <NexRing dim={!companion.companionVisible} outset={10} className="transition-opacity duration-500" />
      </span>
      <p aria-live="off" className="flex min-h-11 items-start justify-center text-center text-[0.8125rem] leading-snug text-muted-foreground" style={{ textWrap: "balance" }}>
        <AnimatePresence mode="wait" initial={false}>
          {text && (
            <motion.span key={text} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {text}
            </motion.span>
          )}
        </AnimatePresence>
      </p>
      {/* The page's own Ask: opens the conversation in the row under the header
          (`page:header`), or moves it there when it is open further down. */}
      {!(companion.bubble === "ask" && companion.askHost === "page:header") && (
        <button
          type="button"
          onClick={() => openAsk(undefined, "page:header")}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.07] px-3 text-xs font-semibold text-primary-text transition-colors hover:border-primary/50 hover:bg-primary/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {companion.bubble === "ask" ? <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> : <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />}
          {companion.bubble === "ask" ? "Continue here" : "Ask Nex"}
        </button>
      )}
    </div>
  );
}
