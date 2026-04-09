"use client";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  glowColor?: string;
  glowSize?: number;
  glowOpacity?: number;
  animateOnEnter?: boolean;
}

export function SpotlightCard({
  children,
  delay = 0,
  className,
  glowColor = "rgba(41, 214, 185, 0.12)", // Default Teal/Cyan from the theme
  glowSize = 650,
  glowOpacity = 100,
  animateOnEnter = true,
}: SpotlightCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const boundsRef = useRef<DOMRect | null>(null);
  const pointRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0, rootMargin: '100px 0px 100px 0px' });
  const shouldReduceMotion = useReducedMotion();
  const spotlightBackground = useMotionTemplate`
    radial-gradient(
      ${glowSize}px circle at ${mouseX}px ${mouseY}px,
      ${glowColor},
      transparent 80%
    )
  `;

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (shouldReduceMotion) {
      setIsInteractive(false);
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateInteractivity = (event?: MediaQueryListEvent) => {
      setIsInteractive(event ? event.matches : mediaQuery.matches);
    };

    updateInteractivity();
    mediaQuery.addEventListener("change", updateInteractivity);

    return () => mediaQuery.removeEventListener("change", updateInteractivity);
  }, [shouldReduceMotion]);

  function flushPointerPosition() {
    frameRef.current = null;

    const nextBounds = elementRef.current?.getBoundingClientRect() ?? boundsRef.current;
    if (!nextBounds || !pointRef.current) return;

    boundsRef.current = nextBounds;
    mouseX.set(pointRef.current.x - nextBounds.left);
    mouseY.set(pointRef.current.y - nextBounds.top);
  }

  function handlePointerEnter({ currentTarget, clientX, clientY }: PointerEvent<HTMLDivElement>) {
    if (!isInteractive) return;
    elementRef.current = currentTarget;
    boundsRef.current = currentTarget.getBoundingClientRect();
    pointRef.current = { x: clientX, y: clientY };
    mouseX.set(clientX - boundsRef.current.left);
    mouseY.set(clientY - boundsRef.current.top);
    setIsHovered(true);
  }

  function handlePointerMove({ currentTarget, clientX, clientY }: PointerEvent<HTMLDivElement>) {
    if (!isInteractive) return;
    elementRef.current = currentTarget;
    if (!boundsRef.current) {
      boundsRef.current = currentTarget.getBoundingClientRect();
    }

    pointRef.current = { x: clientX, y: clientY };

    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(flushPointerPosition);
    }
  }

  function handlePointerLeave() {
    if (!isInteractive) return;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    elementRef.current = null;
    boundsRef.current = null;
    pointRef.current = null;
    setIsHovered(false);
  }

  const setRefs = (node: HTMLDivElement | null) => {
    elementRef.current = node;

    if (animateOnEnter) {
      ref(node);
    }
  };

  return (
    <motion.div
      ref={setRefs}
      initial={animateOnEnter ? (shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }) : false}
      animate={animateOnEnter ? (inView ? { opacity: 1, y: 0 } : {}) : undefined}
      transition={animateOnEnter ? { duration: shouldReduceMotion ? 0.2 : 0.4, delay: shouldReduceMotion ? 0 : Math.min(delay, 0.2), ease: [0.16, 1, 0.3, 1] } : undefined}
      onPointerEnter={isInteractive ? handlePointerEnter : undefined}
      onPointerMove={isInteractive ? handlePointerMove : undefined}
      onPointerLeave={isInteractive ? handlePointerLeave : undefined}
      className={cn(
        "group relative rounded-3xl border border-border/60 bg-background/65 dark:bg-background/68 backdrop-blur-[18px] backdrop-saturate-140 overflow-hidden",
        className
      )}
    >
      {/* Spotlight hover effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl"
        animate={{ opacity: isInteractive && isHovered ? glowOpacity / 100 : 0 }}
        transition={{ duration: shouldReduceMotion ? 0.2 : 0.5 }}
        style={{
          background: spotlightBackground,
        }}
      />
      
      {/* Subtle ambient glow always active */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/[0.02] dark:from-white/[0.02] to-transparent pointer-events-none" />

      {/* Card Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
