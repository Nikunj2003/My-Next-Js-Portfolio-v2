import { caseStudies, caseStudyBySlug, getCaseStudyPath } from "@/data/case-studies";
import { bulletText, experiences, personalInfo, projects, stats } from "@/data/portfolio";
import { getProjectAnchor, normalizeText } from "@/lib/ai-twin";

/**
 * Tools the AI Twin can call.
 *
 * Every tool is a pure function over data already in the repo — no network, no
 * database — so a call costs microseconds and the only failure mode is
 * "not found", which each tool reports honestly rather than guessing.
 */

export type ToolName =
  | "search_work"
  | "get_case_study"
  | "get_metric"
  | "compare_systems"
  | "navigate_to";

export interface ToolCallRequest {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolCallResult {
  id: string;
  name: string;
  /** Serialised back to the model. */
  output: unknown;
  /** Rendered in the client's trace footer. */
  summary: string;
  /** Sources this call grounded the answer in, for the trace. */
  sources: string[];
  /** True when the tool deliberately declined or found nothing. */
  refused?: boolean;
  durationMs: number;
}

/* ------------------------------------------------------------------ *
 * Tool schemas, in the OpenAI `tools` format the provider expects.
 * ------------------------------------------------------------------ */

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "search_work",
      description:
        "Search across Nikunj's production systems (case studies), personal projects, and experience bullets. Use this first for any question about what he has built, worked on, or is capable of.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What to look for, e.g. 'tenant isolation', 'evaluation', 'Go', 'cost'.",
          },
          kind: {
            type: "string",
            enum: ["all", "systems", "projects", "experience"],
            description: "Optionally narrow the search. Defaults to all.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_case_study",
      description:
        "Retrieve the full detail of one production system: problem, constraints, architecture decisions with rejected alternatives, measured results, stack, and the ownership boundary. Use when the visitor asks how something works or wants depth.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            enum: caseStudies.map((study) => study.slug),
            description: "Which case study to read.",
          },
          section: {
            type: "string",
            enum: ["all", "problem", "constraints", "decisions", "results", "ownership", "detail"],
            description: "Optionally fetch one section instead of everything.",
          },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_metric",
      description:
        "Look up a specific measured number with its measurement context. ALWAYS use this before stating any figure. If the metric is not in the portfolio it returns measured:false — say so plainly rather than estimating.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The metric being asked about, e.g. 'MCP servers', 'kappa', 'entities', 'cost'.",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_systems",
      description:
        "Compare two or more production systems side by side on stack, measured results, and ownership.",
      parameters: {
        type: "object",
        properties: {
          slugs: {
            type: "array",
            items: { type: "string", enum: caseStudies.map((study) => study.slug) },
            description: "Two or more case study slugs.",
          },
        },
        required: ["slugs"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "navigate_to",
      description:
        "Take the visitor to a section or page on this site. Use it when showing something is more useful than describing it. Only targets on the allow-list work.",
      parameters: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description:
              "A section anchor (#about, #experience, #work, #skills, #contact), a case study slug, or a project slug.",
          },
        },
        required: ["target"],
      },
    },
  },
];

/* ------------------------------------------------------------------ *
 * search_work
 * ------------------------------------------------------------------ */

interface SearchHit {
  kind: "system" | "project" | "experience";
  id: string;
  title: string;
  snippet: string;
  link?: string;
  score: number;
}

function scoreText(haystack: string, terms: string[]) {
  const corpus = normalizeText(haystack);
  return terms.reduce((total, term) => (corpus.includes(term) ? total + term.length : total), 0);
}

