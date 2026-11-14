/**
 * What the command palette searches: each case study's slug, title, tags,
 * stack and aliases. A copy of those fields from `case-studies.ts`, so the
 * palette (loaded on every route) doesn't ship the full studies.
 * `tests/case-study-index.test.ts` fails if it drifts from the source.
 */
export type CaseStudySearchEntry = { slug: string; title: string; tags: string[]; stack: string[]; aliases: string[] };

export const caseStudyIndex: CaseStudySearchEntry[] = [
  {
    "slug": "llm-evaluation-platform",
    "title": "LLM Evaluation Platform",
    "tags": [
      "LLM Evaluation",
      "Observability",
      "CI Gates"
    ],
    "stack": [
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
      "Prometheus"
    ],
    "aliases": [
      "evaluation",
      "eval",
      "evals",
      "measure",
      "measurement",
      "langfuse",
      "ragas",
      "judge",
      "kappa",
      "golden dataset",
      "ci gate",
      "opentelemetry",
      "observability",
      "drift"
    ]
  },
  {
    "slug": "governed-mcp-registry",
    "title": "Governed MCP Tool Registry",
    "tags": [
      "MCP",
      "Tool Authorization",
      "Reliability"
    ],
    "stack": [
      "Model Context Protocol",
      "Go",
      "OAuth2",
      "RBAC",
      "Python",
      "n8n",
      "LiteLLM",
      "AWS",
      "Docker",
      "GitHub Actions"
    ],
    "aliases": [
      "mcp",
      "model context protocol",
      "tool",
      "tools",
      "tool use",
      "authorization",
      "permission",
      "rbac",
      "oauth",
      "registry",
      "rca",
      "root cause",
      "debug",
      "outage",
      "timeout",
      "reliability",
      "governance"
    ]
  },
  {
    "slug": "code-intelligence-gateway",
    "title": "Code Intelligence Gateway",
    "tags": [
      "Agent Infrastructure",
      "Reliability",
      "Root Cause Analysis"
    ],
    "stack": [
      "Go",
      "Docker",
      "AWS Fargate",
      "AWS ECS",
      "Application Load Balancer",
      "Model Context Protocol",
      "Neo4j",
      "ripgrep"
    ],
    "aliases": [
      "opencode",
      "codebase search",
      "code search",
      "code intelligence",
      "fargate",
      "ecs",
      "efs",
      "throughput",
      "burst credits",
      "storage",
      "crash loop",
      "health check",
      "infrastructure",
      "capacity",
      "index",
      "warmup",
      "goroutine",
      "gateway"
    ]
  },
  {
    "slug": "knowledge-graph-rag",
    "title": "Knowledge Graph RAG",
    "tags": [
      "RAG",
      "Knowledge Graphs",
      "Retrieval Evaluation"
    ],
    "stack": [
      "Neo4j",
      "pgvector",
      "PostgreSQL",
      "Python",
      "FastAPI",
      "Ragas",
      "Langfuse",
      "OpenTelemetry",
      "Model Context Protocol",
      "AWS"
    ],
    "aliases": [
      "rag",
      "retrieval",
      "knowledge graph",
      "graphrag",
      "neo4j",
      "pgvector",
      "vector",
      "embedding",
      "context",
      "grounding",
      "ingestion",
      "etl"
    ]
  },
  {
    "slug": "documentation-automation",
    "title": "Documentation Automation Platform",
    "tags": [
      "Multi-Agent Systems",
      "Agent Context",
      "Workflow Automation"
    ],
    "stack": [
      "n8n",
      "Model Context Protocol",
      "Python",
      "CLI agents",
      "Jira",
      "Quill",
      "TypeScript",
      "React",
      "Electron",
      "Confluence",
      "Zendesk",
      "GitHub",
      "AWS Bedrock"
    ],
    "aliases": [
      "documentation",
      "docs",
      "doc automation",
      "release notes",
      "clarification",
      "context enrichment",
      "confluence",
      "zendesk",
      "technical writing",
      "agent workflow",
      "n8n",
      "queue",
      "quill",
      "jira done",
      "documentation pr",
      "documentation sync"
    ]
  },
  {
    "slug": "sentinel-test-agent",
    "title": "Sentinel Test Generation Agent",
    "tags": [
      "AI Agents",
      "Tool Calling",
      "Test Automation"
    ],
    "stack": [
      "n8n",
      "Model Context Protocol",
      "Neo4j",
      "CLI agents",
      "Python",
      "Jira",
      "AWS Bedrock"
    ],
    "aliases": [
      "sentinel",
      "test case",
      "test generation",
      "qa",
      "qmetry",
      "test automation",
      "code graph",
      "codegraphcontext",
      "traceability",
      "coverage",
      "parallel tools",
      "agent"
    ]
  },
  {
    "slug": "bi-platform",
    "title": "Business Data Layer for Agents",
    "tags": [
      "Agent Context",
      "Data Platform",
      "Access Control"
    ],
    "stack": [
      "Python",
      "PostgreSQL",
      "Apache Superset",
      "AWS S3",
      "FastAPI",
      "Docker",
      "Jenkins",
      "Model Context Protocol"
    ],
    "aliases": [
      "bi",
      "business intelligence",
      "superset",
      "quicksight",
      "dashboards",
      "etl",
      "warehouse",
      "star schema",
      "tenant key",
      "row level security",
      "analytics",
      "data platform",
      "business data"
    ]
  },
  {
    "slug": "quill",
    "title": "Quill: Documentation Review",
    "tags": [
      "Documentation Automation",
      "Human in the Loop",
      "Developer Tooling"
    ],
    "stack": [
      "Electron",
      "React",
      "TypeScript",
      "Git",
      "GitHub API",
      "TinyMCE",
      "node-pty",
      "GitHub Actions"
    ],
    "aliases": [
      "quill",
      "documentation review",
      "electron",
      "desktop app",
      "wysiwyg",
      "worktree",
      "git worktrees",
      "pull request review",
      "human in the loop",
      "review tool",
      "pty",
      "terminal",
      "documentation automation",
      "jira",
      "zendesk"
    ]
  },
  {
    "slug": "codenex-ai-proxy",
    "title": "CodeNex AI API Proxy",
    "tags": [
      "AI Gateway",
      "Provider Abstraction",
      "Reliability"
    ],
    "stack": [
      "Go",
      "Gin",
      "Node.js",
      "Redis",
      "PostgreSQL",
      "React",
      "OpenAI-compatible APIs"
    ],
    "aliases": [
      "proxy",
      "api proxy",
      "gateway",
      "codenex proxy",
      "openai compatible",
      "provider abstraction",
      "failover",
      "fallback",
      "load balancing",
      "streaming",
      "model routing",
      "open source"
    ]
  },
  {
    "slug": "codenex",
    "title": "CodeNex",
    "tags": [
      "AI Product",
      "Distributed Systems",
      "Platform Engineering"
    ],
    "stack": [
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
      "Stripe"
    ],
    "aliases": [
      "codenex",
      "code nex",
      "ai builder",
      "codegen",
      "code generation",
      "spring",
      "spring ai",
      "spring cloud",
      "kubernetes",
      "preview",
      "previews",
      "sse",
      "streaming",
      "minio",
      "kafka",
      "saas",
      "prompt to app"
    ]
  },
  {
    "slug": "fantasy-gpt",
    "title": "Fantasy GPT",
    "tags": [
      "SQL RAG",
      "Multi-Step Reasoning",
      "Model Fine-Tuning"
    ],
    "stack": [
      "Python",
      "FastAPI",
      "LangGraph",
      "SQL RAG",
      "Fine-tuned LLaMA",
      "Microsoft SQL Server",
      "DeepEval",
      "Docker"
    ],
    "aliases": [
      "fantasy gpt",
      "fantasygpt",
      "sql rag",
      "text to sql",
      "cricket",
      "sports",
      "fine tuning",
      "finetuned",
      "llama",
      "langgraph",
      "deepeval",
      "etl",
      "live data",
      "xansr",
      "multi step reasoning"
    ]
  },
  {
    "slug": "aiko",
    "title": "AIKO",
    "tags": [
      "Voice AI",
      "Personalization",
      "Real-Time Systems"
    ],
    "stack": [
      "Python",
      "Node.js",
      "FastAPI",
      "Azure Speech SDK",
      "LLM commentary generation",
      "Docker",
      "GitHub Actions"
    ],
    "aliases": [
      "aiko",
      "voice assistant",
      "voice ai",
      "sports assistant",
      "commentary",
      "highlights",
      "highlight reel",
      "text to speech",
      "speech to text",
      "tts",
      "stt",
      "azure speech",
      "multilingual",
      "persona",
      "ibc",
      "xansr"
    ]
  },
  {
    "slug": "serenify",
    "title": "Serenify",
    "tags": [
      "AI Product",
      "Privacy by Design",
      "Safety"
    ],
    "stack": [
      "React",
      "TypeScript",
      "Supabase",
      "PostgreSQL",
      "pgvector",
      "Gemini",
      "Vite",
      "Vercel"
    ],
    "aliases": [
      "serenify",
      "wellness",
      "mental health",
      "journaling",
      "mood tracking",
      "supabase",
      "pgvector",
      "row level security",
      "rls",
      "privacy",
      "crisis",
      "safety",
      "gemini",
      "consumer product"
    ]
  }
];
