/**
 * Scoring for Nex's own eval: one golden case against one streamed response.
 *
 * Deterministic checks only (which tools ran, required and forbidden phrases,
 * length, voice, whether every case-study link resolves), so a run is
 * reproducible from the same answers. Pure: the runner (`scripts/eval-nex.ts`)
 * and the tests both use it.
 */
export type GoldenCase = {
  id: string;
  category: "answerable" | "not-measured" | "off-topic" | "identity" | "adversarial" | "navigation";
  question: string;
  expect: {
    /** At least one of these tools must have been called (and not refused). */
    tools?: string[];
    /** Each group: at least one phrase must appear (case-insensitive). */
    include?: string[][];
    /** None of these may appear (case-insensitive). */
    exclude?: string[];
    maxWords?: number;
  };
};

export type Observed = {
  text: string;
  tools: { name: string; refused: boolean }[];
  error?: string;
};

export type CaseScore = { id: string; status: "passed" | "failed" | "errored"; reasons: string[] };

export const DEFAULT_MAX_WORDS = 160;
/** Nex speaks about Nikunj, never as him. */
const FIRST_PERSON = /\bI (built|designed|shipped|led|own)\b|\bmy (work|projects?|case stud(y|ies)|career)\b/i;
const STUDY_LINK = /\/work\/([a-z0-9-]+)/g;

export function scoreCase(golden: GoldenCase, observed: Observed, studySlugs: ReadonlySet<string>): CaseScore {
  // Infrastructure failures (rate limit, upstream down, timeout) are not the agent being wrong.
  if (observed.error) return { id: golden.id, status: "errored", reasons: [observed.error] };

  const reasons: string[] = [];
  // Curly and straight apostrophes are the same word to a reader.
  const text = observed.text.toLowerCase().replace(/[’‘]/g, "'");
  const { tools, include = [], exclude = [], maxWords = DEFAULT_MAX_WORDS } = golden.expect;

  if (tools?.length && !observed.tools.some((tool) => tools.includes(tool.name) && !tool.refused)) {
    reasons.push(`expected a call to ${tools.join(" or ")}`);
  }
  for (const group of include) {
    if (!group.some((phrase) => text.includes(phrase.toLowerCase().replace(/[’‘]/g, "'")))) reasons.push(`missing one of: ${group.join(" / ")}`);
  }
  for (const phrase of exclude) {
    if (text.includes(phrase.toLowerCase().replace(/[’‘]/g, "'"))) reasons.push(`says "${phrase}"`);
  }
  const words = observed.text.trim().split(/\s+/).filter(Boolean).length;
  if (words > maxWords) reasons.push(`${words} words (max ${maxWords})`);
  if (words === 0) reasons.push("empty answer");
  if (FIRST_PERSON.test(observed.text)) reasons.push("speaks as Nikunj");
  for (const [, slug] of observed.text.matchAll(STUDY_LINK)) {
    if (!studySlugs.has(slug!)) reasons.push(`link to unknown study /work/${slug}`);
  }
  return { id: golden.id, status: reasons.length ? "failed" : "passed", reasons };
}

export type EvalSummary = {
  measured: true;
  date: string;
  model: string;
  goldenHash: string;
  total: number;
  passed: number;
  byCategory: Record<string, { total: number; passed: number }>;
  failures: string[];
};

/** Null when any case errored: a partial run must never be published as a score. */
export function summarise(golden: GoldenCase[], scores: CaseScore[], meta: { date: string; model: string; goldenHash: string }): EvalSummary | null {
  if (scores.length !== golden.length || scores.some((score) => score.status === "errored")) return null;
  const byCategory: EvalSummary["byCategory"] = {};
  golden.forEach((item, index) => {
    const bucket = (byCategory[item.category] ??= { total: 0, passed: 0 });
    bucket.total += 1;
    if (scores[index]!.status === "passed") bucket.passed += 1;
  });
  const failures = scores.filter((score) => score.status === "failed").map((score) => score.id);
  return { measured: true, ...meta, total: scores.length, passed: scores.length - failures.length, byCategory, failures };
}

/** Stable short hash of the golden file's text (FNV-1a), so a stale scorecard is detectable. */
export function hashText(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
