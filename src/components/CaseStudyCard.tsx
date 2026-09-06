import Link from "next/link";
import { ArrowRight, AudioLines, Blocks, Boxes, Database, BookOpen, FlaskConical, Gauge, HeartPulse, Layers, Network, PenLine, ServerCog, ShieldCheck, Trophy } from "lucide-react";
import { getCaseStudyPath, type CaseStudy } from "@/data/case-studies";
import { SpotlightCard } from "@/components/ui/spotlight-card";

/**
 * Per-study glyph. A slug with no entry falls back to a generic mark rather
 * than breaking, but every shipped study should be listed here.
 */
export const SYSTEM_GLYPHS: Record<string, React.ElementType> = {
  "llm-evaluation-platform": Gauge,
  "governed-mcp-registry": ShieldCheck,
  "code-intelligence-gateway": ServerCog,
  "knowledge-graph-rag": Network,
  "documentation-automation": BookOpen,
  "sentinel-test-agent": FlaskConical,
  "bi-platform": Database,
  quill: PenLine,
  "codenex-ai-proxy": Boxes,
  codenex: Blocks,
  "fantasy-gpt": Trophy,
  aiko: AudioLines,
  serenify: HeartPulse,
};

/**
 * The case-study card, shared by the homepage tier-1 row and the `/work` index
 * so both surfaces stay identical as studies are added.
 *
 * `headingLevel` exists because the two surfaces nest the card differently: the
 * homepage sits under an h3 group label, `/work` under an h2. Hardcoding either
 * one skips a heading level on the other.
 */
const CaseStudyCard = ({
  study,
  headingLevel = "h3",
}: {
  study: CaseStudy;
  headingLevel?: "h3" | "h4";
}) => {
  const Glyph = SYSTEM_GLYPHS[study.slug] ?? Layers;
  const Heading = headingLevel;

  return (
    <SpotlightCard className="group/system h-full transition-colors duration-300 hover:border-primary/30">
      <Link
        href={getCaseStudyPath(study.slug)}
        className="flex h-full flex-col p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* Glyph inline with the title rather than on its own row —
            it was costing ~70px of height for one small icon. */}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary transition-colors duration-300 group-hover/system:border-primary/50">
            <Glyph className="h-4 w-4" />
          </span>
          <Heading className="text-lg font-bold leading-snug tracking-tight text-foreground">{study.title}</Heading>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
          {study.oneLiner}
        </p>

        {/* mt-auto pushes the metrics block to the bottom, so cards align
            there without min-h forcing stretch. */}
        <dl className="mt-auto flex flex-col gap-2.5 pt-6">
          {study.results.slice(0, 2).map((result) => (
            <div key={result.label} className="flex items-baseline gap-2.5">
              <dt className="sr-only">{result.label}</dt>
              <dd className="flex items-baseline gap-2.5">
                <span className="shrink-0 whitespace-nowrap text-xl font-bold leading-none tracking-tighter text-foreground tabular-nums">
                  {result.metric}
                </span>
                <span className="text-xs leading-snug text-muted-foreground">{result.label}</span>
              </dd>
            </div>
          ))}
        </dl>

        {/* Tags and stack merged into one meta line: two separate
            rows of pills was the other half of the height problem. */}
        <p className="mt-5 border-t border-white/10 pt-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground/70">
          {study.stack.slice(0, 4).join(" · ")}
        </p>

        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          Read case study
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/system:translate-x-1 motion-reduce:transition-none" />
        </span>
      </Link>
    </SpotlightCard>
  );
};

export default CaseStudyCard;
