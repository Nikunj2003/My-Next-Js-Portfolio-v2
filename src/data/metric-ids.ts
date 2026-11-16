/**
 * Ids of every entry in `METRICS` (`data/metrics.ts`), on their own so client
 * code (the answer-card parser) can validate an id without bundling the prose.
 * `tests/ai-tools.test.ts` keeps the two lists identical.
 */
export const METRIC_IDS = [
  "mcp-servers",
  "auth-checks",
  "ai-surfaces",
  "judge-kappa",
  "kg-entities",
  "retrieval-modes",
  "business-functions",
  "gateway-cost",
  "empty-queries",
  "platform-subagents",
  "online-sampling",
  "efs-throttling",
  "searchable-repos",
  "context-steps",
  "bi-dashboards",
  "serving-tables",
  "quill-tiers",
  "proxy-backends",
  "fantasy-resolution",
  "aiko-languages",
  "case-study-count",
] as const;

export type MetricId = (typeof METRIC_IDS)[number];

export function isMetricId(value: unknown): value is MetricId {
  return typeof value === "string" && (METRIC_IDS as readonly string[]).includes(value);
}
