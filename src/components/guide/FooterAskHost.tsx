"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AskContent } from "@/components/guide/AskContent";
import { dispatchCompanion, openPanel, takeAskOpener, useCompanionState } from "@/lib/guide/companion-store";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * The footer's conversation, in the page below the landing band: it opens on
 * "Ask Nex" in the footer (or any ask once Nex has landed there) and pushes
 * the copyright line down, never covering the sign-off or the links. Same
 * ask box as the hero's; one is mounted at a time (`askHost`).
 */
export function FooterAskHost() {
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
    <div ref={hostRef} className="flex justify-center">
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="ask"
            id="nex-host-footer"
            role="region"
            aria-label="Conversation with Nex"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22 }}
            className="mt-10 flex w-full max-w-[40rem] flex-col overflow-hidden rounded-2xl border border-primary/20 text-left glass-strong shadow-accent-soft"
          >
            <AskContent inline activeSection="contact" onExpand={openPanel} onClose={close} isMobile={false} reduceMotion={reduceMotion} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
