export interface CaseStudyDecision {
  choice: string;
  why: string;
  rejected?: string[];
}

export interface CaseStudyResult {
  metric: string;
  label: string;
}

export interface CaseStudySection {
  heading: string;
  body: string;
  points?: string[];
}

/**
 * Index grouping. Capability rather than employer, so a reader matching against a
 * role sees the shape of the work first. A study can plausibly fit two themes —
 * pick the one it would be strongest evidence for.
 */
export type CaseStudyTheme = "agents" | "retrieval" | "platform" | "products";

export const CASE_STUDY_THEMES: { id: CaseStudyTheme; label: string; blurb: string }[] = [
  {
    id: "agents",
    label: "Agent systems",
    blurb: "Agents with real tools, real context, and the evaluation that keeps them honest.",
  },
  {
    id: "retrieval",
    label: "Retrieval & context",
    blurb: "Grounding answers in knowledge that is scoped, current, and measurable.",
  },
  {
    id: "platform",
    label: "Platform & reliability",
    blurb: "The infrastructure agents run on, and the failures that had to be root-caused.",
  },
  {
    id: "products",
    label: "AI products",
    blurb: "End-to-end products where the AI is the experience, not a feature bolted on.",
  },
];

export interface CaseStudy {
  slug: string;
  kind: "system" | "product";
  theme: CaseStudyTheme;
  /**
   * Shown in the homepage tier-1 row, which is a fixed three-column grid.
   * Keep exactly three studies featured; the rest are reached via `/work`.
   */
  featured?: boolean;
  title: string;
  employer?: string;
  period: string;
  oneLiner: string;
  summary: string;
  problem: string;
  constraints: string[];
  diagram: "eval" | "mcp" | "kgrag" | "docs" | "gateway" | null;
  diagramCaption: string;
  decisions: CaseStudyDecision[];
  sections: CaseStudySection[];
  results: CaseStudyResult[];
  stack: string[];
  ownership: string;
  tags: string[];
  /** Extra phrases the AI Twin matches on, beyond title/slug/tags. */
  aliases: string[];
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "llm-evaluation-platform",
    kind: "system",
    theme: "agents",
    featured: true,
    title: "LLM Evaluation Platform",
    employer: "ArmorCode",
    period: "2026",
    oneLiner:
      "An OpenTelemetry and Langfuse platform that gates every prompt, model, agent, and tool change on measured accuracy, latency, and cost.",
    summary:
      "Nine AI surfaces were shipping on assertion. I built the evaluation platform that made all of them measurable before release: golden datasets harvested from work reviewers were already doing, a scorer ladder that spends nothing until it has to, and judge models that must prove themselves against human labels before they are allowed to gate anything.",
    problem:
      "A senior engineer asked whether we had an evaluation framework to justify swapping a production model. We did not. Prompts, models, agents, skills, MCP tools, and retrieval were all changing on reasoning rather than measurement — which meant nobody could say whether a change had improved anything, and a vendor retiring a model turned into a fire drill instead of a scored diff. Rather than defend the gap I filed it as the ticket, then built well past its original scope.",
    constraints: [
      "No new vendors. LiteLLM, Langfuse, LightRAG, and n8n were already self-hosted; the design had to wire together what existed plus one small container.",
      "Two very different audiences: workflow authors who need a UI, and statistical rigour that only a code harness can provide.",
      "Community-tier n8n, so custom span attributes were unavailable and trace tagging had to route through gateway request metadata instead.",
      "Judges are models too. Any LLM-as-judge score had to be proven trustworthy before it could block a release.",
    ],
    diagram: "eval",
    diagramCaption:
      "Producers emit OpenTelemetry gen_ai spans into one collector, which fans out to Langfuse for traces, datasets, and scores. Only the collector and the wire format are hard to change later; every other component stays swappable.",
    decisions: [
      {
        choice: "Instrument at the LiteLLM gateway, not in each workflow",
        why:
          "Because no workflow or agent has direct model access, a single callback line on the proxy instruments every model call in the organization at once — n8n workflows, retrieval extraction and query calls, agent tool use. The chokepoint that existed for governance turned out to be the highest-leverage line of config in the whole design.",
        rejected: [
          "Per-workflow instrumentation — N places to change, N places to drift",
          "Application-level SDK calls in each producer — couples every service to one backend",
        ],
      },
      {
        choice: "OpenTelemetry collector as the single ingest point",
        why:
          "PII redaction, sampling, and batching happen once, in one place, and backends can be swapped or added without touching a single producer. Pointing callbacks straight at the tracing backend works on day one, but bakes in a vendor at the wire.",
        rejected: ["Direct-to-backend OTLP as the permanent design — fine as a shortcut, a lock-in as an architecture"],
      },
      {
        choice: "Langfuse for traces, datasets, prompt registry, and scores",
        why:
          "It gave versioned prompts, datasets of record, annotation queues, and observation-level judges in one surface, on a stack already hosted internally. Evaluated against the alternatives on whether results from a separate code harness could be written back into the same place engineers already look.",
        rejected: [
          "promptfoo — strong for prompt sweeps, weaker as a system of record",
          "DeepEval — good metric library, not a trace and dataset backend",
          "n8n native Evaluations alone — kept, but as a second tier, not the whole answer",
        ],
      },
      {
        choice: "Two evaluation tiers instead of one",
        why:
          "Workflow authors get n8n's built-in Evaluations with Data Table datasets so they can iterate without writing Python. Everything statistical — repeated runs with variance, confusion matrices, sweeps, CI gating — lives in a pytest harness in git. One tier would have either blocked non-engineers or given up rigour.",
      },
      {
        choice: "Error analysis before metric selection",
        why:
          "The rule above all others: no metric before reading 50 real traces. Doing this first repeatedly showed the top failure was something a free deterministic check catches — malformed CSV, empty tool response, wrong repository — and no judge was needed at all. Picking metrics from a list first is the most expensive way to start.",
      },
    ],
    sections: [
      {
        heading: "The scorer ladder, cheapest first",
        body:
          "Every surface is scored by the least expensive method that can actually catch its failures, and only escalates when that is genuinely insufficient.",
        points: [
          "Deterministic code checks — schema validity, label in the allowed set, file paths that exist, symbols that resolve, completeness as a set comparison. Free, and always right.",
          "Statistical metrics — scikit-learn per-class precision, recall, F1, and a confusion matrix. Overall accuracy hides the class that matters, so the minority class is always reported separately with a pre-committed recall floor.",
          "Ragas — faithfulness and answer relevancy for retrieval. Both are reference-free, so they double as online monitors on live traffic.",
          "LLM-as-judge — last resort, for prose where no single right string exists.",
        ],
      },
      {
        heading: "Validating the judges",
        body:
          "A judge is a model making predictions, and it can be wrong. Until a judge agrees with a held-out, human-labeled set at Cohen's kappa of at least 0.7, its scores are not allowed to gate anything. Kappa is rechecked quarterly. This is the step that separates an evaluation system from a second unmeasured model.",
      },
      {
        heading: "Golden datasets that cost nothing to build",
        body:
          "Ground truth arrives free from work people were already doing. Every time a reviewer corrects a generated test-case CSV or a human overrides a suggested severity, that is one labeled example. The system's job was to capture those corrections rather than commission a labeling effort.",
      },
      {
        heading: "Offline gates, online drift",
        body:
          "Offline evaluation runs before release on a fixed dataset as a pass-or-fail gate in Jenkins CI. Online evaluation scores 5–10% of live production traffic continuously, because offline sets never cover everything and quality drifts under a prompt that never changed. Both are needed: one gates changes, the other catches the world moving.",
      },
      {
        heading: "The layer nobody else measures",
        body:
          "Tool descriptions and output formats shape the behavior of every agent that connects to them, so the MCP layer gets its own evaluation. A fixed set of real user intents measures whether an agent picks the right tool on the first call. Running the same intents with 3, 7, 10, and 14 servers enabled shows where selection accuracy bends — which is where registry policy should cap defaults. The same intents across JSON, Markdown, XML, and prose answer 'which output format suits our models' with a number instead of a preference.",
      },
    ],
    results: [
      { metric: "9", label: "AI surfaces scored against golden datasets" },
      { metric: "≥ 0.7", label: "Cohen's kappa required before a judge may gate a release" },
      { metric: "4", label: "scorer tiers, escalating only when the cheaper one cannot catch the failure" },
      { metric: "5–10%", label: "of live traffic scored continuously for drift" },
    ],
    stack: [
      "OpenTelemetry",
      "Langfuse",
      "LiteLLM",
      "Ragas",
      "scikit-learn",
      "pytest",
      "Python",
      "Jenkins",
      "n8n",
      "AWS Bedrock",
      "Grafana",
      "Prometheus",
    ],
    ownership:
      "The evaluation framework, metric catalog, scorer harness, and CI gates are mine. The self-hosted Langfuse deployment underneath it is owned by platform DevOps — a deliberate split between infrastructure ownership and application ownership.",
    tags: ["LLM Evaluation", "Observability", "CI Gates"],
    aliases: ["evaluation", "eval", "evals", "measure", "measurement", "langfuse", "ragas", "judge", "kappa", "golden dataset", "ci gate", "opentelemetry", "observability", "drift"],
  },
  {
    slug: "governed-mcp-registry",
    kind: "system",
    theme: "agents",
    featured: true,
    title: "Governed MCP Tool Registry",
    employer: "ArmorCode",
    period: "2025 – 2026",
    oneLiner:
      "Nine of the fourteen production MCP servers behind a shared enterprise registry, with tool-level authorization under multi-tenant AppSec constraints.",
    summary:
      "Giving agents real tools inside a multi-tenant security platform means a single authorization slip leaks another customer's vulnerability data. I delivered nine of the fourteen production servers in the shared registry, solved the distribution problem for non-technical teams, and root-caused the outage that took the codebase service down on two of three client surfaces.",
    problem:
      "Agents are only as useful as the tools they can reach, and in an AppSec platform the tools reach customer vulnerability data. Every server needed authentication, scoped permissions, explicit denial behavior, and audit attribution before it could be exposed — and then it needed to actually reach the people who needed it, including teams with no terminal and no device management to push configuration for them.",
    constraints: [
      "Multi-tenant AppSec data. A single authorization slip exposes one customer's findings to another.",
      "Claude Enterprise connectors relay through a vendor cloud on a fixed egress range, so they structurally cannot reach VPN-hosted internal endpoints.",
      "The users who needed access most — Customer Success, Product, Documentation — had no terminal, no npx, and no MDM to push configuration on their behalf.",
      "Tool descriptions are part of the interface. Every agent that connects inherits whatever the description implies.",
    ],
    diagram: "mcp",
    diagramCaption:
      "Requests carry identity from the client through the gateway, where RBAC resolves a permission tier before any tool executes. Denials are explicit and attributed rather than silent.",
    decisions: [
      {
        choice: "Desktop extension bundles for distribution",
        why:
          "Each bundle wraps a remote MCP client pointed at the internal HTTPS endpoint, with auth tokens marked sensitive in user configuration. The install path became download, double-click, drag to Applications — no terminal at any step. That was the only option that actually reached a non-technical user without weakening the network boundary.",
        rejected: [
          "Public endpoint with an IP allowlist — exposes internal surface to reach an internal user",
          "Tunnel or reverse proxy — ongoing ops burden and a fragile dependency in the request path",
          "CLI-based client — correct for engineers, unusable for the teams who needed it",
          "Vendor-managed MCP tunnels — wrong product tier for the access pattern",
        ],
      },
      {
        choice: "Permission tiers at the tool level, not the server level",
        why:
          "A single server often exposes both read and write paths over the same data. Gating at the server would have meant either denying useful reads or permitting unreviewed writes, so authorization resolves per tool, with denial explicit and attributed rather than a silent empty result.",
        rejected: ["Server-level allow or deny — too coarse for servers that mix read and write tools"],
      },
      {
        choice: "Continuous integration for the bundle artifacts",
        why:
          "Extension bundles and organization-level agent skills had no structured home and no build pipeline — they were artifacts being produced by hand. Moving them into a repository with automated builds on push and tag closed a real gap in how the tool layer shipped.",
      },
      {
        choice: "One registry as the source of truth",
        why:
          "Fourteen servers across multiple teams drift in naming and capability without a single owner reconciling them. Maintaining the canonical list — and correcting drift against it — is what makes registry policy enforceable rather than advisory.",
      },
    ],
    sections: [
      {
        heading: "When it broke",
        body:
          "The codebase-search service began returning empty answers on two of three client surfaces while the third kept working — the signature of a bug that looks surface-specific and is not. More than a hundred logged calls, none of them successful with content: empty responses, timeouts at just over sixty seconds, and server-unavailable errors. Reading the SDK source and the host runtime turned up two independent root causes.",
        points: [
          "The tool advertised an output schema it could never populate. The handler's second return parameter was a named empty struct, and the SDK derives an output schema from that type, skipping it only when the type is exactly `any`. An empty struct is not `any` — so the tool advertised a schema satisfiable only by an empty object, and returned exactly that alongside the real answer. Clients that support output schemas prefer the structured field, so they read the empty object and discarded every answer. The third surface predated that preference, read the content field, and was unaffected.",
          "The query deadline was measured against the wrong client budget. Two host tiers existed: a main process at 300 seconds and agent runtimes at roughly 60. The deadline was set to 240 seconds — correct for the first tier, unreachable in the second. The failing surfaces were cancelled before it fired, so the gateway's 'still running, call again' recovery path never reached them. The job kept running, the cache filled, and nothing ever collected the result.",
          "Shipped with an isolated two-tool reproduction differing only in the return type, and a negative-control test that fails if the typed return is reinstated. Verified build, vet, and tests across nine packages. Fourteen connectors were flagged carrying the same timeout misconfiguration before anyone hit it.",
        ],
      },
      {
        heading: "Ruling things out",
        body:
          "Two otherwise-obvious fixes were eliminated by reading the host and SDK rather than guessing: the host never passes the flag that resets a timeout on progress, so heartbeats could not extend the deadline; and the SDK discards late results silently on cancellation, so letting the job finish and return would never have delivered anything. Knowing what will not work is most of the value of an RCA.",
      },
      {
        heading: "An earlier failure class",
        body:
          "A separate investigation traced four-minute silent hangs to a server-side idle timeout closing sessions while the client held a dead reference, burning its entire budget before failing — which is why retrying often appeared to work. Both incidents pointed at the same lesson: in a tool protocol, timeout tiers and schema contracts are the interface, and mismatches there present as unrelated symptoms.",
      },
    ],
    results: [
      { metric: "9 of 14", label: "production MCP servers in the shared registry delivered" },
      { metric: "20 / 20", label: "authorization checks passing across three permission tiers" },
      { metric: "100+ → 0", label: "failing queries traced to two independent root causes and fixed" },
      { metric: "14", label: "connectors flagged for the same latent misconfiguration" },
    ],
    stack: [
      "Model Context Protocol",
      "Go",
      "OAuth2",
      "RBAC",
      "Python",
      "n8n",
      "LiteLLM",
      "AWS",
      "Docker",
      "GitHub Actions",
    ],
    ownership:
      "Nine of the fourteen production servers are mine, along with the canonical registry, the distribution mechanism, and the reliability work. The remaining servers were built by teammates against the same registry policy. Which models are approved is a senior engineering decision; I own the configuration and enforcement.",
    tags: ["MCP", "Tool Authorization", "Reliability"],
    aliases: ["mcp", "model context protocol", "tool", "tools", "tool use", "authorization", "permission", "rbac", "oauth", "registry", "rca", "root cause", "debug", "outage", "timeout", "reliability", "governance"],
  },
  {
    slug: "code-intelligence-gateway",
    kind: "system",
    theme: "platform",
    title: "Code Intelligence Gateway",
    employer: "ArmorCode",
    period: "2026",
    oneLiner:
      "A code-search service for agents, taken from container proof of concept to serverless production — then rescued from a storage-throughput failure that no amount of application debugging would have found.",
    summary:
      "Agents answering questions about eight product repositories need a code-search service that stays up. I designed that service, took it from a local container to a serverless deployment, and then root-caused the failure that kept killing it: not a bug in the code, but a shared network filesystem whose throughput credits were being drained by the service's own indexing schedule.",
    problem:
      "The service would not stabilize. Health checks failed, the orchestrator killed the task, and it restarted into the same failure — a crash loop that looked like an application defect. It was not. Every code query read a vector index off a shared network filesystem, and a separate scheduled job re-cloned and re-indexed eight repositories onto that same volume every thirty minutes. The two patterns together exhausted the volume's burst-throughput credits, after which all I/O throttled to baseline, startup reads stalled, and the health endpoint never answered in time.",
    constraints: [
      "Per-request session isolation was required, but spinning up a container per request was impractical — cold start and target registration cost more than the queries themselves.",
      "The failure presented as an application crash loop, so the evidence pointing at storage had to be found rather than reported.",
      "Only the question and the snippets the agent reads may leave the container; the code checkout itself cannot.",
      "The orchestrator's health grace period was zero, so anything slow during startup read as a dead task.",
    ],
    diagram: "gateway",
    diagramCaption:
      "Before: queries and a scheduled re-index both hit the same shared network volume until its throughput credits drained. After: index and checkout are local, the gateway owns its own sync, and startup never blocks the health check.",
    decisions: [
      {
        choice: "Move the index and checkout onto local ephemeral storage",
        why:
          "The index is derived data — it can be rebuilt from source on boot, so it never needed durable shared storage in the first place. Moving it, and the code checkout with it, took the hot read path off the throttled volume entirely. The volume had been doing work that no longer had a reason to be shared.",
        rejected: [
          "Paying for a higher provisioned-throughput storage tier — treats a design mistake as a billing line, and the read pattern would have kept growing into it",
        ],
      },
      {
        choice: "Give the gateway ownership of its own git sync",
        why:
          "The external job that cloned and indexed on a schedule was writing into storage the service depended on, from outside the service's control. Folding that work into the gateway — shallow pulls on an interval it owns — removed the write storm and put the lifecycle in one place. The external job was retired rather than tuned.",
      },
      {
        choice: "Non-blocking startup with an explicit warmup gate",
        why:
          "Health had been gated on slow I/O, which is what turned a throughput problem into a crash loop. Bootstrap now runs in the background so health answers immediately, and queries return an explicit warming-up notice until both the first index and the control-plane copy finish. Correctness and availability are decoupled: the service is honest about not being ready instead of being killed for it, and it never answers from a half-populated checkout.",
        rejected: [
          "Reporting healthy as soon as the process starts — would have stopped the restarts while letting agents query an empty index, trading a loud failure for a silent one",
        ],
      },
      {
        choice: "Serialize git operations behind a mutex",
        why:
          "Three things could trigger a sync — boot, the interval, and a manual trigger — and two passes over the same checkout at once corrupts it. A mutex is the cheapest correct answer to a race that would otherwise appear as random index corruption under load.",
      },
    ],
    sections: [
      {
        heading: "The measurement that identified the cause",
        body:
          "The decisive evidence was a copy that had no business being slow. Moving six files totalling seventy-six kilobytes took fourteen minutes. Latency at that scale cannot be explained by data volume, and nothing in the application touches those files on a hot path — which rules out application-level causes and leaves infrastructure-level throttling as the only explanation that fits.",
        points: [
          "Throughput uncorrelated with payload size is the signature of a credit-based storage tier running at baseline. Once that was the hypothesis, the burst-credit metrics confirmed it directly.",
          "The crash loop was downstream of the throttling, not the cause of it. Reading the symptom as an application defect is what made this expensive to find, and it is the general lesson: a health-check failure names the victim, not the culprit.",
        ],
      },
      {
        heading: "What the service actually is",
        body:
          "A read-only code-search agent over eight product repositories, behind an authenticated gateway with request queueing and per-query session isolation, backed by a locally rebuilt vector index. Specialized agents and domain skills sit on top for documentation generation, feature-flag cataloguing, and configuration discovery. It removed most support escalations to engineering, because the questions that used to need an engineer with repository access can now be asked directly.",
        points: [
          "Session isolation happens at the session layer rather than by isolating infrastructure per request — the compromise that made the cost model workable.",
          "Deployment targets a modern ARM architecture by default with fallback support retained, sized at two virtual CPUs and eight gigabytes, autoscaling on CPU and memory with one task always guaranteed.",
        ],
      },
    ],
    results: [
      { metric: "8", label: "product repositories searchable by agents through one gateway" },
      { metric: "76 KB / 14 min", label: "copy time that identified storage throttling as the root cause" },
      { metric: "0", label: "shared-volume reads left on the query hot path after the fix" },
      { metric: "1 of 2", label: "independent failure classes on this service; the protocol defect is the other" },
    ],
    stack: [
      "Go",
      "Docker",
      "AWS Fargate",
      "AWS ECS",
      "Application Load Balancer",
      "Model Context Protocol",
      "Neo4j",
      "ripgrep",
    ],
    ownership:
      "The service design, the deployment specification, and the root-cause analysis are mine. The infrastructure-as-code and cluster provisioning were executed by platform DevOps against that specification.",
    tags: ["Agent Infrastructure", "Reliability", "Root Cause Analysis"],
    aliases: ["opencode", "codebase search", "code search", "code intelligence", "fargate", "ecs", "efs", "throughput", "burst credits", "storage", "crash loop", "health check", "infrastructure", "capacity", "index", "warmup", "goroutine", "gateway"],
  },
  {
    slug: "knowledge-graph-rag",
    kind: "system",
    theme: "retrieval",
    featured: true,
    title: "Knowledge Graph RAG",
    employer: "ArmorCode",
    period: "2025 – 2026",
    oneLiner:
      "Tenant-scoped retrieval over a million-plus entity knowledge graph, with a five-layer failure taxonomy so a bad answer can be traced to its cause.",
    summary:
      "Agents that answer from product knowledge need retrieval that is both grounded and tenant-isolated. I took the knowledge graph from proof of concept to production over a million-plus entities, wired four content sources in with incremental update paths, and built the evaluation that says which of five possible failures caused any given bad answer.",
    problem:
      "Office OS agents were answering product questions without grounding, and plain vector retrieval could not follow relationships across root-cause analyses, test cases, release notes, and documentation. Multi-tenancy raised the stakes: retrieval had to be scoped so no query could surface another customer's data. And when a retrieval answer is wrong, the cause could be in any of five independent places — scoring only the final answer tells you something is broken but never what.",
    constraints: [
      "Tenant scoping is not optional. Retrieval crosses root-cause analyses and support content, so isolation is a correctness requirement, not a feature.",
      "Four content sources with different shapes and different update cadences, each needing an incremental path rather than a full rebuild.",
      "Graph extraction runs an LLM over source documents, so a cheap model swap there silently degrades the entire graph.",
      "Five query modes existed and tools were choosing between them by convention rather than evidence.",
    ],
    diagram: "kgrag",
    diagramCaption:
      "Four ETL pipelines feed a graph and vector store queried through five retrieval modes. Each of the five layers fails independently, so each is measured independently.",
    decisions: [
      {
        choice: "A graph layer over plain vector retrieval",
        why:
          "The questions that mattered were relational — which connectors changed in releases that also touched authentication — and vector similarity cannot follow that. Entities and relations extracted into a graph, alongside vector search over the same corpus, made multi-hop questions answerable.",
        rejected: ["Vector-only retrieval — fine for lookups, blind to relationships between documents"],
      },
      {
        choice: "Evaluate retrieval per mode, per question type",
        why:
          "Specific lookups, thematic questions, and multi-hop questions win under different modes, which is exactly why mode choice should not be folklore. Running all five modes over a golden set of real questions pulled from production traces — scoring recall@k, MRR, and context precision — produced a documented mode-per-tool policy with numbers behind it.",
        rejected: ["One default mode for all tools — simpler, and measurably worse on two of three question types"],
      },
      {
        choice: "Ingestion integrity as scheduled assertions, not evaluations",
        why:
          "A dedup bug based on titles left dozens of stale documents in the knowledge base, found by a one-off manual scan. Source parity counts, duplicate and stale scans, an idempotency probe that re-ingests a known document, and a freshness lag check now run nightly with alerts. These are assertions with a right answer, not metrics with a threshold — treating them as evaluations would have been a category error.",
      },
      {
        choice: "Gate the graph extraction step on human annotation",
        why:
          "Twenty-five source documents stratified across content types, with humans listing the entities and relations that should be extracted, scored for entity and relation precision and recall plus duplication and orphan rates. It is manual and rare, and it runs before any change to the extraction prompt, model, or chunking — because everything downstream is built on the graph being right.",
      },
    ],
    sections: [
      {
        heading: "Five layers, because it fails five ways",
        body:
          "The system is not one thing: it is an ingestion pipeline, an LLM extracting a graph, a retriever with five modes, a generator, and a service. When an answer is bad, exactly one of these happened — the document never made it in, the graph extracted the wrong entities, the retriever pulled the wrong context, the model ignored good context, or the call timed out. Separate evaluation per layer turns a vague quality complaint into a pointed diagnosis.",
        points: [
          "Ingestion integrity — source parity, duplicate and stale counts, idempotency, freshness lag. Nightly assertions with alerts.",
          "Graph extraction quality — entity and relation precision and recall against human annotation, plus duplication and orphan-entity rates. The evaluation almost everyone skips.",
          "Retrieval quality — recall@k, MRR, and context precision, measured per query mode and per question type.",
          "Answer quality — faithfulness and answer relevancy, reference-free so they also run on live traffic; correctness against golden facts offline.",
          "Operations — p95 latency, timeout rate, empty-result rate, cost per query, and publish-to-queryable lag.",
        ],
      },
      {
        heading: "Four pipelines, each incremental",
        body:
          "Test cases, support documentation, root-cause analysis items, and release notes each got an initial load and a separate incremental update path, so the corpus stays current without rebuilding the graph. A dedicated release-notes retrieval tool followed, and the test-case generation flow was rewired to query the graph so generation starts grounded in the accumulated corpus rather than cold.",
      },
      {
        heading: "Exposed as a tool, not an endpoint",
        body:
          "Retrieval reaches agents through the governed MCP registry, which means tenant scoping, authorization, and audit attribution come from the same layer that governs every other tool. Retrieval spans flow into the same OpenTelemetry pipeline as everything else, so its extraction and query calls are metered and scored alongside the rest of the estate.",
      },
    ],
    results: [
      { metric: "1M+", label: "entities in production across four content sources" },
      { metric: "5", label: "retrieval modes benchmarked into a documented mode-per-tool policy" },
      { metric: "5", label: "independently measured failure layers, from ingestion to operations" },
      { metric: "75–100", label: "golden questions drawn from real production traces, not invented" },
    ],
    stack: [
      "Neo4j",
      "pgvector",
      "PostgreSQL",
      "Python",
      "FastAPI",
      "Ragas",
      "Langfuse",
      "OpenTelemetry",
      "Model Context Protocol",
      "AWS",
    ],
    ownership:
      "The retrieval architecture, the four ETL pipelines, the evaluation design, and the mode policy are mine. Server provisioning and deployment for the retrieval service were handled with platform DevOps.",
    tags: ["RAG", "Knowledge Graphs", "Retrieval Evaluation"],
    aliases: ["rag", "retrieval", "knowledge graph", "graphrag", "neo4j", "pgvector", "vector", "embedding", "context", "grounding", "ingestion", "etl"],
  },
  {
    slug: "documentation-automation",
    kind: "system",
    theme: "agents",
    title: "Documentation Automation Platform",
    employer: "ArmorCode",
    period: "2025 – 2026",
    oneLiner:
      "A multi-agent pipeline that writes product documentation from source code and tickets — and stops to ask questions instead of guessing.",
    summary:
      "Documentation went stale because writing it required engineers who had other work. I built the agent pipeline that drafts it from the code and the tickets, then reworked that pipeline after production use exposed the real failure: an agent given thin context writes confident, wrong prose. The fix was to make gathering context a mandatory phase with a gate where the agent must ask before it drafts.",
    problem:
      "The first version drafted from a ticket description alone — typically a one-line summary written for a project manager, not an engineer. It did not reliably read the linked engineering tickets, never searched the codebase to confirm what things were actually called, and never surfaced an ambiguity. The output was plausible and imprecise: approximate UI labels, missed edge cases, and multiple revision rounds per article. The agent was not short of capability; it was short of context, and it had no way to say so.",
    constraints: [
      "The ticket description cannot be trusted as the specification — it is written for a different audience than the documentation.",
      "Published articles are customer-facing, so an approximate field name is a defect, not a rough edge.",
      "Related engineering tickets are often not formally linked, so discovery cannot rely on link graphs alone.",
      "Generated documentation must stay reviewable by non-engineers rather than being published straight to customers.",
    ],
    diagram: "docs",
    diagramCaption:
      "Context enrichment runs to completion before any drafting begins, and the clarification gate blocks the draft until open questions are answered.",
    decisions: [
      {
        choice: "A clarification gate that blocks drafting",
        why:
          "The agent compiles a numbered list of what it cannot resolve from the available evidence and waits for answers before writing a word. This is the single most valuable behaviour in the pipeline: the failure mode of a documentation agent is not refusing to write, it is writing confidently from a gap. Making the gap explicit converts a silent assumption into a question someone can answer in seconds.",
        rejected: [
          "Letting the agent proceed on best-effort assumptions — faster per run, and the source of every revision round it was meant to eliminate",
        ],
      },
      {
        choice: "Mandate codebase search before drafting, not as a fallback",
        why:
          "At least two searches per article, one broad on the feature and one narrow on a specific component or configuration key. Documentation has to use the product's exact terminology, and the only authoritative source for what a field is called is the code that names it. Tickets describe intent; the codebase describes what shipped.",
      },
      {
        choice: "Search for related tickets rather than trusting links",
        why:
          "A bounded keyword search over recently-tested tickets discovers work that is relevant but was never formally linked, deduplicated against what the link graph already returned. Bounding it by recency and status keeps the context pool relevant instead of merely large — an unbounded search would trade one context problem for another.",
      },
      {
        choice: "Distil the writing rules from published work",
        why:
          "Rather than hand-authoring a style guide, the rules were derived from the last several published release notes — how entries open, the tone and sentence length, the recurring constructions. Critically, patterns that violated the existing rules were noted and deliberately not encoded, so the result matches the house voice without inheriting its bad habits. Style guidance written from scratch drifts from the real corpus; this cannot.",
        rejected: ["Hand-written tone guidance — already existed, and was what the output was drifting from"],
      },
      {
        choice: "Validate formatting in the workflow, not only in the prompt",
        why:
          "A malformed comment format persisted after the prompt was corrected, so a validation and correction layer went into the workflow node itself. When a model is the only thing enforcing a structural contract, that contract is advisory. Defense in depth is cheaper than a class of formatting bugs that reappear whenever the prompt changes.",
      },
    ],
    sections: [
      {
        heading: "Keeping the refresh bounded",
        body:
          "A collector scans merged pull requests across six repositories, extracts which product areas changed, and maintains a queue with per-item state — first seen, last seen, last run, retry count. A scheduled runner then processes that queue rather than regenerating everything. Documentation refresh is incremental work, and treating it as a full rebuild would waste most of every run.",
        points: [
          "The queue is processed one item at a time, sequentially, on purpose: parallel runs collided over shared template files. Throughput was the correct thing to trade for correctness here, because the deadline is weekly.",
          "Item names are canonicalized and deduplicated, so repeated pull requests touching the same area update one queue row instead of creating several.",
          "Retries and failure handling live in the queue rather than in the agent, so a transient failure does not lose the work.",
        ],
      },
      {
        heading: "Why the review surface matters",
        body:
          "Drafted documentation is proposed as a pull request and reviewed before publication, never published directly. The whole pipeline is built on the assumption that an agent's output needs a human decision at the end — which is what the review application exists to make practical rather than painful.",
      },
    ],
    results: [
      { metric: "4", label: "sequential context steps required before any drafting begins" },
      { metric: "2+", label: "codebase searches mandated per article to confirm exact product terminology" },
      { metric: "6", label: "repositories scanned for changes feeding the refresh queue" },
      { metric: "1", label: "queue item processed at a time, trading throughput for correctness" },
    ],
    stack: [
      "n8n",
      "Model Context Protocol",
      "Python",
      "CLI agents",
      "Confluence",
      "Zendesk",
      "GitHub",
      "AWS Bedrock",
    ],
    ownership:
      "The pipeline, the context-enrichment design, the queue model, and the agent prompts are mine, built out from an epic opened by engineering leadership. The documentation team owns the published articles and the review decision.",
    tags: ["Multi-Agent Systems", "Agent Context", "Workflow Automation"],
    aliases: ["documentation", "docs", "doc automation", "release notes", "clarification", "context enrichment", "confluence", "zendesk", "technical writing", "agent workflow", "n8n", "queue"],
  },
  {
    slug: "sentinel-test-agent",
    kind: "system",
    theme: "agents",
    title: "Sentinel Test Generation Agent",
    employer: "ArmorCode",
    period: "2025 – 2026",
    oneLiner:
      "A multi-step agent that writes test cases from tickets, grounded in a code graph — and refuses to let untested work proceed downstream.",
    summary:
      "Test coverage lagged because writing cases by hand competed with shipping. Sentinel generates them from the ticket, grounds itself in a graph of the actual code, and hands reviewed cases to the test management system. The part I care about most is the contract: automation downstream fails loudly when the cases it should be tagging do not exist.",
    problem:
      "Test-case generation and test automation ran as two pipelines against the same ticket, with nothing enforcing that one had happened before the other. Cases were generated but not always linked; automation ran without the coverage tags it needed. Reconciling the two was manual, so it was skipped, and coverage gaps only surfaced later as missing traceability on priority work.",
    constraints: [
      "Context sources — historical root-cause analyses, the existing case corpus, the code itself — are only reachable through tool calls, not direct database access.",
      "Generated cases land in a system of record that real QA processes depend on, so a malformed upload is worse than no upload.",
      "Priority coverage requires traceable identifiers linking automated scenarios back to the cases they satisfy.",
      "Write access to ticketing and test-management systems needs rate limiting, because an agent loop can generate load a human never would.",
    ],
    diagram: null,
    diagramCaption: "",
    decisions: [
      {
        choice: "Fail the downstream pipeline instead of proceeding without coverage",
        why:
          "The ticket key became the integration contract: generation persists a one-to-many mapping from ticket to case identifiers, and automation reads that mapping before it starts. If no cases are linked, it stops with a structured validation error rather than running and reporting success on untested work. A pipeline that silently proceeds without coverage is worse than one that stops, because it produces false confidence.",
        rejected: [
          "Merging both pipelines into one system — larger blast radius and a rewrite, when a shared key and a hard check achieve the actual goal",
        ],
      },
      {
        choice: "A code graph rather than text search for grounding",
        why:
          "An evaluation of a lighter option came first and was rejected: it could not express the relationships that mattered. The adopted approach indexes files, classes, and functions as nodes with calls, imports, and inheritance as edges, so the agent can answer which code paths a change actually reaches. Test generation needs to know what a change touches, and that is a graph traversal, not a similarity match.",
        rejected: ["A simpler code-indexing tool — evaluated first, rejected for insufficient relationship depth"],
      },
      {
        choice: "Parallel tool calls within a single agent turn",
        why:
          "Gathering context from several sources sequentially made each turn slow enough that people noticed. Allowing concurrent calls in one turn cut that latency directly. Agent responsiveness is mostly a function of how tool calls are scheduled, not how fast the model is.",
      },
      {
        choice: "Fix the parser rather than the symptom",
        why:
          "Steps were splitting incorrectly on a delimiter. The cause was HTML-entity-encoded angle brackets being broken up by a naive parser — so the fix was decoding plus a lookahead pattern, verified against known cases with before-and-after step counts. Separately, a priority field was being set from a hardcoded value that did not match the target system's project-specific identifiers. Both were data-contract bugs at a boundary, which is where this class of defect concentrates.",
      },
    ],
    sections: [
      {
        heading: "What is shipped and what is not",
        body:
          "This is the longest-running agent in the portfolio and it is still moving, so the honest description separates delivered work from planned work. Delivered: generation from tickets, upload to the test management system with correct folder handling and labelling, code-graph grounding, parallel tool calls, and an end-to-end run validated with a QA engineer against real tickets rather than only internal testing.",
        points: [
          "In progress: extending generation to the core product security domain, with a reviewer sub-agent that critiques generated cases before a human sees them.",
          "Designed and not yet built: the enforced traceability contract described above, and automated remediation of failed test analysis.",
          "Presenting a roadmap as shipped would be the same failure this portfolio argues against everywhere else. The delivered core is real; the rest is stated as intent.",
        ],
      },
      {
        heading: "Rate limits as a design input",
        body:
          "Write paths carry per-hostname limits — ten requests an hour on ticket writes, a hundred on test-management writes. An agent that retries is an agent that can hammer a system of record, and the limit is what makes giving it write access defensible in the first place.",
      },
    ],
    results: [
      { metric: "10 / 100", label: "hourly per-host write limits on ticketing and test management" },
      { metric: "1 → many", label: "ticket-to-case mapping that makes coverage checkable rather than assumed" },
      { metric: "3", label: "grounding sources: code graph, historical analyses, existing case corpus" },
    ],
    stack: [
      "n8n",
      "Model Context Protocol",
      "Neo4j",
      "CLI agents",
      "Python",
      "Jira",
      "AWS Bedrock",
    ],
    ownership:
      "The agent, its tools, the grounding design, and the integration contract are mine. Test cases are reviewed and owned by the QA engineers who use them, and the validation run was done jointly with a QA engineer.",
    tags: ["AI Agents", "Tool Calling", "Test Automation"],
    aliases: ["sentinel", "test case", "test generation", "qa", "qmetry", "test automation", "code graph", "codegraphcontext", "traceability", "coverage", "parallel tools", "agent"],
  },
  {
    slug: "bi-platform",
    kind: "system",
    theme: "retrieval",
    title: "Business Data Layer for Agents",
    employer: "ArmorCode",
    period: "2026",
    oneLiner:
      "The governed data layer the business agents answer from — replacing a reporting stack that ran off one contractor's laptop.",
    summary:
      "Agents serving support, customer success, sales, and the executive office needed one trustworthy source for business questions. I replaced a vendor reporting tool and the local notebooks feeding it with a self-hosted platform: a consolidated lake, a modelled analytics database, row-level access control, and an interface exposed over the tool protocol so agents query the same governed data humans see in dashboards.",
    problem:
      "The reporting pipeline ran on a contractor's local machine — notebooks pulling from production databases, transforming locally, pushing to a hosted vendor tool. It was unautomated, a data availability risk, and expensive per seat. More importantly for the agent work, there was no queryable business data layer at all: agents could reason about product and code, but not about accounts, support load, or usage, because that data only existed inside dashboards.",
    constraints: [
      "Deployments in different regions used colliding integer organization identifiers, so no natural single tenant key existed across environments.",
      "The standard internal database proxy supported neither the relational store nor the search cluster the extraction needed.",
      "Access control had to reach row level — teams see their own accounts, not everyone's — because the same layer serves agents used across functions.",
      "Parity with the tool being replaced was the acceptance bar, so a partial migration was not a viable end state.",
    ],
    diagram: null,
    diagramCaption: "",
    decisions: [
      {
        choice: "A composite tenant key",
        why:
          "Region-qualified keys resolved the collision between deployments that independently issued the same integer identifiers. This table is built before every other pipeline, because every downstream join depends on identity being unambiguous. Getting identity wrong in a warehouse is not a bug you find in one query — it is wrong answers everywhere, quietly.",
      },
      {
        choice: "A conventional relational store, with the condition for changing it written down",
        why:
          "Chosen over two column-oriented alternatives as the right fit for this data mix and volume, with an explicit threshold recorded: revisit if snapshot facts pass roughly fifty million rows. A technology choice that names the condition under which it becomes wrong is a decision; one that does not is a preference.",
        rejected: [
          "Two column-oriented analytical engines — better at scales this data has not reached, and more operational surface to own today",
        ],
      },
      {
        choice: "Prune the schema to what dashboards actually consume",
        why:
          "The design started over-scoped at more than thirty tables and was cut to twelve, with every remaining column required to trace to a surface that reads it. Unused warehouse columns are not free — they are ETL that can break, documentation that goes stale, and joins someone will eventually trust by mistake.",
        rejected: ["The original larger schema — comprehensive, and most of it fed nothing"],
      },
      {
        choice: "Bypass the standard internal proxy deliberately",
        why:
          "The conventional path did not support two of the required sources, so extraction uses direct clients with explicit pool management instead. Deviating from a convention is fine when the reason is documented and specific; the failure mode to avoid is deviating silently and leaving the next person to rediscover why.",
      },
      {
        choice: "Gate loads on a manifest",
        why:
          "Processing only begins once a manifest is present, so a partially written batch cannot be read as complete. Partial loads are the worst class of data bug: they do not error, they just produce numbers that are slightly wrong and get reported.",
      },
    ],
    sections: [
      {
        heading: "Why this belongs to the agent work",
        body:
          "Exposed over the tool protocol, this became the data source behind the support, customer success, sales, and executive-office agents. It is the reason those agents can answer a question about an account rather than only about the product. Retrieval gave agents product knowledge; this gave them business context, under the same access controls a human would face.",
        points: [
          "Row-level security plus dashboard-level access control means an agent inherits the caller's scope rather than querying with unrestricted access.",
          "The same modelled tables serve both dashboards and agents, so a human and an agent asking the same question get the same answer — which is what makes the agent's answer auditable.",
        ],
      },
      {
        heading: "Shape of the pipeline",
        body:
          "Per-environment extracts plus global sources land in a consolidated lake through cross-account replication, then a scheduled pipeline models them into an analytics database — identity first, then per-surface loads, then derived views — with dashboards and the tool interface reading only from the modelled layer. Development runs against a local storage emulator with a single configuration swap to production.",
      },
    ],
    results: [
      { metric: "19", label: "dashboards migrated to parity with the tool being replaced" },
      { metric: "32 → 12", label: "serving tables after pruning to what is actually consumed" },
      { metric: "4", label: "production environments consolidated into one governed lake" },
      { metric: "10+", label: "external sources unified behind a single queryable layer" },
    ],
    stack: [
      "Python",
      "PostgreSQL",
      "Apache Superset",
      "AWS S3",
      "FastAPI",
      "Docker",
      "Jenkins",
      "Model Context Protocol",
    ],
    ownership:
      "The architecture, schema design, ETL, access-control model, and the tool interface are mine, delivered end to end. The dashboards it replaced were originally built by an external contractor.",
    tags: ["Agent Context", "Data Platform", "Access Control"],
    aliases: ["bi", "business intelligence", "superset", "quicksight", "dashboards", "etl", "warehouse", "star schema", "tenant key", "row level security", "analytics", "data platform", "business data"],
  },
  {
    slug: "quill",
    kind: "product",
    theme: "products",
    title: "Quill",
    employer: "ArmorCode",
    period: "2026",
    oneLiner:
      "A desktop app that makes AI-written documentation reviewable by the people who own it, not just by engineers who can read a diff.",
    summary:
      "An agent that writes documentation is only useful if someone can check it. Quill is the review surface: it renders proposed changes in the real published theme, lets a non-engineer fix them in place, and delegates every permission decision to the systems that already hold them. It is what keeps AI-drafted documentation reviewed rather than published on trust.",
    problem:
      "The documentation agent proposes changes as pull requests, which meant reviewers had to judge rendered output by reading raw markup diffs. The people best qualified to catch an error — the documentation team — were the least equipped to read that format, and could not make a small correction without asking an engineer. The bottleneck was not authoring, it was review.",
    constraints: [
      "Several proposals are open at once, so editing one cannot disturb the working copy of another.",
      "Reviewers are not engineers; anything requiring command-line work would not be used.",
      "Access control must not become a second system to keep in sync with the source of truth.",
      "Reviewers need to see what customers will see, not an approximation of it.",
    ],
    diagram: null,
    diagramCaption: "",
    decisions: [
      {
        choice: "A separate working tree per proposal",
        why:
          "Each open branch gets its own checkout, so the primary copy is never modified and parallel reviews cannot collide. Editing in place on a shared checkout is the obvious implementation and the one that corrupts state the first time two reviews overlap. Paths are validated to prevent traversal outside the intended directory.",
        rejected: [
          "Editing directly in a single shared checkout — simpler until two people review at once, then wrong in ways that are hard to unwind",
        ],
      },
      {
        choice: "Delegate permissions entirely to the source-control platform",
        why:
          "The app resolves the user's live permission tier and adapts: read-only reviewers can view but not edit or merge, write access unlocks editing, and full access unlocks merging. There is no in-app access list, so adding a collaborator in one place grants the right level everywhere. A duplicated permission model is a permission model that drifts, and drift in access control is a security bug.",
        rejected: ["An application-managed access list — one more thing to maintain, and it would diverge"],
      },
      {
        choice: "Render in the real published theme",
        why:
          "The published styling is vendored so the side-by-side comparison shows what readers will actually get, with word-level highlighting. A reviewer approving documentation is approving how it reads in context, which a markup diff cannot show and which is exactly where errors of tone and structure hide.",
      },
      {
        choice: "Embed a real terminal, not a simulated one",
        why:
          "A genuine terminal session opens in the active working tree so a reviewer can re-run the authoring agent on the spot rather than filing a request and waiting. The loop that matters is see a problem, fix the source of the problem, review again — and that loop only closes if the agent is reachable from where the review happens.",
      },
    ],
    sections: [
      {
        heading: "What shipped",
        body:
          "A working desktop application covering the full review path: a filtered list of open proposals, rendered side-by-side comparison with inline and multi-line comments that post back to the real pull request, approve and merge as genuine actions, a searchable article browser with version preview, an in-place editor with image management committed atomically alongside the text, a command palette for jumping to any article, a conversation timeline, and automated builds attaching signed installers to releases.",
        points: [
          "Inline suggestions are posted in the platform's native suggestion format, so a reviewer's fix becomes a one-click accept rather than a comment someone has to transcribe.",
          "Maturity, stated precisely: Quill is an internal release. The documentation-synchronization workflow it supports runs in production.",
        ],
      },
    ],
    results: [
      { metric: "3", label: "permission tiers enforced, all resolved from the source-control platform" },
      { metric: "1 per branch", label: "isolated working trees, so concurrent reviews never collide" },
      { metric: "0", label: "application-managed access lists to keep in sync" },
    ],
    stack: [
      "Electron",
      "React",
      "TypeScript",
      "Git",
      "GitHub API",
      "TinyMCE",
      "node-pty",
      "GitHub Actions",
    ],
    ownership:
      "Designed and built solo, from the first proposal through release automation. The documentation team owns the review decisions the app exists to support.",
    tags: ["AI Product", "Human in the Loop", "Developer Tooling"],
    aliases: ["quill", "documentation review", "electron", "desktop app", "wysiwyg", "worktree", "git worktrees", "pull request review", "human in the loop", "review tool", "pty", "terminal"],
  },
  {
    slug: "codenex-ai-proxy",
    kind: "product",
    theme: "platform",
    title: "CodeNex AI API Proxy",
    period: "2025 – 2026",
    oneLiner:
      "An open-source gateway that makes six different model backends answer to one API shape, with failover that lets recovered providers back in.",
    summary:
      "Every provider has its own request format, its own auth, and its own failure modes, so client code ends up knowing about all of them. This gateway absorbs that: one compatible surface in front of six backends, with format translation, health-aware routing, and worker supervision. It is public and inspectable, which is the point — the reasoning is readable in the code, not just described here.",
    problem:
      "Tools built against one provider's API cannot talk to another without rewriting their client, and juggling several providers means every consumer reimplements the same translation, retry, and fallback logic — inconsistently. Provider outages and rate limits then surface as failures in each client separately, with no shared notion of which backend is currently healthy.",
    constraints: [
      "Clients must not change: existing tooling expects a specific request and response shape, including streaming.",
      "Providers fail in different ways — rate limits, transient errors, expired credentials — and a single classification would be wrong for most of them.",
      "Streaming has to survive translation, so responses cannot be fully buffered before forwarding.",
      "Credentials for several accounts and providers live in one process, so isolation and configuration hygiene matter.",
    ],
    diagram: null,
    diagramCaption: "",
    decisions: [
      {
        choice: "Health-tracked provider pool with automatic recovery",
        why:
          "Providers are selected least-recently-used from a pool that tracks health, and an unhealthy provider is taken out of rotation and then retried rather than blacklisted permanently. Most provider failures are transient — a rate limit is not a death sentence — so permanent removal steadily degrades capacity in exchange for nothing.",
        rejected: [
          "Permanent blacklisting on failure — simpler bookkeeping, and it retires healthy capacity after a momentary rate limit",
        ],
      },
      {
        choice: "Route on model name rather than explicit configuration",
        why:
          "The requested model name is enough to infer the right backend, so clients get sensible routing without per-provider setup. Configuration that could have been inference is configuration that will be wrong somewhere.",
      },
      {
        choice: "Two implementations, deliberately",
        why:
          "A process-supervised runtime with a metrics store and cache for feature-rich deployments, and a single compiled binary for low-footprint ones. Keeping both honest forced the protocol translation to be specified rather than incidental to one language's conventions.",
      },
      {
        choice: "Supervise workers instead of exiting on crash",
        why:
          "A parent process monitors workers and restarts them, so one bad request cannot take the gateway down. A gateway is a single point of failure by construction; the only acceptable answer is that it recovers without operator attention.",
      },
    ],
    sections: [
      {
        heading: "Why it exists at work as well as at home",
        body:
          "The same problem shape recurred internally: several command-line coding tools, each expecting a different provider format, all needing to route through one governed path with fallback between accounts. Building this in the open first meant the internal version started from a design that had already been tested against real client tools rather than being reasoned about from scratch.",
        points: [
          "Response caching and per-provider metrics make the cost and reliability picture visible per backend instead of aggregated into one number.",
          "Streaming is preserved through translation, which is the constraint that rules out the simplest possible implementation.",
        ],
      },
    ],
    results: [
      { metric: "6", label: "provider backends reachable through one compatible API surface" },
      { metric: "2", label: "independent implementations, one process-supervised and one single-binary" },
      { metric: "Public", label: "source, so the routing and failover logic can be read directly" },
    ],
    stack: [
      "Go",
      "Gin",
      "Node.js",
      "Redis",
      "PostgreSQL",
      "React",
      "OpenAI-compatible APIs",
    ],
    ownership:
      "Designed and built solo as an open-source project, published under my own account.",
    tags: ["AI Gateway", "Provider Abstraction", "Reliability"],
    aliases: ["proxy", "api proxy", "gateway", "codenex proxy", "openai compatible", "provider abstraction", "failover", "fallback", "load balancing", "streaming", "model routing", "open source"],
  },
  {
    slug: "codenex",
    kind: "product",
    theme: "products",
    title: "CodeNex",
    period: "2025 – 2026",
    oneLiner:
      "An AI builder that turns a prompt into a running React application, on a microservice backend that gives every project its own live preview environment.",
    summary:
      "Generating code is the easy half. The hard half is everything around it: where the files live, how a user sees the result running, how concurrent builds stay isolated, and how streaming keeps the interface alive while a model works. I built CodeNex as a distributed system rather than a wrapper — a Spring Cloud backend, streamed generation, and per-project preview environments served on their own subdomains.",
    problem:
      "A prompt-to-app product only feels real when the user can click into a running application, not read a code listing. That requires solving problems a single service cannot: long-running generation that must stream rather than block, generated files that need durable storage separate from the container that produced them, previews that must be isolated per project, and the caching and quota accounting that keeps any of it affordable under concurrency.",
    constraints: [
      "Generation takes far longer than a request-response cycle tolerates, so progress has to stream or the interface looks broken.",
      "Every project's preview must be isolated — one user's generated app cannot reach another's files or environment.",
      "Generated artifacts outlive the process that created them, so they cannot live on the generating container's disk.",
      "Model calls cost money per token, so quotas and caching are product requirements, not optimizations.",
    ],
    diagram: null,
    diagramCaption: "",
    decisions: [
      {
        choice: "Split the backend by responsibility, behind one gateway",
        why:
          "Account, workspace, and intelligence became separate services behind a Spring Cloud gateway, with routing by path prefix and configuration pulled from a central config service. Generation is bursty and expensive while account operations are cheap and constant — coupling them means scaling the wrong thing, and a model-provider failure taking down login.",
        rejected: [
          "A single monolithic backend — faster to build, and it forces generation load and auth traffic to scale together",
        ],
      },
      {
        choice: "A preview environment per project, on its own subdomain",
        why:
          "Generated apps are served from a dedicated previews namespace, matched by subdomain through the ingress and resolved to a dynamic preview by a proxy service. Subdomain isolation gives each project a real origin, which means browser security boundaries do the isolation work rather than application-level path checks that are easy to get subtly wrong.",
        rejected: [
          "Serving previews from a shared path on the main domain — one origin for every user's generated code, so cookies and storage are shared by default",
        ],
      },
      {
        choice: "Object storage for generated files, not container disk",
        why:
          "Files are pushed to object storage and watched into the preview environment, so the artifact survives the generating pod and a preview can be rebuilt without re-running the model. Treating generated code as durable state rather than process output is what makes workspaces resumable.",
      },
      {
        choice: "Stream tokens over server-sent events",
        why:
          "Generation streams to the browser as it happens instead of resolving one long request. The user sees work in progress, which changes the product from a loading spinner into something that feels alive — and it removes the timeout ceiling a buffered response would impose.",
      },
      {
        choice: "An event bus between generation and everything downstream",
        why:
          "Generation publishes events that other services consume, with a cache layer in front of read paths. Usage accounting, workspace updates, and preview refreshes are all reactions to generation rather than steps inside it, so a slow consumer cannot stall the generation itself.",
      },
    ],
    sections: [
      {
        heading: "The shape of the system",
        body:
          "Traffic enters through an ingress that splits two ways: API calls to the gateway service and preview traffic to a proxy service that resolves project subdomains. Behind the gateway, account, workspace, and intelligence services each own their deployment and pull configuration centrally. The data layer carries a relational store for durable state, an event bus between services, a cache in front of hot reads, and object storage for generated files, which sync into the previews namespace.",
        points: [
          "Preview resolution is a subdomain match rather than a lookup in application code, so adding a project needs no routing change.",
          "Configuration is fetched by services at runtime rather than baked into images, so an environment change does not require a rebuild.",
        ],
      },
      {
        heading: "What this was for",
        body:
          "CodeNex is the project where I owned every layer at once — backend architecture, the streaming path, Kubernetes deployment, storage, authentication, quotas, and subscription billing. The value of building it was learning where a distributed system's real cost sits, which is almost never in the interesting part: it is in isolation boundaries, durable state, and what happens on the second concurrent request.",
      },
    ],
    results: [
      { metric: "3", label: "backend services split by scaling profile behind one gateway" },
      { metric: "1 per project", label: "isolated preview environment, addressed by its own subdomain" },
      { metric: "Live", label: "public product with streaming generation and running previews" },
    ],
    stack: [
      "Java",
      "Spring Boot",
      "Spring AI",
      "Spring Cloud Gateway",
      "React",
      "TypeScript",
      "Kubernetes",
      "PostgreSQL",
      "Kafka",
      "Redis",
      "MinIO",
      "Stripe",
    ],
    ownership:
      "Designed and built solo — backend services, streaming architecture, preview infrastructure, storage, authentication, quotas, and billing foundations.",
    tags: ["AI Product", "Distributed Systems", "Platform Engineering"],
    aliases: ["codenex", "code nex", "ai builder", "codegen", "code generation", "spring", "spring ai", "spring cloud", "kubernetes", "preview", "previews", "sse", "streaming", "minio", "kafka", "saas", "prompt to app"],
  },
  {
    slug: "fantasy-gpt",
    kind: "product",
    theme: "retrieval",
    title: "Fantasy GPT",
    employer: "Xansr Media",
    period: "2024",
    oneLiner:
      "A multi-step reasoning SQL RAG system on a fine-tuned in-house model, answering live cricket questions against continuously ingested match data in under thirty seconds.",
    summary:
      "Sports questions are not lookups — they are aggregations over live data, and they arrive while the match is still running. I built the system that answers them: a fine-tuned in-house model driving multi-step reasoning over SQL, fed by live ETL pipelines, with quality checks rather than vibes deciding whether an answer was good enough to ship.",
    problem:
      "A fan's question rarely maps to a single row. It maps to a query — sometimes several, chained — over data that is changing as they ask. Vector retrieval over documents cannot answer 'who has the better strike rate against spin in this innings', because the answer does not exist as text anywhere; it has to be computed. And a stale answer during a live match is worse than a slow one, so ingestion latency was part of the problem, not separate from it.",
    constraints: [
      "The data is live: an answer computed against a stale snapshot is wrong even if the reasoning was right.",
      "Questions need multiple dependent steps, so a single generated query cannot satisfy them.",
      "A generated query runs against a real database, so it has to be constrained rather than trusted.",
      "Answers had to land fast enough to feel conversational during a match in progress.",
    ],
    diagram: null,
    diagramCaption: "",
    decisions: [
      {
        choice: "SQL generation over document retrieval",
        why:
          "The questions were quantitative, and the ground truth lived in structured match data rather than prose. Generating queries against that data returns computed answers instead of retrieved passages — which is the difference between answering a statistics question and finding a page that discusses statistics.",
        rejected: [
          "Vector search over match reports and commentary — retrieves text that talks about the numbers without ever computing them",
        ],
      },
      {
        choice: "Multi-step reasoning rather than one query per question",
        why:
          "Real questions decompose: establish context, then narrow, then compare. Letting the system plan and chain steps — using intermediate results to shape the next query — answers questions that a single generated statement structurally cannot.",
      },
      {
        choice: "A fine-tuned in-house model",
        why:
          "Cricket has dense domain vocabulary and a schema-specific query surface, and a general model handled neither reliably. Fine-tuning in house also kept inference within our own infrastructure, which matters when every question during a live match hits the same path.",
      },
      {
        choice: "Live ETL as part of the answer path",
        why:
          "Pipelines continuously ingested match data from multiple sources into the analytical store the model queries. Freshness was treated as a system property rather than a data-team concern, because the product promise was answering about a match that is still happening.",
      },
      {
        choice: "Automated quality checks on generated answers",
        why:
          "Answer quality was measured with an evaluation harness rather than judged by spot-checking. This was my first experience of the thing I now build deliberately: without measurement, every prompt change is a guess, and regressions are invisible until a user finds them.",
      },
    ],
    sections: [
      {
        heading: "Why this one mattered to me",
        body:
          "This is where the pattern I now work on full time first appeared: a model is only as useful as the tools and context around it, and you cannot tell whether it is working without measuring it. Fantasy GPT needed retrieval that computed rather than recalled, orchestration across dependent steps, and evaluation to know if any of it held. Everything I have built since is a more rigorous version of those three ideas.",
      },
    ],
    results: [
      { metric: "98%", label: "of complex sports queries resolved end to end" },
      { metric: "< 30s", label: "answers against live match data while a match is in progress" },
      { metric: "Multi-step", label: "reasoning chains, so questions need not map to a single query" },
    ],
    stack: [
      "Python",
      "FastAPI",
      "LangGraph",
      "SQL RAG",
      "Fine-tuned LLaMA",
      "Microsoft SQL Server",
      "DeepEval",
      "Docker",
    ],
    ownership:
      "Built the retrieval and reasoning system, the backend APIs, the ETL pipelines feeding it, and the quality checks over its answers, as a GenAI intern on the product team.",
    tags: ["SQL RAG", "Multi-Step Reasoning", "Model Fine-Tuning"],
    aliases: ["fantasy gpt", "fantasygpt", "sql rag", "text to sql", "cricket", "sports", "fine tuning", "finetuned", "llama", "langgraph", "deepeval", "etl", "live data", "xansr", "multi step reasoning"],
  },
  {
    slug: "aiko",
    kind: "product",
    theme: "products",
    title: "AIKO",
    employer: "Xansr Media",
    period: "2024",
    oneLiner:
      "A personalized voice sports companion that follows a live match, builds a persona per listener, and generates catch-up highlight reels with AI commentary in twenty-plus languages.",
    summary:
      "AIKO is what a sports broadcast sounds like when it is built for one person. It follows a match as it happens, holds a spoken conversation in the listener's language, and — for someone who joined at half time — stitches the part they missed into a highlight reel with commentary generated for them. I worked across the voice pipeline, the personalization layer, and the highlight generation.",
    problem:
      "Broadcast commentary is one narration for everyone, in one language, and it assumes you were watching from the start. A listener who tunes in mid-match has no way to catch up conversationally, and a listener who does not speak the broadcast language has no access at all. Solving that means real-time voice in both directions, a model of what this specific listener cares about, and generating narration over footage that has already gone past.",
    constraints: [
      "Voice is bidirectional and live, so latency budgets apply to speech recognition and synthesis, not only to the model.",
      "The match is in progress, so the system reads and reasons about events as they arrive rather than after the fact.",
      "Highlights are assembled from the part already played, so selection has to be driven by what this listener would care about.",
      "Twenty-plus languages means neither the commentary nor the voice layer can be built around one locale.",
    ],
    diagram: null,
    diagramCaption: "",
    decisions: [
      {
        choice: "Persona building as the personalization primitive",
        why:
          "Rather than tuning a single feed, the system builds a persona per listener — the teams, players, and kinds of moment they care about — and every downstream decision reads from it. Highlight selection and commentary tone then follow from one model of the listener instead of being personalized separately and inconsistently.",
      },
      {
        choice: "Generate commentary rather than clip existing audio",
        why:
          "Reusing broadcast audio would carry the original language, pacing, and assumption that you watched from the start. Generating narration per listener means a catch-up reel can explain what happened to someone who just arrived, in their language, at their level of detail.",
        rejected: [
          "Splicing the original broadcast commentary — cheaper, and it cannot be localized, re-paced, or made to address a mid-match arrival",
        ],
      },
      {
        choice: "Read live match state as a first-class input",
        why:
          "The assistant tracks a running match and answers about what is happening now, which means match events feed the reasoning path continuously rather than being queried on demand. A sports companion that can only discuss finished matches is a search interface.",
      },
      {
        choice: "Managed speech services for the voice layer",
        why:
          "Speech recognition and synthesis across twenty-plus languages is a problem with mature managed solutions and enormous depth. Using one kept the effort on the parts that were actually differentiated — persona modelling, highlight selection, and generated commentary.",
      },
    ],
    sections: [
      {
        heading: "The catch-up case",
        body:
          "The feature that best explains the product: a listener starts watching at half time and wants to know what they missed. AIKO selects moments from the played portion based on that listener's persona, generates commentary over them, and speaks it in their language. Every part of the system — live state, persona, generation, voice — has to work at once for that single interaction to land.",
      },
      {
        heading: "Where it went",
        body:
          "The product was presented at IBC 2024 in Amsterdam, one of the industry's main broadcast technology events. Building for a demo with that audience meant the voice path had to hold up live rather than in a recorded walkthrough.",
      },
    ],
    results: [
      { metric: "20+", label: "languages supported for live commentary and conversation" },
      { metric: "IBC 2024", label: "presented at the broadcast industry event in Amsterdam" },
      { metric: "Per listener", label: "persona driving highlight selection and commentary, not a shared feed" },
    ],
    stack: [
      "Python",
      "Node.js",
      "FastAPI",
      "Azure Speech SDK",
      "LLM commentary generation",
      "Docker",
      "GitHub Actions",
    ],
    ownership:
      "Contributed to the voice workflows, the personalization layer, and profile-driven highlight generation as a GenAI intern; AIKO is a Xansr Media product built by a team.",
    tags: ["Voice AI", "Personalization", "Real-Time Systems"],
    aliases: ["aiko", "voice assistant", "voice ai", "sports assistant", "commentary", "highlights", "highlight reel", "text to speech", "speech to text", "tts", "stt", "azure speech", "multilingual", "persona", "ibc", "xansr"],
  },
  {
    slug: "serenify",
    kind: "product",
    theme: "products",
    title: "Serenify",
    period: "2025 – 2026",
    oneLiner:
      "An AI wellness product where the hard problems are trust ones: what the model is allowed to see, and what it must do when a conversation turns to crisis.",
    summary:
      "Wellness is a domain where a plausible AI response is not good enough. I built Serenify as a product that takes that seriously: per-user data isolation enforced at the database, granular controls over what the assistant can read, retrieval over documents the user chose to share, and explicit crisis-resource surfacing rather than leaving a distressed user to the model's judgment.",
    problem:
      "An empathetic chat interface is straightforward to build and the wrong place to stop. The real questions are structural: how do you guarantee one user's journal can never reach another's session, how does a user grant the assistant access to some of their history but not all of it, and what happens when someone describes self-harm to a chatbot. Those are architecture and safety decisions, not prompt decisions.",
    constraints: [
      "The data is health-adjacent and personal, so isolation has to be enforced by the datastore rather than by application code remembering to filter.",
      "Users must be able to withhold context from the AI without losing the rest of the product.",
      "Crisis signals can appear in any conversation, so detection cannot live in a single flow.",
      "Repeated model calls over personal history are expensive, so caching had to respect per-user boundaries.",
    ],
    diagram: null,
    diagramCaption: "",
    decisions: [
      {
        choice: "Row-level isolation tied to the authenticated user",
        why:
          "Every user-owned table enforces access against the authenticated identity at the database layer, so a query cannot return another user's rows even if application code is wrong. In a product holding journals and mood history, isolation belongs where it cannot be forgotten rather than in every query that touches it.",
        rejected: [
          "Filtering by user in application queries — correct until one query forgets, and that one query is a data breach",
        ],
      },
      {
        choice: "Explicit user control over what the assistant can see",
        why:
          "Granular toggles decide which categories of personal data the AI may read. Personalization and privacy genuinely trade off here, so the resolution is to let the user set the balance rather than to pick a default and hide it. A wellness product that quietly reads everything has broken something more important than a feature.",
      },
      {
        choice: "Retrieval scoped to documents the user uploaded",
        why:
          "Embeddings over user-provided health documents let the assistant ground its responses in that person's actual context, stored in the same per-user isolated store. Retrieval is what makes the responses specific rather than generic, and scoping it per user is what makes it safe to do at all.",
      },
      {
        choice: "Detect crisis language and surface real resources",
        why:
          "When a conversation indicates crisis, the product surfaces helpline and emergency resources directly instead of relying on the model to respond well. A model's answer to someone in danger is a probability distribution; a helpline number is not. This is the decision I would defend hardest in the whole product.",
      },
      {
        choice: "Cache derived insights per user per day",
        why:
          "Generated insights are computed once and reused within the day rather than regenerated on every view, which cuts model calls substantially and keeps what the user sees stable rather than shifting each time they open the app.",
      },
    ],
    sections: [
      {
        heading: "A known limitation, stated plainly",
        body:
          "In the current open-source build the model is called from the client, which means the API key is exposed to the browser — acceptable for a self-hosted personal deployment, not for a hosted multi-user product. The documented fix is to proxy model calls through a server-side function so the key never reaches the client. It is written down in the repository rather than left for someone to discover, because an unstated known weakness is worse than the weakness.",
      },
      {
        heading: "What the product actually does",
        body:
          "Empathetic chat, mood tracking across several dimensions, journaling with AI-assisted reflection, guided sessions, and a dashboard of trends over time — with the privacy controls and crisis flows threaded through all of it rather than bolted on at the end.",
      },
    ],
    results: [
      { metric: "Per user", label: "database-enforced isolation on every user-owned table" },
      { metric: "Granular", label: "user controls over which personal data the assistant may read" },
      { metric: "1 per day", label: "cached insight generation per user, cutting redundant model calls" },
    ],
    stack: [
      "React",
      "TypeScript",
      "Supabase",
      "PostgreSQL",
      "pgvector",
      "Gemini",
      "Vite",
      "Vercel",
    ],
    ownership:
      "Designed and built solo as an open-source product — data model, privacy and isolation design, AI workflows, retrieval, and the full interface.",
    tags: ["AI Product", "Privacy by Design", "Safety"],
    aliases: ["serenify", "wellness", "mental health", "journaling", "mood tracking", "supabase", "pgvector", "row level security", "rls", "privacy", "crisis", "safety", "gemini", "consumer product"],
  },
];

export const caseStudyBySlug = new Map(caseStudies.map((study) => [study.slug, study]));

export const systemCaseStudies = caseStudies.filter((study) => study.kind === "system");

export const productCaseStudies = caseStudies.filter((study) => study.kind === "product");

/** Studies grouped for the `/work` index, in the order themes are declared. */
export const caseStudiesByTheme = CASE_STUDY_THEMES.map((theme) => ({
  ...theme,
  studies: caseStudies.filter((study) => study.theme === theme.id),
})).filter((group) => group.studies.length > 0);

/**
 * The homepage tier-1 row is a fixed three-column grid, so it renders a curated
 * subset rather than growing with the array. Everything else is reached via `/work`.
 */
export const featuredCaseStudies = caseStudies.filter((study) => study.featured);

export function getCaseStudyPath(slug: string) {
  return `/work/${slug}`;
}

export function getAdjacentCaseStudies(slug: string) {
  const index = caseStudies.findIndex((study) => study.slug === slug);
  if (index === -1) return { previous: null, next: null };

  return {
    previous: index > 0 ? caseStudies[index - 1] : null,
    next: index < caseStudies.length - 1 ? caseStudies[index + 1] : null,
  };
}
