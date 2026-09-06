"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  label: string;
}

/**
 * Sticky table of contents plus a reading-progress bar.
 *
 * The scroll handler is rAF-gated and only listens while the article is near
 * the viewport, following the pattern already used by the experience timeline.
 */
const CaseStudyToc = ({ items }: { items: TocItem[] }) => {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const progress = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);

    if (headings.length === 0) return;

    // Active item: the last heading whose top has passed the read line.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-88px 0px -65% 0px", threshold: 0 }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const article = document.getElementById("case-study-article");
    if (!article) return;

    const update = () => {
      frameRef.current = null;
      const rect = article.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) {
        progress.set(1);
        return;
      }
      progress.set(Math.min(1, Math.max(0, -rect.top / scrollable)));
    };

    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    update();

    /**
     * Lenis animates scroll inside its own rAF loop and only writes the result
     * to the document, so the native `scroll` event fires coarsely — the bar
     * jumped to position after scrolling stopped instead of tracking it.
     * Subscribing to Lenis's own per-frame `scroll` event makes it continuous.
     * The native listener stays as the fallback for reduced-motion visitors,
     * where Lenis is never instantiated.
     */
    const lenis = (window as Window & { __lenis?: { on: (e: string, cb: () => void) => void; off: (e: string, cb: () => void) => void } }).__lenis;

    if (lenis) {
      lenis.on("scroll", update);
    } else {
      window.addEventListener("scroll", schedule, { passive: true });
    }
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      if (lenis) {
        lenis.off("scroll", update);
      } else {
        window.removeEventListener("scroll", schedule);
      }
      window.removeEventListener("resize", schedule);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [progress]);

  return (
    <>
      {/* Reading progress — scaleX on a transform, never animated width. */}
      <div className="fixed inset-x-0 top-0 z-[95] h-0.5 bg-transparent" aria-hidden="true">
        <motion.div
          className="h-full origin-left bg-gradient-to-r from-primary to-accent"
          style={{ scaleX: shouldReduceMotion ? 1 : progress }}
        />
      </div>

      <nav aria-label="On this page" className="lg:sticky lg:top-28">
        {/* Mobile: a disclosure, so it never eats the first screen. */}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="case-study-toc-list"
          className="flex w-full items-center justify-between rounded-xl glass-subtle px-4 py-3 text-sm font-semibold lg:hidden"
        >
          On this page
          <span className="font-mono text-xs text-muted-foreground">{open ? "hide" : "show"}</span>
        </button>

        <ol
          id="case-study-toc-list"
          className={cn(
            "mt-3 flex-col gap-1 border-l border-black/10 dark:border-white/10 lg:mt-0 lg:flex",
            open ? "flex" : "hidden"
          )}
        >
          {items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "-ml-px block border-l-2 py-1.5 pl-4 text-sm leading-snug transition-colors",
                    isActive
                      ? "border-primary font-semibold text-primary"
                      : "border-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

export default CaseStudyToc;
