"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

interface DiagramFrameProps {
  title: string;
  description: string;
  viewBox: string;
  children: ReactNode;
}

/**
 * Shared chrome for the inline architecture diagrams.
 *
 * Colours resolve from theme tokens rather than literals so a single SVG is
 * correct in both light and dark mode, and the wrapper scrolls horizontally
 * instead of forcing the page to.
 */
const DiagramFrame = ({ title, description, viewBox, children }: DiagramFrameProps) => {
  // triggerOnce so the diagram draws itself once, not on every scroll pass.
  // Reduced motion is handled globally by MotionConfig in providers.tsx, so the
  // Box/Arrow children need no per-frame gating here.
  const [ref] = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
  <figure ref={ref} className="my-8">
    <div className="overflow-x-auto rounded-2xl border border-black/10 glass-subtle p-4 shadow-accent-soft dark:border-white/10 sm:p-6">
      <svg
        viewBox={viewBox}
        role="img"
        aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-title`}
        className="mx-auto block h-auto w-full min-w-[560px] max-w-3xl"
      >
        <title id={`${title.replace(/\s+/g, "-").toLowerCase()}-title`}>{title}</title>
        <desc>{description}</desc>
        <defs>
          <marker id="diagram-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>
        {children}
      </svg>
    </div>
    <figcaption className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</figcaption>
  </figure>
  );
};

export default DiagramFrame;

/** Shared primitives so the three diagrams stay visually consistent. */
export const Box = ({
  x,
  y,
  w,
  h,
  label,
  sub,
  accent = false,
  order = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  accent?: boolean;
  /** Layer index, so the diagram assembles top-down rather than all at once. */
  order?: number;
}) => (
  <motion.g
    initial={{ opacity: 0, y: 8 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.45, delay: Math.min(order * 0.07, 0.6), ease: [0.16, 1, 0.3, 1] }}
  >
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={10}
      fill={accent ? "hsl(var(--primary) / 0.12)" : "hsl(var(--muted) / 0.35)"}
      stroke={accent ? "hsl(var(--primary) / 0.55)" : "hsl(var(--border))"}
      strokeWidth={1.5}
    />
    <text
      x={x + w / 2}
      y={sub ? y + h / 2 - 4 : y + h / 2 + 4}
      textAnchor="middle"
      fontSize={13.5}
      fontWeight={600}
      fill="hsl(var(--foreground))"
    >
      {label}
    </text>
    {sub && (
      <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontSize={11.5} fill="hsl(var(--muted-foreground))">
        {sub}
      </text>
    )}
  </motion.g>
);

export const Arrow = ({ d, order = 0 }: { d: string; order?: number }) => (
  <motion.path
    d={d}
    fill="none"
    stroke="hsl(var(--primary) / 0.6)"
    strokeWidth={1.6}
    markerEnd="url(#diagram-arrow)"
    initial={{ pathLength: 0, opacity: 0 }}
    whileInView={{ pathLength: 1, opacity: 1 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: Math.min(order * 0.07 + 0.15, 0.7), ease: "easeOut" }}
  />
);

export const Caption = ({ x, y, text, anchor = "middle" }: { x: number; y: number; text: string; anchor?: "start" | "middle" | "end" }) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={11.5} fill="hsl(var(--muted-foreground))" fontStyle="italic">
    {text}
  </text>
);

export const LayerLabel = ({ x, y, text }: { x: number; y: number; text: string }) => (
  <text x={x} y={y} fontSize={11} fontWeight={700} letterSpacing={1.2} fill="hsl(var(--primary))">
    {text.toUpperCase()}
  </text>
);
