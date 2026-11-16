"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HostConversation, useInPageHost } from "@/components/guide/InPageAskHost";
import { useCompanionSelector } from "@/lib/guide/companion-store";
import { useSpoken } from "@/lib/guide/spoken";
import { NexRing } from "@/components/guide/NexRing";

/**
 * The footer's right-hand column: its links, or, once the visitor asks here,
 * the conversation in their place, beside the landed Nex. The links come back
 * when it closes. Same ask box as the hero's; one is mounted at a time
 * (`askHost`). Phones use the sheet, so the links stay.
 */
const footerAskButton = () => [...document.querySelectorAll<HTMLButtonElement>("footer button")].find((button) => button.textContent?.trim() === "Ask Nex") ?? null;

export function FooterAskHost({ children }: { children: ReactNode }) {
  const { open, close, hostRef, reduceMotion } = useInPageHost("footer", { fallbackFocus: footerAskButton });

  return (
    // Relative, and the chat fills it absolutely: the band keeps the height
    // its sign-off and Nex give it, so opening the chat never changes it.
    <div ref={hostRef} data-nex-host="footer" className="relative order-3 min-w-0 self-stretch md:justify-self-stretch">
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <HostConversation key="ask" host="footer" close={close} reduceMotion={reduceMotion} fill className="md:absolute md:inset-0" />
        ) : (
          <motion.div
            key="links"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
            className="flex h-full items-center md:justify-end"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * What Nex says, above its slot in the footer: the line it is saying right
 * now (a reaction to a click or hover), or a short prompt once it has landed.
 * Nothing before it arrives, so the slot never claims "Nex is here" when it
 * isn't. A reserved band, so nothing moves when it talks.
 */
export function FooterNexLine() {
  const landed = useCompanionSelector((s) => s.footerDocked);
  const line = useSpoken();
  const text = landed ? line ?? "Didn't find something? Ask me." : "";
  return (
    // A reserved band: the pill grows upward from its bottom edge, so the
    // slot below never moves when Nex says something longer.
    <div aria-live="off" className="relative h-14 w-full">
      <AnimatePresence initial={false}>
        {text && (
          <motion.p
            key={text}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 left-1/2 w-max max-w-[18rem] -translate-x-1/2 rounded-[1.25rem] border border-foreground/10 glass-subtle px-4 py-2 text-center text-[0.8125rem] leading-snug text-muted-foreground shadow-accent-soft"
            style={{ textWrap: "balance", transformOrigin: "50% 100%" }}
          >
            {text}
            {/* The tail, pointing down at Nex. */}
            <span aria-hidden="true" className="absolute -bottom-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-foreground/10 glass-subtle" />
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The footer slot's ring, a little outside the landed 150px disc; dim while the slot is empty. */
export function FooterRing() {
  const footerDocked = useCompanionSelector((s) => s.footerDocked);
  return <NexRing dim={!footerDocked} outset={12} className="transition-opacity duration-500" />;
}
