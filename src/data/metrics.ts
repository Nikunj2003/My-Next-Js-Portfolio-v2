import type { MetricId } from "@/data/metric-ids";

/**
 * Every measured figure in the portfolio, with how it was measured.
 *
 * `get_metric` answers from this list (and only this list), case studies show
 * the context as "how measured" notes, and answer cards point at an entry by id.
 * Written for visitors as much as for the model: third person, plain.
 */
export interface MetricEntry {
  /** Stable id: results, cards and pillars point at it. */
  id: MetricId;
  keys: string[];
  value: string;
  context: string;
  source: string;
}

export const METRICS: MetricEntry[] = [
  {
    id: "mcp-servers",
    keys: ["mcp server", "mcp servers", "servers", "registry size"],
    value: "10+",
    context:
      "Production MCP servers Nikunj delivered into ArmorCode's shared enterprise registry. Others in the same registry were built by teammates against the same policy, so this is his contribution rather than the registry total.",
    source: "Governed MCP Tool Registry",
  },
  {
    id: "auth-checks",
    keys: ["authorization", "authorization checks", "permission tier", "tiers"],
    value: "20 of 20",
    context: "Authorization checks passing across three permission tiers on a 23-tool integration.",
    source: "Governed MCP Tool Registry",
  },
  {
    id: "ai-surfaces",
    keys: ["ai surface", "ai surfaces", "surfaces", "evaluated", "scored"],
    value: "9",
    context:
      "AI surfaces scored against golden datasets: prompts, models, agents, skills, MCP tool calls, and retrieval.",
    source: "LLM Evaluation Platform",
  },
  {
    id: "judge-kappa",
    keys: ["kappa", "cohen", "judge", "agreement", "inter rater"],
    value: "≥ 0.7",
    context:
      "Cohen's kappa a judge model must reach against held-out human labels before its scores are allowed to gate any release. Rechecked quarterly.",
    source: "LLM Evaluation Platform",
  },
  {
    id: "kg-entities",
    keys: ["entities", "entity", "knowledge graph size", "1m", "corpus"],
    value: "1M+",
    context:
      "Entities in the production knowledge graph across four content sources: test cases, support documentation, RCA items, and release notes.",
    source: "Knowledge Graph RAG",
  },
  {
    id: "retrieval-modes",
    keys: ["query mode", "modes", "retrieval mode", "five modes"],
    value: "5",
    context:
      "Retrieval modes benchmarked (naive, local, global, hybrid, mix) into a documented mode-per-tool policy, scored on recall within the top k results, mean reciprocal rank, and context precision.",
    source: "Knowledge Graph RAG",
  },
  {
    id: "business-functions",
    keys: ["business function", "functions", "teams served"],
    value: "20+",
    context:
      "Business functions reachable by Slack-accessible agents through Agentic Office OS, which Nikunj co-built with teammates.",
    source: "Agentic Office OS",
  },
  {
    id: "gateway-cost",
    keys: ["cost", "spend", "gateway cost"],
    value: "57%",
    context:
      "Share of LiteLLM gateway cost traced to 10+ automations across 50,000+ requests, root-caused to a bulk historical backfill rather than the model. Fixed by model migration and prompt caching. A deterministic rewrite was documented as worth a further ~95% reduction. Percentages only — absolute internal spend is not published.",
    source: "LiteLLM gateway",
  },
  {
    id: "empty-queries",
    keys: ["empty queries", "outage", "zero content", "failing queries"],
    value: "100+ → 0",
    context:
      "Codebase-search queries returning zero content before the fix; two independent root causes were isolated by reading SDK source and host internals.",
    source: "Governed MCP Tool Registry",
  },
  {
    id: "platform-subagents",
    keys: ["sub agent", "sub agents", "platform agent", "migration"],
    value: "2 of 6",
    context:
      "Platform agent sub-agents Nikunj helped migrate from LangChain4j to Spring AI during his internship, reimplementing memory and evaluation integrations.",
    source: "ArmorCode internship",
  },
  {
    id: "online-sampling",
    keys: ["online", "drift", "live traffic", "sample"],
    value: "5–10%",
    context: "Share of live production traffic scored continuously to catch quality drift.",
    source: "LLM Evaluation Platform",
  },
  {
    id: "efs-throttling",
    keys: ["efs", "storage throughput", "throttling", "14 minutes", "copy time", "burst credit"],
    value: "76 KB in 14 minutes",
    context:
      "The copy time that identified the cause of a service crash loop as storage-throughput throttling rather than an application defect: latency uncorrelated with data volume is the signature of a credit-based volume running at baseline.",
    source: "Code Intelligence Gateway",
  },
  {
    id: "searchable-repos",
    keys: ["repositories", "repos", "product repositories", "8 repositories", "codebase search scope"],
    value: "8",
    context:
      "Product repositories searchable by agents through the code intelligence gateway, indexed locally and refreshed on an interval the gateway owns.",
    source: "Code Intelligence Gateway",
  },
  {
    id: "context-steps",
    keys: ["context enrichment", "enrichment steps", "clarification", "clarification gate", "4 steps"],
    value: "4",
    context:
      "Sequential context-enrichment steps that must complete before the documentation agent drafts anything: deep ticket pull, codebase search, clarification questions, then the existing flow. The clarification gate blocks drafting until open questions are answered.",
    source: "Documentation Automation Platform",
  },
  {
    id: "bi-dashboards",
    keys: ["dashboards", "19 dashboards", "parity", "superset", "bi parity"],
    value: "19",
    context:
      "Dashboards migrated to full parity with the vendor reporting tool being replaced, served from a self-hosted platform with row-level access control.",
    source: "Business Data Layer for Agents",
  },
  {
    id: "serving-tables",
    keys: ["serving tables", "schema size", "tables pruned"],
    value: "32 → 12",
    context:
      "Serving tables after pruning an over-scoped schema down to only those whose every column traces to a surface that reads it.",
    source: "Business Data Layer for Agents",
  },
  {
    id: "quill-tiers",
    keys: ["permission tiers quill", "quill rbac", "github tiers", "3 tiers"],
    value: "3",
    context:
      "Permission tiers enforced in Quill, the review app within the AI documentation automation workflow — read-only, write, and full access — resolved live from GitHub. Quill supports review of agent-created documentation PRs before merged changes sync to Zendesk.",
    source: "Quill",
  },
  {
    id: "proxy-backends",
    keys: ["backends", "providers", "6 backends", "provider count"],
    value: "6",
    context:
      "Model provider backends reachable through one compatible API surface in the open-source gateway, with health-tracked routing and automatic recovery of providers that were temporarily unhealthy.",
    source: "CodeNex AI API Proxy",
  },
  {
    id: "fantasy-resolution",
    keys: ["sports queries", "fantasy gpt", "query resolution"],
    value: "98%",
    context:
      "Complex sports queries resolved end to end by Fantasy GPT, a multi-step SQL RAG system on a fine-tuned in-house model answering against live match data in under thirty seconds.",
    source: "Fantasy GPT",
  },
  {
    id: "aiko-languages",
    keys: ["languages", "20+ languages", "multilingual", "commentary languages", "aiko"],
    value: "20+",
    context:
      "Languages supported by AIKO for live commentary and voice conversation, with persona-driven highlight generation. Presented at IBC 2024 in Amsterdam.",
    source: "AIKO",
  },
  {
    id: "case-study-count",
    keys: ["case studies", "case study count", "how many case studies", "write ups"],
    value: "13",
    context:
      "Deep-dive case studies published on the site, grouped by theme at /work: agent systems, retrieval and context, platform and reliability, and AI products.",
    source: "Portfolio",
  },
];