function searchWork(query: string, kind: string = "all"): { hits: Omit<SearchHit, "score">[]; sources: string[] } {
  // Multi-term so "tenant isolation" matches text containing either word.
  //
  // A >2 filter used to drop every short term, which meant the tool's own
  // documented example query ("Go") returned nothing — and so did "AI", "n8n",
  // and "RAG". Single characters are still dropped as noise, but real
  // two-character technology names have to survive.
  const allTerms = normalizeText(query).split(" ").filter(Boolean);
  const terms = allTerms.filter((term) => term.length > 2);
  if (terms.length === 0) {
    // Nothing long enough survived, so fall back to the two-character terms
    // rather than reporting no matches for a legitimate query.
    terms.push(...allTerms.filter((term) => term.length === 2));
  }
  if (terms.length === 0) return { hits: [], sources: [] };

  const hits: SearchHit[] = [];

  if (kind === "all" || kind === "systems") {
    for (const study of caseStudies) {
      const haystack = [
        study.title,
        study.oneLiner,
        study.problem,
        study.summary,
        ...study.tags,
        ...study.aliases,
        ...study.stack,
        ...study.constraints,
        ...study.decisions.map((d) => `${d.choice} ${d.why}`),
        ...study.sections.map((s) => `${s.heading} ${s.body} ${(s.points ?? []).join(" ")}`),
      ].join(" ");

      const score = scoreText(haystack, terms);
      if (score > 0) {
        hits.push({
          kind: "system",
          id: study.slug,
          title: study.title,
          snippet: study.oneLiner,
          link: getCaseStudyPath(study.slug),
          score: score + 8, // production systems outrank side projects
        });
      }
    }
  }

  if (kind === "all" || kind === "projects") {
    for (const project of projects) {
      const haystack = [project.title, project.summary, project.description, project.impact, project.role, ...project.tech].join(" ");
      const score = scoreText(haystack, terms);
      if (score > 0) {
        hits.push({
          kind: "project",
          id: project.slug,
          title: project.title,
          snippet: project.summary,
          link: project.live ?? project.github,
          score,
        });
      }
    }
  }

  if (kind === "all" || kind === "experience") {
    for (const experience of experiences) {
      for (const bullet of experience.bullets) {
        const text = bulletText(bullet);
        const score = scoreText(text, terms);
        if (score > 0) {
          hits.push({
            kind: "experience",
            id: `${experience.company} — ${experience.role}`,
            title: `${experience.role} at ${experience.company}`,
            snippet: text,
            score,
          });
        }
      }
    }
  }

  const ranked = hits.sort((a, b) => b.score - a.score).slice(0, 6);

  return {
    hits: ranked.map((hit) => ({
      kind: hit.kind,
      id: hit.id,
      title: hit.title,
      snippet: hit.snippet,
      link: hit.link,
    })),
    sources: ranked.map((hit) => hit.title),
  };
}

/* ------------------------------------------------------------------ *
 * get_metric — the tool that must be able to say "not measured"
 * ------------------------------------------------------------------ */

interface MetricEntry {
  keys: string[];
  value: string;
  context: string;
  source: string;
}

