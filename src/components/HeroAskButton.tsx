"use client";

import { ArrowDown, Compass, Download, MessageCircle } from "lucide-react";
import { personalInfo } from "@/data/portfolio";
import { openNex } from "@/lib/ask-nex";
import { startGuideTour } from "@/lib/guide/tour-control";

/**
 * The hero's one row of actions. Ask Nex leads (this is a Nex-first site);
 * the other three share one style. Short labels so the row is a balanced 2x2
 * on phones without any label wrapping. Glass and solid buttons are moved in
 * by the intro, never faded (`data-hero-glass`).
 */
export function HeroActions() {
  return (
    <div data-hero-part="copy" data-hero-glass className="mt-7 grid w-full max-w-sm grid-cols-2 gap-3 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:justify-center">
      <button type="button" onClick={() => openNex("")} className="btn-cta-primary">
        <MessageCircle aria-hidden="true" />
        Ask Nex
      </button>
      <a href="#work" className="btn-cta-secondary">
        <ArrowDown aria-hidden="true" />
        View work
      </a>
      <a href={personalInfo.resumeUrl} download className="btn-cta-secondary">
        <Download aria-hidden="true" />
        Resume
      </a>
      <button type="button" onClick={startGuideTour} className="btn-cta-secondary">
        <Compass aria-hidden="true" />
        Take a tour
      </button>
    </div>
  );
}
