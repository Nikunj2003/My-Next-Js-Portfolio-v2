"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MessageCircle, X } from "lucide-react";
import { NexRing } from "@/components/guide/NexRing";
import { type SectionHostId } from "@/lib/guide/ask-hosts";
import { dispatchCompanion, openAsk, openRoleFit, useCompanionState } from "@/lib/guide/companion-store";
import { useSpoken } from "@/lib/guide/spoken";
import { DOCK_PROMPTS, TIP_RULES } from "@/lib/guide/tips";

/** The dock's socket: the companion's own size, so Nex rests in it as it is drawn everywhere else. */
export const SECTION_SOCKET = 68;

/**
 * Nex's place in a homepage section: a ringed socket it rests in, and what it
 * says there, with the way to ask. The same motif as the hero, the footer and
 * the page headers. Two layouts:
 *  - `row`: the socket beside its line (in a sticky panel's top row, or a
 *    content column);
 *  - `stack`: the socket above its line, centred (a centred section header).
 *
 * The line is the section's tip when one is offered while Nex rests here, else
 * what Nex is saying, else a short prompt. The action opens the conversation in
 * this section's host; with the conversation open elsewhere it reads
 * "Continue here" and moves it (history and draft are shared). Below 1024px the
 * socket is hidden (Nex waits in the corner there); the action stays.
 */
export function SectionNexDock({ section, layout = "row", eyebrow, className = "" }: {
  section: SectionHostId;
  layout?: "row" | "stack";
  /** Shown above the line in the row layout (the panel's label pill). */
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  const companion = useCompanionState();
  const spoken = useSpoken();
  const host = `section:${section}` as const;
  const here = companion.dockSection === section;
  const tip = here && companion.bubble === "tip" && companion.tip?.section === section ? companion.tip.text : null;
  const line = tip ?? (here ? spoken : null) ?? DOCK_PROMPTS[section];
  const askOpen = companion.bubble === "ask";
  const openHere = askOpen && companion.askHost === host;
  const ask = () => (section === "contact" && !askOpen ? openRoleFit(host) : openAsk(undefined, host));

  const socket = (
    <span data-guide-section-socket={section} aria-hidden="true" className="relative hidden shrink-0 lg:block" style={{ width: SECTION_SOCKET, height: SECTION_SOCKET }}>
      <span className="pointer-events-none absolute inset-[-22%] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,transparent_68%)]" />
      <NexRing dim={!here} outset={8} className="transition-opacity duration-500" />
    </span>
  );

  const action = openHere ? null : (
    <button
      type="button"
      onClick={ask}
      className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.07] px-3 text-xs font-semibold text-primary-text transition-colors hover:border-primary/50 hover:bg-primary/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {askOpen ? <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> : <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />}
      {askOpen ? "Continue here" : section === "contact" ? "Check a role's fit" : "Ask Nex"}
    </button>
  );

  // Centred under a header: the line (two lines reserved) above one fixed
  // action row, so a tip coming or going never changes the header's height.
  const speech = (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <DockLine line={line} className="h-10 w-full text-center text-[0.8125rem] leading-5" />
      <span className="relative flex h-8 items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={tip ? "tip" : "action"} className="flex items-center" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tip ? <DockTipActions section={section} /> : action}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );

  if (layout === "stack") {
    return (
      <div className={"flex flex-col items-center gap-3 " + className}>
        {socket}
        {speech}
      </div>
    );
  }
  // In a sticky panel: compact, so the pinned panel still fits short screens.
  // Top row: the panel's label and the action; below it, two lines at most.
  return (
    <div className={"flex items-center gap-4 " + className}>
      {socket}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* One row that never wraps: the label, then the action or, while a
            tip shows, its two small controls in the same space. */}
        <div className="flex h-8 items-center justify-between gap-2">
          {eyebrow}
          <span className="relative flex h-8 shrink-0 items-center justify-end">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={tip ? "tip" : "action"} className="flex items-center" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {tip ? <DockTipActions section={section} compact /> : action}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
        {/* Two lines reserved: a tip is longer than the prompt, and the panel
            must not change height when one comes or goes. */}
        <DockLine line={line} className="h-9 text-[0.8125rem] leading-[1.125rem]" />
      </div>
    </div>
  );
}

/** Nex's line in a dock: a fixed box, the text cross-fading inside it, vertically centred. */
function DockLine({ line, className }: { line: string; className: string }) {
  return (
    <p aria-live="off" title={line} className={"flex items-center overflow-hidden text-muted-foreground " + className} style={{ textWrap: "balance" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={line} className="line-clamp-2 w-full" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {line}
        </motion.span>
      </AnimatePresence>
    </p>
  );
}

/**
 * A tip shown in the dock: the same rules as the bubble's (`TipContent`):
 * it goes after `showMs` unless hovered or focused, "Ask now" opens the
 * conversation here, and it can be dismissed or tips turned off.
 */
function DockTipActions({ section, compact = false }: { section: SectionHostId; compact?: boolean }) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (hovered) return;
    const timer = window.setTimeout(() => dispatchCompanion({ type: "tip/expire" }), TIP_RULES.showMs);
    return () => window.clearTimeout(timer);
  }, [hovered]);
  const host = `section:${section}` as const;
  return (
    <span
      className="inline-flex items-center gap-2"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => {
          dispatchCompanion({ type: "tip/expire" });
          if (section === "contact") openRoleFit(host);
          else openAsk(undefined, host);
        }}
        className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary-text hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Ask now <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
      {!compact && <button
        type="button"
        onClick={() => dispatchCompanion({ type: "tip/dismiss", forever: true })}
        className="min-h-8 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Don&apos;t show tips
      </button>}
      <button
        type="button"
        onClick={() => dispatchCompanion({ type: "tip/dismiss", forever: false })}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Dismiss tip"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}
