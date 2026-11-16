import type { CaseStudySlug } from "@/data/case-studies";
import type { MetricId } from "@/data/metric-ids";

/**
 * The one argument the site makes, and the four pillars it rests on.
 *
 * The hero, About, the case studies and Nex's prompt all read this, so the
 * story can't drift between them. Each pillar points at one measured figure
 * (`METRICS`, by id) and, where one exists, the case study that proves it.
 */
export type PillarId = "quality" | "tools" | "retrieval" | "cost";

export interface Pillar {
  id: PillarId;
  label: string;
  /** One line: what this pillar claims. */
  claim: string;
  metricId: MetricId;
  /** The study that proves it, or null when no single study does. */
  studySlug: CaseStudySlug | null;
  /** What a visitor asks Nex to see the evidence. */
  askPrompt: string;
}

export const THESIS = "Nikunj makes LLM systems trustworthy in production.";

export const PILLARS: readonly Pillar[] = [
  {
    id: "quality",
    label: "Measured quality",
    claim: "Every prompt, model and agent change is gated on measured accuracy.",
    metricId: "ai-surfaces",
    studySlug: "llm-evaluation-platform",
    askPrompt: "How does Nikunj measure LLM quality before a release?",
  },
  {
    id: "tools",
    label: "Governed tools",
    claim: "Agents reach production systems only through governed, audited tools.",
    metricId: "mcp-servers",
    studySlug: "governed-mcp-registry",
    askPrompt: "How does Nikunj govern the tools his agents can call?",
  },
  {
    id: "retrieval",
    label: "Grounded retrieval",
    claim: "Answers come from scoped, current knowledge, with every failure layer measured.",
    metricId: "kg-entities",
    studySlug: "knowledge-graph-rag",
    askPrompt: "How does Nikunj keep retrieval grounded at a million entities?",
  },
  {
    id: "cost",
    label: "Controlled cost",
    claim: "Spend is traced to its cause and fixed at the cause, not the model.",
    metricId: "gateway-cost",
    studySlug: null,
    askPrompt: "How did Nikunj trace 57% of the gateway's cost to one cause?",
  },
];

export const PILLAR_IDS = PILLARS.map((pillar) => pillar.id);

export function pillarById(id: PillarId) {
  return PILLARS.find((pillar) => pillar.id === id)!;
}
