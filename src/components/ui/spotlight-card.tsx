"use client";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { MouseEvent, useState } from "react";
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
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0, rootMargin: '100px 0px 100px 0px' });

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    if (!isHovered) setIsHovered(true);
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  function handleMouseLeave() {
    setIsHovered(false);
  }

  return (
    <motion.div
      ref={animateOnEnter ? ref : undefined}
      initial={animateOnEnter ? { y: 30 } : false}
      animate={animateOnEnter ? (inView ? { opacity: 1, y: 0 } : {}) : undefined}
      transition={animateOnEnter ? { duration: 0.4, delay: Math.min(delay, 0.2), ease: [0.16, 1, 0.3, 1] } : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative rounded-3xl border border-border/60 bg-background/55 dark:bg-background/55 backdrop-blur-[22px] backdrop-saturate-150 overflow-hidden",
        className
      )}
    >
      {/* Spotlight hover effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl"
        animate={{ opacity: isHovered ? glowOpacity / 100 : 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${glowSize}px circle at ${mouseX}px ${mouseY}px,
              ${glowColor},
              transparent 80%
            )
          `,
        }}
      />
      
      {/* Subtle ambient glow always active */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/[0.03] dark:from-white/[0.03] to-transparent pointer-events-none" />

      {/* Card Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