const METRICS: MetricEntry[] = [
  {
    keys: ["mcp server", "mcp servers", "servers", "registry size", "10+"],
    value: "10+",
    context:
      "Production MCP servers Nikunj delivered into ArmorCode's shared enterprise registry. Others in the same registry were built by teammates against the same policy, so this is his contribution rather than the registry total.",
    source: "Governed MCP Tool Registry",
  },
  {
    keys: ["authorization", "authorization checks", "permission tier", "tiers", "20 of 20"],
    value: "20 of 20",
    context: "Authorization checks passing across three permission tiers on a 23-tool integration.",
    source: "Governed MCP Tool Registry",
  },
  {
    keys: ["ai surface", "ai surfaces", "surfaces", "evaluated", "scored"],
    value: "9",
    context:
      "AI surfaces scored against golden datasets: prompts, models, agents, skills, MCP tool calls, and retrieval.",
    source: "LLM Evaluation Platform",
  },
  {
    keys: ["kappa", "cohen", "judge", "agreement", "inter rater"],
    value: "≥ 0.7",
    context:
      "Cohen's kappa a judge model must reach against held-out human labels before its scores are allowed to gate any release. Rechecked quarterly.",
    source: "LLM Evaluation Platform",
  },
  {
    keys: ["entities", "entity", "knowledge graph size", "1m", "corpus"],
    value: "1M+",
    context:
      "Entities in the production knowledge graph across four content sources: test cases, support documentation, RCA items, and release notes.",
    source: "Knowledge Graph RAG",
  },
  {
    keys: ["query mode", "modes", "retrieval mode", "five modes"],
    value: "5",
    context:
      "Retrieval modes benchmarked (naive, local, global, hybrid, mix) into a documented mode-per-tool policy, scored on recall within the top k results, mean reciprocal rank, and context precision.",
    source: "Knowledge Graph RAG",
  },
  {
    keys: ["business function", "functions", "teams served", "8"],
    value: "8+",
    context:
      "Business functions reachable by Slack-accessible agents through Agentic Office OS, which Nikunj co-built with teammates.",
    source: "Agentic Office OS",
  },
  {
    keys: ["cost", "spend", "gateway cost", "57"],
    value: "57%",
    context:
      "Share of LiteLLM gateway cost traced to 10+ automations across 50,000+ requests, root-caused to a bulk historical backfill rather than the model. Fixed by model migration and prompt caching. A deterministic rewrite was documented as worth a further ~95% reduction. Percentages only — absolute internal spend is not published.",
    source: "LiteLLM gateway",
  },
  {
    keys: ["empty queries", "100", "outage", "zero content", "failing queries"],
    value: "100+ → 0",
    context:
      "Codebase-search queries returning zero content before the fix; two independent root causes were isolated by reading SDK source and host internals.",
    source: "Governed MCP Tool Registry",
  },
  {
    keys: ["sub agent", "sub agents", "anya", "migration", "2 of 6"],
    value: "2 of 6",
    context:
      "Anya sub-agents Nikunj helped migrate from LangChain4j to Spring AI during his internship, reimplementing memory and evaluation integrations.",
    source: "ArmorCode internship",
  },
  {
    keys: ["online", "drift", "live traffic", "sample"],
    value: "5–10%",
    context: "Share of live production traffic scored continuously to catch quality drift.",
    source: "LLM Evaluation Platform",
  },
  {
    keys: ["efs", "storage throughput", "throttling", "76 kb", "14 minutes", "copy time", "burst credit"],
    value: "76 KB in 14 minutes",
    context:
      "The copy time that identified the cause of a service crash loop as storage-throughput throttling rather than an application defect: latency uncorrelated with data volume is the signature of a credit-based volume running at baseline.",
    source: "Code Intelligence Gateway",
  },
  {
    keys: ["repositories", "repos", "product repositories", "8 repositories", "codebase search scope"],
    value: "8",
    context:
      "Product repositories searchable by agents through the code intelligence gateway, indexed locally and refreshed on an interval the gateway owns.",
    source: "Code Intelligence Gateway",
  },
  {
    keys: ["context enrichment", "enrichment steps", "clarification", "clarification gate", "4 steps"],
    value: "4",
    context:
      "Sequential context-enrichment steps that must complete before the documentation agent drafts anything: deep ticket pull, codebase search, clarification questions, then the existing flow. The clarification gate blocks drafting until open questions are answered.",
    source: "Documentation Automation Platform",
  },
  {
    keys: ["dashboards", "19 dashboards", "parity", "superset", "bi parity"],
    value: "19",
    context:
      "Dashboards migrated to full parity with the vendor reporting tool being replaced, served from a self-hosted platform with row-level access control.",
    source: "Business Data Layer for Agents",
  },
  {
    keys: ["serving tables", "schema size", "32 to 12", "tables pruned"],
    value: "32 → 12",
    context:
      "Serving tables after pruning an over-scoped schema down to only those whose every column traces to a surface that reads it.",
    source: "Business Data Layer for Agents",
  },
  {
    keys: ["permission tiers quill", "quill rbac", "github tiers", "3 tiers"],
    value: "3",
    context:
      "Permission tiers enforced in Quill — read-only, write, and full access — all resolved live from the source-control platform, with no application-managed access list to drift.",
    source: "Quill",
  },
  {
    keys: ["backends", "providers", "6 backends", "provider count"],
    value: "6",
    context:
      "Model provider backends reachable through one compatible API surface in the open-source gateway, with health-tracked routing and automatic recovery of providers that were temporarily unhealthy.",
    source: "CodeNex AI API Proxy",
  },
  {
    keys: ["sports queries", "fantasy gpt", "98%", "query resolution"],
    value: "98%",
    context:
      "Complex sports queries resolved end to end by Fantasy GPT, a multi-step SQL RAG system on a fine-tuned in-house model answering against live match data in under thirty seconds.",
    source: "Fantasy GPT",
  },
  {
    keys: ["languages", "20+ languages", "multilingual", "commentary languages", "aiko"],
    value: "20+",
    context:
      "Languages supported by AIKO for live commentary and voice conversation, with persona-driven highlight generation. Presented at IBC 2024 in Amsterdam.",
    source: "AIKO",
  },
  {
    keys: ["case studies", "case study count", "how many case studies", "write ups"],
    value: "13",
    context:
      "Deep-dive case studies published on the site, grouped by theme at /work: agent systems, retrieval and context, platform and reliability, and AI products.",
    source: "Portfolio",
  },
];

