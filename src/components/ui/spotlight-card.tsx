"use client";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  glowColor?: string;
  glowSize?: number;
  glowOpacity?: number;
}

export function SpotlightCard({
  children,
  delay = 0,
  className,
  glowColor = "rgba(41, 214, 185, 0.12)", // Default Teal/Cyan from the theme
  glowSize = 650,
  glowOpacity = 100,
}: SpotlightCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative rounded-3xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden",
        className
      )}
    >
      {/* Spotlight hover effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-500 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${glowSize}px circle at ${mouseX}px ${mouseY}px,
              ${glowColor},
              transparent 80%
            )
          `,
          opacity: glowOpacity / 100,
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
