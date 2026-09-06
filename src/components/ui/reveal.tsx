"use client";

import type { ElementType, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { revealAnimate, revealInitial, revealTransition } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to delay; clamped so long lists never animate late. */
  delay?: number;
  /** Slide along y (default) or x. */
  axis?: "y" | "x";
  /** Distance in px the element travels. Negative slides from the other side. */
  offset?: number;
  threshold?: number;
  as?: ElementType;
  id?: string;
}

/**
 * Scroll-triggered fade-and-slide reveal. One implementation, shared timing.
 * Honours prefers-reduced-motion by collapsing to a short opacity fade.
 */
const Reveal = ({
  children,
  className,
  delay = 0,
  axis = "y",
  offset,
  threshold = 0.1,
  as = "div",
  id,
}: RevealProps) => {
  const shouldReduceMotion = useReducedMotion();
  const [ref, inView] = useInView({ triggerOnce: true, threshold });
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      ref={ref}
      id={id}
      className={className}
      initial={revealInitial(shouldReduceMotion, axis, offset)}
      animate={inView ? revealAnimate(axis) : undefined}
      transition={revealTransition(shouldReduceMotion, delay)}
    >
      {children}
    </MotionTag>
  );
};

export default Reveal;
