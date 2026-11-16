"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineAnswer } from "@/components/ai/InlineAnswer";
import { Collapse } from "@/components/ui/collapse";
import { openNex } from "@/lib/ask-nex";
import type { AskHost } from "@/lib/guide/ask-hosts";

/** Re-exported so existing call sites keep working. */
export { openNex as askAboutThis } from "@/lib/ask-nex";

/**
 * Shared geometry for both affordances, so a pill and the link beside it cannot
 * drift apart.
 *
 * Deliberately quiet at rest. These are always visible now rather than
 * hover-revealed, and there are 40-plus of them on the homepage alone — at full
 * accent strength they would compete with the content they annotate. Hover and
 * focus raise the contrast, so hover signals "this is interactive" rather than
 * "this exists".
 */
const AFFORDANCE_BASE =
  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 align-middle font-mono text-[10px] font-medium uppercase tracking-wider transition-colors duration-200 " +
  "border-primary/15 text-primary-text " +
  "hover:border-primary/40 hover:bg-primary/10 hover:text-primary-text " +
  "focus-visible:border-primary/40 focus-visible:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 " +
  "motion-reduce:transition-none";

/**
 * The single "ask about this" affordance used everywhere.
 *
 * Opens the conversation with Nex by DEFAULT, wherever asking opens
 * (`resolveAskHost`: the section's own host, a page row, or the bubble), or in
 * a given `host` (a case-study section's row). It keeps the conversation, so
 * a visitor can follow up, and the answer scrolls inside its own surface.
 *
 * `inline` opts a surface into answering in place instead, and is deliberately
 * rare. An inline answer only works where the container is full-width prose
 * that can grow downward — inside a narrow grid cell it blew the card's height
 * and broke row alignment with its neighbours, and it duplicated text that was
 * already on screen a few pixels above.
 *
 * Always visible: no opacity toggling and no `group-hover` scope. An earlier
 * version revealed itself on hover of a named group ancestor, which meant every
 * call site had to declare a matching `group/<scope>` wrapper — a coupling that
 * silently broke whenever the pill moved out of that ancestor.
 */
export default function AskAboutThis({
  question,
  label = "Ask about this",
  className,
  inline = false,
  host,
}: {
  question: string;
  label?: string;
  className?: string;
  /**
   * Answer in place rather than opening the panel. Only for full-width prose
   * that can grow downward without pushing sibling content around.
   */
  inline?: boolean;
  /** Where the answer opens (a page row, `page:<id>`); by default wherever asking opens. */
  host?: AskHost;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => (inline ? setOpen((prev) => !prev) : openNex(question, undefined, { host }))}
        aria-label={`${label}: ${question}`}
        aria-expanded={inline ? open : undefined}
        className={cn(AFFORDANCE_BASE, "ml-2", open && "border-primary/40 bg-primary/10 text-primary-text", className)}
      >
        <Sparkles className="h-2.5 w-2.5" />
        {label}
      </button>

      {inline && (
        <Collapse open={open} as="span">
          <InlineAnswer question={question} onDismiss={() => setOpen(false)} />
        </Collapse>
      )}
    </>
  );
}

/**
 * "Read case study" link, matching the pill exactly.
 *
 * A real `next/link` rather than a scripted button, so it stays crawlable and
 * middle-clickable. Lives beside the pill in this file because it was
 * previously hand-styled inline at its call site with a duplicated class
 * string, which is how the two ended up looking different on the same row.
 */
export function ReadCaseStudyLink({
  href,
  label = "Read case study",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(AFFORDANCE_BASE, "ml-2", className)}>
      {label}
      <ArrowRight className="h-2.5 w-2.5" />
    </Link>
  );
}
