import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { PILLARS, type Pillar } from "@/data/thesis";
import { getCaseStudyPath } from "@/data/case-studies";
import { HeroPillarAsk } from "@/components/HeroPillarAsk";

/**
 * The four things the Work section proves, as a compact row of links above the
 * featured case studies. A pillar with a study links to it; the one without
 * (cost) asks Nex, which answers from the measured record.
 */
export function PillarRow() {
  return (
    <ul className="mb-14 grid gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
      {PILLARS.map((pillar) => (
        <PillarCell key={pillar.id} id={pillar.id}>
          {pillar.studySlug ? (
            <Link href={getCaseStudyPath(pillar.studySlug)} className={CELL}>
              <PillarBody label={pillar.label} claim={pillar.claim} action="Read the proof" />
            </Link>
          ) : (
            <HeroPillarAsk prompt={pillar.askPrompt} className={CELL}>
              <PillarBody label={pillar.label} claim={pillar.claim} action="Ask Nex how" />
            </HeroPillarAsk>
          )}
        </PillarCell>
      ))}
    </ul>
  );
}

const CELL =
  "group flex h-full w-full flex-col gap-1.5 bg-background/60 px-5 py-4 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary";

/** Each pillar's cell, with its highlight id as a literal attribute (the allow-list test reads the source). */
function PillarCell({ id, children }: { id: Pillar["id"]; children: ReactNode }) {
  if (id === "quality") return <li data-guide-target="pillar-quality">{children}</li>;
  if (id === "tools") return <li data-guide-target="pillar-tools">{children}</li>;
  if (id === "retrieval") return <li data-guide-target="pillar-retrieval">{children}</li>;
  return <li data-guide-target="pillar-cost">{children}</li>;
}

function PillarBody({ label, claim, action }: { label: string; claim: string; action: string }) {
  return (
    <>
      <span className="font-mono text-[11px] uppercase tracking-wider text-primary-text">{label}</span>
      <span className="text-xs leading-snug text-muted-foreground">{claim}</span>
      <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[11px] font-semibold text-foreground/70 group-hover:text-primary">
        {action}
        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      </span>
    </>
  );
}