function getMetric(name: string) {
  const query = normalizeText(name);
  if (!query) {
    return { measured: false as const, reason: "No metric name given." };
  }

  /**
   * Scored rather than first-match.
   *
   * `find` with bidirectional substring matching let a short key swallow a longer
   * query: the key "8" sits earlier in METRICS than "8 repositories", so asking
   * for repositories returned the business-functions figure — and "3 tiers"
   * returned "20 of 20". A tool whose contract is "never state an unverified
   * number" returning a confidently wrong one is the worst possible failure, so
   * matches are ranked by how much of the key the query actually accounts for
   * and ties go to the longest key.
   */
  const scored = METRICS.flatMap((metric) => {
    const scores = metric.keys.map((key) => {
      const k = normalizeText(key);
      if (!k) return 0;
      if (k === query) return 1000 + k.length; // exact key wins outright
      if (query.includes(k)) return k.length; // key is contained in the question
      if (k.includes(query)) return query.length - (k.length - query.length) / 100; // partial, penalised by overshoot
      return 0;
    });
    const best = Math.max(...scores, 0);
    return best > 0 ? [{ metric, score: best }] : [];
  }).sort((a, b) => b.score - a.score);

  const match = scored[0]?.metric;

  if (!match) {
    return {
      measured: false as const,
      reason: `"${name}" is not a metric published in this portfolio. Say plainly that it is not measured or not published rather than estimating a value. You may describe what IS measured for the related system instead.`,
      availableMetrics: METRICS.map((metric) => metric.keys[0]),
    };
  }

  return { measured: true as const, value: match.value, context: match.context, source: match.source };
}

/* ------------------------------------------------------------------ *
 * navigate_to — allow-listed, so the model cannot invent a destination
 * ------------------------------------------------------------------ */

const SECTION_TARGETS: Record<string, string> = {
  about: "#about",
  experience: "#experience",
  work: "#work",
  projects: "#work",
  "case studies": "/work",
  "all work": "/work",
  skills: "#skills",
  contact: "#contact",
  "ai twin": "#ai-twin",
  hero: "#hero",
};

