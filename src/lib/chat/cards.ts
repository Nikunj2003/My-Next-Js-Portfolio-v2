import { isMetricId, type MetricId } from "@/data/metric-ids";
import { caseStudyIndex } from "@/data/case-study-index";

/**
 * Answer cards: a tool result rendered as a real page component (a measured
 * figure, a case study, a side-by-side comparison) under Nex's answer.
 *
 * The server sets `card` on a tool call only from that tool's own successful
 * output; the model never writes one. The client parses it against local data
 * and renders nothing for anything it doesn't recognise, so a card can only
 * ever show what the site already publishes. Ids only: this module ships with
 * the chat store on every page, so it never imports the metric or study prose.
 */
export type AnswerCard =
  | { kind: "metric"; id: MetricId }
  | { kind: "study"; slug: string }
  | { kind: "compare"; slugs: string[] };

export const CARD_PATTERN = /^(metric|study|compare):[a-z0-9,-]{1,120}$/;
export const MAX_CARDS_PER_ANSWER = 3;

const STUDY_SLUGS = new Set(caseStudyIndex.map((entry) => entry.slug));

export function parseCard(value: unknown): AnswerCard | null {
  if (typeof value !== "string" || !CARD_PATTERN.test(value)) return null;
  const [kind, rest] = value.split(":") as [string, string];
  if (kind === "metric") return isMetricId(rest) ? { kind, id: rest } : null;
  if (kind === "study") return STUDY_SLUGS.has(rest) ? { kind, slug: rest } : null;
  const slugs = [...new Set(rest.split(","))];
  return slugs.length >= 2 && slugs.length <= 4 && slugs.every((slug) => STUDY_SLUGS.has(slug)) ? { kind: "compare", slugs } : null;
}

/** The card for a finished tool call, from the tool's own output. Server side. */
export function cardForToolResult(name: string, refused: boolean | undefined, output: unknown): string | undefined {
  if (refused || !output || typeof output !== "object") return undefined;
  const record = output as Record<string, unknown>;
  let card: string | undefined;
  if (name === "get_metric" && record.measured === true && typeof record.id === "string") card = `metric:${record.id}`;
  if (name === "get_case_study" && typeof record.slug === "string") card = `study:${record.slug}`;
  if (name === "compare_systems" && Array.isArray(record.systems)) {
    const slugs = record.systems.map((system) => (system as { slug?: unknown }).slug).filter((slug): slug is string => typeof slug === "string");
    if (slugs.length >= 2) card = `compare:${slugs.join(",")}`;
  }
  // Too long or malformed: no card rather than a truncated one.
  return card && parseCard(card) ? card : undefined;
}
