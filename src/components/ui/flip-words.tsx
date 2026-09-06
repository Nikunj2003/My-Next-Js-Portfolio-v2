"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FlipWordsProps {
  words: string[];
  /** ms each word stays before flipping. */
  interval?: number;
  className?: string;
  /**
   * "slot" reserves a fixed width and centres the word — for a word swapping
   * inside a sentence, where surrounding text must not shift.
   * "line" flows at its natural width, left-aligned — for a standalone line.
   */
  variant?: "slot" | "line";
  /** Width of the reserved slot in ch. Defaults to the longest word. */
  slotWidth?: number;
}

/**
 * Rotating word with a per-letter reveal.
 *
 * One implementation shared by the Experience and Skills sections, which
 * previously held two near-identical copies. The letter-by-letter entrance and
 * the fly-out exit are deliberate: an earlier refactor of mine replaced them
 * with a plain vertical crossfade, which lost the character of the original.
 */
const FlipWords = ({ words, interval = 3000, className, variant = "slot", slotWidth }: FlipWordsProps) => {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  const advance = useCallback(() => {
    setIndex((current) => (current + 1) % words.length);
  }, [words.length]);

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const id = window.setTimeout(advance, interval);
    return () => window.clearTimeout(id);
  }, [advance, index, interval, isVisible]);

  // Clamped: if `words` shrinks between renders, a stale index would read
  // undefined and throw on `.split("")` below.
  const safeIndex = words.length > 0 ? index % words.length : 0;
  const current = words[safeIndex] ?? "";
  const isSlot = variant === "slot";
  // Math.max() of an empty array is -Infinity, which is an invalid width.
  const widthCh = slotWidth ?? (words.length > 0 ? Math.max(...words.map((word) => word.length)) : 0);

  return (
    <span
      className={cn(
        "relative overflow-hidden",
        isSlot ? "inline-grid text-center align-baseline" : "inline-block text-left",
        className
      )}
      style={isSlot ? { width: `${widthCh}ch` } : undefined}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={safeIndex}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            shouldReduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 100, damping: 10 }
          }
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -40, x: 40, filter: "blur(8px)", scale: 2, position: "absolute" }
          }
          className={cn("inline-block", isSlot ? "col-start-1 row-start-1" : "relative text-left")}
        >
          {current.split("").map((letter, letterIndex) => (
            <motion.span
              key={`${current}-${letterIndex}`}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: letterIndex * (shouldReduceMotion ? 0.02 : 0.08),
                duration: shouldReduceMotion ? 0.18 : 0.4,
              }}
              className="inline-block"
            >
              {letter === " " ? " " : letter}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default FlipWords;