function navigateTo(target: string) {
  const query = normalizeText(target).replace(/^#/, "");

  const section = SECTION_TARGETS[query] ?? SECTION_TARGETS[query.replace(/ section$/, "")];
  if (section) {
    return { ok: true as const, href: section, label: `${query} section` };
  }

  // Case studies are matched before projects on purpose. Several slugs exist as
  // both (CodeNex, Serenify, the API proxy), and the case study is the better
  // destination: same subject, far more depth than the project card.
  const study = caseStudies.find(
    (candidate) => normalizeText(candidate.slug) === query || normalizeText(candidate.title) === query
  );
  if (study) {
    return { ok: true as const, href: getCaseStudyPath(study.slug), label: `${study.title} case study` };
  }

  const project = projects.find(
    (candidate) => normalizeText(candidate.slug) === query || normalizeText(candidate.title) === query
  );
  if (project) {
    return { ok: true as const, href: getProjectAnchor(project.slug), label: project.title };
  }

  if (query === "resume" || query === "cv") {
    return { ok: true as const, href: personalInfo.resumeUrl, label: "resume" };
  }

  return {
    ok: false as const,
    reason: `"${target}" is not a valid destination on this site. Valid targets: ${Object.keys(SECTION_TARGETS).join(", ")}, any case study slug, any project slug, or "resume".`,
  };
}

/* ------------------------------------------------------------------ *
 * Dispatch
 * ------------------------------------------------------------------ */

function truncateArg(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text && text.length > 48 ? `${text.slice(0, 45)}...` : text ?? "";
}

export function formatToolCall(name: string, args: Record<string, unknown>) {
  const primary = args.query ?? args.slug ?? args.name ?? args.target ?? args.slugs;
  return `${name}(${primary === undefined ? "" : `"${truncateArg(primary)}"`})`;
}

/**
 * Normalises a list argument that a model may send in any of three shapes.
 *
 * Observed live from the same model on the same question: a real array,
 * `"a,b"`, and `'["a","b"]'` (a JSON-encoded array inside a string). The
 * schema asks for an array, but refusing the other two makes the assistant
 * look like it lacks the data when it simply disliked the wrapper.
 */
function coerceStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value !== "string") return [];

  const trimmed = value.trim();

  // A JSON-encoded array arrives as a string; unwrap it before splitting, or
  // the brackets and quotes end up inside the slugs.
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((item) => item.trim()).filter(Boolean);
      }
    } catch {
      // Fall through to delimiter splitting.
    }
  }

  return trimmed
    .split(/[,\s]+/)
    .map((item) => item.trim().replace(/^["'\[]+|["'\]]+$/g, ""))
    .filter(Boolean);
}

export function executeTool(request: ToolCallRequest): ToolCallResult {
  const startedAt = Date.now();
  const { name, args } = request;

  const finish = (
    output: unknown,
    summary: string,
    sources: string[] = [],
    refused = false
  ): ToolCallResult => ({
    id: request.id,
    name,
    output,
    summary,
    sources,
    refused,
    durationMs: Date.now() - startedAt,
  });

  switch (name) {
    case "search_work": {
      const { hits, sources } = searchWork(String(args.query ?? ""), String(args.kind ?? "all"));
      return finish(
        hits.length > 0 ? { hits } : { hits: [], note: "No matches. Do not invent work that is not listed." },
        hits.length > 0 ? `${hits.length} match${hits.length === 1 ? "" : "es"}` : "no matches",
        sources,
        hits.length === 0
      );
    }

    case "get_case_study": {
      const study = caseStudyBySlug.get(String(args.slug ?? ""));
      if (!study) {
        return finish({ found: false }, "not found", [], true);
      }

      const section = String(args.section ?? "all");
      const base = { title: study.title, employer: study.employer, period: study.period, link: getCaseStudyPath(study.slug) };

      const pick: Record<string, unknown> = {
        problem: { ...base, problem: study.problem },
        constraints: { ...base, constraints: study.constraints },
        decisions: { ...base, decisions: study.decisions },
        results: { ...base, results: study.results },
        ownership: { ...base, ownership: study.ownership },
        detail: { ...base, sections: study.sections },
      };

      return finish(
        section !== "all" && pick[section] ? pick[section] : { ...base, ...study },
        section === "all" ? "full case study" : section,
        [study.title]
      );
    }

    case "get_metric": {
      const result = getMetric(String(args.name ?? ""));
      return finish(
        result,
        result.measured ? `${result.value}` : "not measured",
        result.measured ? [result.source] : [],
        !result.measured
      );
    }

    case "compare_systems": {
      /*
       * Accepts an array OR a delimited string.
       *
       * The schema asks for an array, but models routinely send
       * `"a,b"` instead — observed live: valid slugs arrived as one joined
       * string, `Array.isArray` rejected them, and the tool refused a request
       * it could plainly have served. Refusing on a formatting quirk reads to
       * the visitor as "the data isn't there", which is a worse failure than
       * being lenient about the wrapper.
       */
      const slugs = coerceStringList(args.slugs);
      const found = slugs.map((slug) => caseStudyBySlug.get(slug)).filter((study) => study !== undefined);

      if (found.length < 2) {
        // Tells the model how to recover instead of only that it failed.
        // A bare "need two slugs" left it with nothing to do, and it emitted an
        // empty answer — the visitor then saw the generic fallback for a
        // question that was perfectly answerable.
        return finish(
          {
            ok: false,
            reason:
              "compare_systems needs at least two valid slugs in the `slugs` array. " +
              `Received: ${slugs.length > 0 ? slugs.join(", ") : "none"}. ` +
              "Retry with two or more slugs, or call get_case_study once per system and compare the results yourself.",
          },
          "too few systems",
          [],
          true
        );
      }

      return finish(
        {
          systems: found.map((study) => ({
            title: study.title,
            link: getCaseStudyPath(study.slug),
            stack: study.stack,
            results: study.results,
            ownership: study.ownership,
          })),
        },
        `${found.length} systems`,
        found.map((study) => study.title)
      );
    }

    case "navigate_to": {
      const result = navigateTo(String(args.target ?? ""));
      return finish(result, result.ok ? result.label : "invalid target", [], !result.ok);
    }

    default:
      return finish(
        { ok: false, reason: `Unknown tool "${name}".` },
        "unknown tool",
        [],
        true
      );
  }
}

/** Exposed for the site's own stats surface and for tests. */
export const TOOL_NAMES = TOOL_DEFINITIONS.map((tool) => tool.function.name);
export const PROFILE_STAT_COUNT = stats.length;
