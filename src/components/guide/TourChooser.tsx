"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { VISITOR_IDS, VISITOR_PATHS, type VisitorId } from "@/lib/guide/paths";
import { readGuidePrefs } from "@/lib/guide/prefs";
import { startGuideTour } from "@/lib/guide/tour-control";

/**
 * Which tour to take: the 60-second tour, or a path for the reader's role.
 * In the page flow (it pushes what follows down, never covers it), opened by
 * "Take a tour". Picking one starts the tour; Escape or × closes it and
 * returns focus to the button that opened it.
 */
export function TourChooser({ open, onClose, returnFocusTo }: { open: boolean; onClose: () => void; returnFocusTo?: () => HTMLElement | null }) {
  const reduceMotion = Boolean(useReducedMotion());
  const firstRef = useRef<HTMLButtonElement>(null);
  const last = typeof window === "undefined" ? null : readGuidePrefs().visitor;

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
      returnFocusTo?.()?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, returnFocusTo]);

  const pick = (id: VisitorId) => {
    onClose();
    startGuideTour(id);
  };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="chooser"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.36, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-3xl overflow-hidden"
        >
          <div role="group" aria-labelledby="tour-chooser-title" className="mt-4 rounded-2xl border border-foreground/10 glass-subtle p-4 text-left shadow-accent-soft sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p id="tour-chooser-title" className="text-sm font-semibold text-foreground">Which tour?</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  returnFocusTo?.()?.focus({ preventScroll: true });
                }}
                aria-label="Close tour choices"
                className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {VISITOR_IDS.map((id, i) => {
                const path = VISITOR_PATHS[id];
                return (
                  <li key={id} className={i === 0 ? "sm:col-span-2 lg:col-span-1" : undefined}>
                    <button
                      ref={i === 0 ? firstRef : undefined}
                      type="button"
                      onClick={() => pick(id)}
                      className={
                        "group flex h-full w-full flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
                        (id === (last ?? "default") ? "border-primary/40 bg-primary/[0.08]" : "border-foreground/10 hover:border-primary/35 hover:bg-primary/[0.05]")
                      }
                    >
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                        {path.label}
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary-text opacity-60 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                      </span>
                      <span className="text-xs leading-snug text-muted-foreground">{path.blurb}</span>
                      <span className="mt-auto pt-1 text-[11px] text-muted-foreground/80">{path.steps.length} stops</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
