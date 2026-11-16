"use client";

import { useEffect, useRef, useState } from "react";
import { useNexChat } from "@/lib/chat/useNexChat";

/**
 * The ring around every place Nex rests (the hero, the footer slot, the
 * /work and case-study headers): one motif, drawn in SVG.
 *
 *  - a faint full track with four quarter ticks, like a dial;
 *  - the orbit: a short arc with a fading tail and a bright head, turning
 *    slowly (18s), so the place reads as live;
 *  - while Nex is answering, a second, faster arc runs on the same track.
 *
 * Sized to its parent and drawn just outside Nex's disc, so it shows even
 * when the disc fills the slot. `dim` lowers it while the slot is empty (the
 * footer before Nex lands). The hero's intro draws the track on as Nex wakes
 * (`data-hero-part="ring-*"`). The orbit pauses off screen and under
 * reduced motion (CSS).
 */
export function NexRing({ dim = false, outset = 0, className = "" }: { dim?: boolean; outset?: number | string; className?: string }) {
  const { isLoading } = useNexChat();
  const ref = useRef<HTMLSpanElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: "80px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Geometry in a 100x100 box. r=48 sits at the slot's edge; the disc inside is smaller.
  const r = 48;
  const c = 2 * Math.PI * r;
  // Three layers in one box: the track (static SVG), and the orbit and the
  // thinking arc as their own HTML layers that the compositor rotates
  // (`transform` on an element with `will-change`), so the ring costs no
  // repaint per frame. A CSS rotation of an SVG group repainted the whole
  // drawing every frame, and the head's drop-shadow filter with it.
  const box = { inset: typeof outset === "number" ? -outset : `-${outset}` };
  const layer = "pointer-events-none absolute inset-0 h-full w-full overflow-visible";
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-running={onScreen || undefined}
      data-thinking={isLoading || undefined}
      // `outset`: how far the ring sits outside its parent's box (px, or a % of it).
      style={box}
      className={`nex-ring-svg pointer-events-none absolute ${dim ? "opacity-50" : ""} ${className}`}
    >
      {/* Track and ticks (the intro draws the track on). */}
      <svg viewBox="0 0 100 100" className={layer}>
        <g data-hero-part="ring-track">
          <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.22" strokeWidth="0.6" pathLength={1} strokeDasharray="1 0" className="nex-ring-track" />
          {[0, 90, 180, 270].map((angle) => (
            <line key={angle} x1="50" y1={50 - r - 1.6} x2="50" y2={50 - r + 1.6} stroke="hsl(var(--primary))" strokeOpacity="0.45" strokeWidth="0.7" strokeLinecap="round" transform={`rotate(${angle} 50 50)`} />
          ))}
        </g>
      </svg>
      {/* The orbit: a tail that fades in three steps toward a bright head dot,
          all ending at the top (the arcs run clockwise into it), turning slowly. */}
      <span data-hero-part="ring-orbit" className="nex-ring-orbit absolute inset-0">
        <svg viewBox="0 0 100 100" className={layer}>
          {[
            { length: 0.26, opacity: 0.12 },
            { length: 0.16, opacity: 0.3 },
            { length: 0.07, opacity: 0.85 },
          ].map(({ length, opacity }) => (
            <circle
              key={length}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeOpacity={opacity}
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeDasharray={`${c * length} ${c}`}
              // Each arc ends at 12 o'clock: it starts that much of a turn earlier.
              transform={`rotate(${-90 - 360 * length} 50 50)`}
            />
          ))}
          {/* The head's glow: a faint wider dot under it (no filter). */}
          <circle cx="50" cy={50 - r} r="3" fill="hsl(var(--primary))" fillOpacity="0.28" />
          <circle cx="50" cy={50 - r} r="1.5" fill="hsl(var(--primary))" className="nex-ring-head" />
        </svg>
      </span>
      {/* Thinking: a short, quicker arc on the same track while an answer is coming. */}
      <span className="nex-ring-think absolute inset-0">
        <svg viewBox="0 0 100 100" className={layer}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--accent))" strokeOpacity="0.8" strokeWidth="1.1" strokeLinecap="round" strokeDasharray={`${c * 0.1} ${c}`} />
        </svg>
      </span>
    </span>
  );
}
