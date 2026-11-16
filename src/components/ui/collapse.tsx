"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Opens and closes its children by easing their height (and fading), so what
 * is below slides instead of jumping. One curve and duration for every
 * disclosure on the site; instant under reduced motion. `as="span"` for
 * places only phrasing content is valid (inline answers sit inside text).
 */
export function Collapse({ open, children, as = "div", className, id }: { open: boolean; children: ReactNode; as?: "div" | "span"; className?: string; id?: string }) {
  const reduceMotion = Boolean(useReducedMotion());
  const Tag = as === "span" ? motion.span : motion.div;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <Tag
          id={id}
          key="collapse"
          className={(as === "span" ? "block " : "") + "overflow-hidden " + (className ?? "")}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </Tag>
      )}
    </AnimatePresence>
  );
}
