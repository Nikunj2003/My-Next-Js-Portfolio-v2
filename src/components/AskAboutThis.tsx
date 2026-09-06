"use client";

import { Sparkles } from "lucide-react";

/**
 * Inline "ask the twin about this" affordance for a case study section.
 *
 * Reuses the existing `open-ai-twin` event, so no new plumbing: the chat opens
 * and auto-sends the scoped question. Appears on hover/focus of its heading so
 * it stays out of the way while reading.
 */
const AskAboutThis = ({ question, label = "Ask about this" }: { question: string; label?: string }) => (
  <button
    type="button"
    onClick={() => window.dispatchEvent(new CustomEvent("open-ai-twin", { detail: { question } }))}
    className="ml-3 inline-flex shrink-0 translate-y-[-1px] items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 align-middle font-mono text-[10px] font-medium uppercase tracking-wider text-primary opacity-0 transition-opacity duration-200 hover:bg-primary/15 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group-hover/heading:opacity-100 motion-reduce:transition-none"
    aria-label={`${label}: ${question}`}
  >
    <Sparkles className="h-2.5 w-2.5" />
    {label}
  </button>
);

export default AskAboutThis;
