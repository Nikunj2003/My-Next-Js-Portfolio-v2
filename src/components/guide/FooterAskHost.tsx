"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AskContent } from "@/components/guide/AskContent";
import { dispatchCompanion, openPanel, takeAskOpener, useCompanionState } from "@/lib/guide/companion-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSpoken } from "@/lib/guide/spoken";

/**
 * The footer's right-hand column: its links, or, once the visitor asks here,
 * the conversation in their place, beside the landed Nex. The links come back
 * when it closes. Same ask box as the hero's; one is mounted at a time
 * (`askHost`). Phones use the sheet, so the links stay.
 */
export function FooterAskHost({ children }: { children: ReactNode }) {
  const companion = useCompanionState();
  const isMobile = useIsMobile();
  const reduceMotion = Boolean(useReducedMotion());
  const open = companion.bubble === "ask" && companion.askHost === "footer" && !isMobile;
  const openerRef = useRef<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = takeAskOpener();
    // Bring it into view once it has laid out (it opens below the band).
    const timer = window.setTimeout(() => {
      const box = hostRef.current?.getBoundingClientRect();
      if (!box) return;
      const overflow = box.bottom - (window.innerHeight - 24);
      if (overflow <= 0) return;
      const lenis = (window as Window & { __lenis?: { scrollTo: (y: number, options?: object) => void } }).__lenis;
      if (lenis) lenis.scrollTo(window.scrollY + overflow, { duration: reduceMotion ? 0 : 0.6 });
      else window.scrollTo({ top: window.scrollY + overflow, behavior: reduceMotion ? "auto" : "smooth" });
    }, reduceMotion ? 0 : 260);
    return () => window.clearTimeout(timer);
  }, [open, reduceMotion]);

  const close = useCallback(() => {
    dispatchCompanion({ type: "ask/close" });
    const opener = openerRef.current;
    const fallback = [...document.querySelectorAll<HTMLButtonElement>("footer button")].find((button) => button.textContent?.trim() === "Ask Nex");
    (opener?.isConnected ? opener : fallback)?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    // Relative, and the chat fills it absolutely: the band keeps the height
    // its sign-off and Nex give it, so opening the chat never changes it.
    <div ref={hostRef} className="relative order-3 min-w-0 self-stretch md:justify-self-stretch">
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="ask"
            id="nex-host-footer"
            role="region"
            aria-label="Conversation with Nex"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22 }}
            className="flex w-full flex-col overflow-hidden rounded-2xl md:absolute md:inset-0 border border-primary/20 text-left glass-strong shadow-accent-soft"
          >
            <AskContent inline fill activeSection="contact" onExpand={openPanel} onClose={close} isMobile={false} reduceMotion={reduceMotion} />
          </motion.div>
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
  const companion = useCompanionState();
  const line = useSpoken();
  const landed = companion.footerDocked;
  const text = landed ? line ?? "End of the page. Ask me what you didn't find." : "";
  return (
    <p aria-live="off" className="flex min-h-11 max-w-[15rem] items-end justify-center text-center text-[0.8125rem] leading-snug text-muted-foreground" style={{ textWrap: "balance" }}>
      <AnimatePresence mode="wait" initial={false}>
        {text && (
          <motion.span key={text} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </p>
  );
}
