"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowDown, Compass, Download, MessageCircle } from "lucide-react";
import { personalInfo } from "@/data/portfolio";
import { openNex } from "@/lib/ask-nex";
import { TourChooser } from "@/components/guide/TourChooser";

/**
 * The hero's one row of actions. Ask Nex leads (this is a Nex-first site);
 * the other three share one style. Short labels so the row is a balanced 2x2
 * on phones without any label wrapping. Glass and solid buttons are moved in
 * by the intro, never faded (`data-hero-glass`). "Take a tour" opens the
 * choice of tour under the row, in the page.
 */
export function HeroActions() {
  const [choosing, setChoosing] = useState(false);
  const tourRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setChoosing(false), []);
  const returnFocusTo = useCallback(() => tourRef.current, []);
  return (
    <>
      <div data-hero-part="copy" data-hero-glass className="hero-actions mt-[var(--hero-gap)] grid w-full max-w-sm grid-cols-2 gap-3 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:justify-center">
        <button type="button" onClick={() => openNex("")} className="btn-cta-primary">
          <MessageCircle aria-hidden="true" />
          <span className="hero-action-label">Ask Nex</span>
        </button>
        <a href="#work" className="btn-cta-secondary">
          <ArrowDown aria-hidden="true" />
          <span className="hero-action-label">View work</span>
        </a>
        <a href={personalInfo.resumeUrl} download className="btn-cta-secondary">
          <Download aria-hidden="true" />
          <span className="hero-action-label">Resume</span>
        </a>
        <button ref={tourRef} type="button" onClick={() => setChoosing((open) => !open)} aria-expanded={choosing} className="btn-cta-secondary">
          <Compass aria-hidden="true" />
          <span className="hero-action-label">Take a tour</span>
        </button>
      </div>
      <TourChooser open={choosing} onClose={close} returnFocusTo={returnFocusTo} />
    </>
  );
}
