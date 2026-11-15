"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { METRICS } from "@/data/metrics";
import { caseStudyBySlug, getCaseStudyPath } from "@/data/case-studies";
import type { AnswerCard } from "@/lib/chat/cards";

/**
 * The cards themselves. Loaded with next/dynamic from NexAnswerBody, so the
 * full case-study and metric data only reach the browser once a card is shown.
 * Everything is single-column and wraps, because the narrowest host (a sticky
 * intro panel) is about 300px wide.
 */
export default function AnswerCards({ cards }: { cards: AnswerCard[] }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {cards.map((card) => (
        <CardView key={cardKey(card)} card={card} />
      ))}
    </div>
  );
}

const cardKey = (card: AnswerCard) => (card.kind === "metric" ? card.id : card.kind === "study" ? card.slug : card.slugs.join(","));

const FRAME = "rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3";

function CardView({ card }: { card: AnswerCard }) {
  if (card.kind === "metric") {
    const metric = METRICS.find((entry) => entry.id === card.id);
    if (!metric) return null;
    return (
      <figure className={FRAME}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary-text">Measured</p>
        <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-foreground">{metric.value}</p>
        <figcaption className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {metric.context} <span className="text-foreground/70">Source: {metric.source}.</span>
        </figcaption>
      </figure>
    );
  }
  if (card.kind === "study") {
    const study = caseStudyBySlug.get(card.slug);
    if (!study) return null;
    return (
      <Link href={getCaseStudyPath(study.slug)} className={`${FRAME} group block transition-colors hover:border-primary/50`}>
        <p className="flex items-start justify-between gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
          {study.title}
          <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{study.oneLiner}</p>
        {study.results[0] && (
          <p className="mt-2 text-xs text-foreground/80">
            <span className="font-bold tabular-nums">{study.results[0].metric}</span> {study.results[0].label}
          </p>
        )}
      </Link>
    );
  }
  const studies = card.slugs.map((slug) => caseStudyBySlug.get(slug)).filter((study) => study !== undefined);
  if (studies.length < 2) return null;
  return (
    <div className={FRAME}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary-text">Side by side</p>
      <div className="mt-2 flex flex-col gap-3">
        {studies.map((study) => (
          <div key={study.slug} className="border-l-2 border-primary/30 pl-3">
            <Link href={getCaseStudyPath(study.slug)} className="text-sm font-semibold text-foreground hover:text-primary">
              {study.title}
            </Link>
            <p className="mt-0.5 text-xs text-foreground/80">
              <span className="font-bold tabular-nums">{study.results[0]?.metric}</span> {study.results[0]?.label}
            </p>
            <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{study.stack.slice(0, 4).join(" · ")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{study.ownershipSummary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
