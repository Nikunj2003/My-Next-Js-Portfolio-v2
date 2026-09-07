import type { CaseStudySlug } from "@/data/case-studies";

export const personalInfo = {
  name: "Nikunj Khitha",
  role: "Applied AI Engineer",
  tagline: "I work on the part of AI that starts after the demo: giving agents real tools, real memory, and a way to prove they still work tomorrow.",
  focus: "Open to Applied AI, Forward Deployed AI, Agentic AI, AI Product, and LLM/AI Engineer roles where I can own agent systems end to end \u2014 governed MCP tool use, retrieval, and the evaluation that keeps them reliable.",
  email: "njkhitha2003@gmail.com",
  linkedin: "https://www.linkedin.com/in/nikunj-khitha/",
  github: "https://github.com/Nikunj2003",
  resumeUrl: "/Nikunj_Resume.pdf",
};

/** `href` points each number at the surface that actually proves it. */
export const stats = [
  { value: 8, suffix: "+", label: "Business Functions Served", href: "#experience" },
  { value: 10, suffix: "+", label: "Production MCP Servers", href: "/work/governed-mcp-registry" },
  { value: 1, suffix: "M+", label: "KG Entities", href: "/work/knowledge-graph-rag" },
  { value: 9, suffix: "", label: "AI Surfaces Evaluated", href: "/work/llm-evaluation-platform" },
];

export interface Highlight {
  /** The measured claim, shown large. */
  metric: string;
  /** What the metric counts. */
  label: string;
  /** One sentence of supporting detail. */
  detail: string;
}

export const about = {
  summary: "I focus on the engineering work that makes AI useful after the first successful prompt: connecting models to the right tools and context, controlling what those tools can do, preserving useful memory, measuring behavior, and debugging failures across model, protocol, application, and infrastructure boundaries.",
  /**
   * Structured so a card can lead with the figure and stay compact. The AI Twin
   * still receives the full prose via the derived strings below.
   */
  highlights: [
    {
      metric: "9",
      label: "AI surfaces evaluated",
      detail:
        "An OpenTelemetry platform on Langfuse scoring prompts, models, agents, skills, MCP tools, and retrieval against golden datasets — deterministic checks, scikit-learn metrics, Ragas, and LLM-as-a-judge graders validated at Cohen's kappa >= 0.7, enforced as Jenkins CI gates.",
    },
    {
      metric: "10+",
      label: "Production MCP servers",
      detail:
        "Delivered in ArmorCode's shared enterprise tool registry with OAuth2/RBAC, tool-level permission tiers, explicit denial behavior, and audit attribution under multi-tenant AppSec constraints.",
    },
    {
      metric: "8+",
      label: "Business functions served",
      detail:
        "Co-built Agentic Office OS, translating ambiguous stakeholder requirements into Slack-accessible agents, skills, MCP integrations, and human-in-the-loop approval workflows — then owning rollout, debugging, and enablement.",
    },
    {
      metric: "1M+",
      label: "Knowledge graph entities",
      detail:
        "ArmorCode's tenant-scoped Knowledge Graph RAG layer in Neo4j and pgvector, with retrieval scored on accuracy, ranking quality, and context precision across five query modes.",
    },
    {
      metric: "57%",
      label: "Of gateway cost traced",
      detail:
        "Sole maintainer of company-wide model and MCP access on a LiteLLM gateway. Traced 57% of spend across 50,000+ requests to 10+ automations, then migrated models and enabled prompt caching.",
    },
    {
      metric: "Graphiti",
      label: "Agent memory layer",
      detail:
        "Shipped the platform agent memory layer on temporal knowledge graphs, combining session-scoped context with tenant- and person-level long-term recall for multi-step reasoning.",
    },
  ] satisfies Highlight[],
};

export const recognition = {
  title: "AI Ninja Award at ArmorCode",
  /**
   * "Presented on a global platform" is the accurate framing: ArmorCode is a
   * global company and the award was given at a company-wide global forum. It
   * deliberately does not claim the award category itself is titled "global".
   */
  detail:
    "First-ever recipient of ArmorCode's AI Ninja Award, presented on the company's global platform, and the youngest person to receive an award at the company.",
};

/** Prose form of the highlights, for the AI Twin context and SEO surfaces. */
export const highlightSentences = about.highlights.map(
  (highlight) => `${highlight.metric} ${highlight.label.toLowerCase()} — ${highlight.detail}`
);

/**
 * A bullet is a plain string, OR a string paired with the case-study slug that
 * proves it.
 *
 * A separate slug-by-bullet-text lookup map was the other option and was
 * rejected: it would silently desync the moment a bullet is reworded, which is
 * exactly the class of regression this codebase keeps re-discovering.
 * Co-locating the link with the text it describes makes that impossible.
 *
 * `study` is typed against the case-study slug union so a renamed or removed
 * slug is a compile error here, not a dead link discovered by a visitor.
 */
export type ExperienceBullet = string | { text: string; study: CaseStudySlug };

/** Reads the display text regardless of which bullet shape it is. */
export function bulletText(bullet: ExperienceBullet): string {
  return typeof bullet === "string" ? bullet : bullet.text;
}

/** The case-study slug a bullet links to, if it has one. */
export function bulletStudySlug(bullet: ExperienceBullet): CaseStudySlug | undefined {
  return typeof bullet === "string" ? undefined : bullet.study;
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  type: "work" | "education";
  summary: string;
  bullets: ExperienceBullet[];
}

export const experiences: Experience[] = [
  {
    company: "Central Electricity Authority, Government of India",
    role: "Software Development Intern",
    period: "May 2023 - July 2023",
    type: "work",
    summary: "Built public-sector software that improved data reliability, internal operations, and workflow speed across government systems.",
    bullets: [
      "Integrated National Power Portal data into a national renewable energy dashboard serving 150+ power stations and improved reporting accuracy by 30%.",
      "Built a secure Java/PostgreSQL file management system with role-based access control that improved retrieval efficiency by 25% across 5,000+ files.",
      "Developed a MERN conference room booking system that cut booking time by 60% and reduced scheduling errors by 40%.",
    ],
  },
  {
    company: "Xansr Media (Aiko)",
    role: "Software Development Intern (GenAI Specialist)",
    period: "Jun 2024 – Dec 2024",
    type: "work",
    summary: "Shipped full-stack, backend, GenAI, and data systems for AIKO and Fantasy GPT, powering personalized sports experiences, voice AI, and retrieval-backed cricket intelligence.",
    bullets: [
      "Built Node.js and FastAPI microservices, improving API performance by 40% and reducing deployment time by 42% with Docker and GitHub Actions.",
      { text: "Engineered Fantasy GPT with RAG, LangGraph, backend APIs, agents, and DeepEval quality checks to resolve 98% of complex sports queries.", study: "fantasy-gpt" },
      { text: "Built Python-based ETL pipelines to collect sports data from multiple sources and ingest it into MS SQL for Fantasy GPT SQL RAG workflows.", study: "fantasy-gpt" },
      { text: "Worked across AIKO, a voice-based sports companion using Azure Speech SDK for text-to-speech and speech-to-text, user-level personalization, and live AI-generated commentary in 20+ languages.", study: "aiko" },
      { text: "Built AIKO personalization features for on-the-fly highlight reels, where AI agents stitched sports moments based on each user's profile and interests for a product presented at IBC 2024 in Amsterdam.", study: "aiko" },
    ],
  },
  {
    company: "ArmorCode",
    role: "Software Development Intern (Applied AI)",
    period: "Jan 2025 - Nov 2025",
    type: "work",
    summary: "Created Anya's agent framework and memory layers, and built backend integrations and AI-assisted scaffolding across ArmorCode's AppSec platform.",
    bullets: [
      "Created the initial Java framework for Anya, ArmorCode's platform agent; designed, implemented, and owned its short- and long-term memory layers; and set up Langfuse-backed evaluation for agent accuracy and memory behavior.",
      "Ported 2 of 6 Anya sub-agents from LangChain4j to Spring AI, reimplementing memory and evaluation integrations for the new architecture.",
      "Owned backend integrations for 5+ security tools, including Black Duck, Snyk, and Checkmarx, on an AppSec platform aggregating findings across 130+ connectors.",
      "Created AI-assisted code generation utilities with template engines and AST parsing to automate new integration scaffolding, reducing per-integration boilerplate setup time by 30%.",
    ],
  },
  {
    company: "ArmorCode",
    role: "Applied AI Engineer (SDE 1)",
    period: "Dec 2025 – Present",
    type: "work",
    summary: "Co-build Agentic Office OS, the internal agent platform serving 8+ business functions, and own the tool, context, governance, and evaluation layers underneath it.",
    bullets: [
      "Co-built Agentic Office OS, the internal platform of autonomous, human-triggered, and human-in-the-loop agents reachable org-wide through Slack, translating ambiguous requirements from an external business consultant, executives, and internal teams into agents, skills, MCP integrations, and approval workflows for 8+ business functions, then owning rollout, debugging, and enablement.",
      { text: "Built an OpenTelemetry-based LLM evaluation platform on Langfuse so every prompt, model, agent, skill, and MCP tool change ships on measured accuracy, latency, and cost. It scores 9 AI surfaces against golden datasets using deterministic checks, scikit-learn classification metrics, Ragas RAG scores, and LLM-as-a-judge graders validated at Cohen's kappa >= 0.7, enforced as Jenkins CI gates.", study: "llm-evaluation-platform" },
      { text: "Delivered 10+ production MCP servers in ArmorCode's shared enterprise tool registry under multi-tenant AppSec constraints, implementing OAuth2/RBAC controls, tool-level permission tiers, explicit denial behavior, and audit attribution, with 20 of 20 authorization checks validated across three access tiers.", study: "governed-mcp-registry" },
      { text: "Govern company-wide model and MCP access as sole maintainer of a LiteLLM gateway, issuing scoped API keys with per-model spend budgets and distributing RBAC-gated MCP servers to employees' Claude Desktop via an .mcpb proxy. Cut recurring LLM spend by tracing 57% of gateway cost across 50,000+ requests to 10+ automations, then migrating models and splitting system/user prompts to enable Bedrock prompt caching, while flagging a deterministic rewrite worth a further ~95% reduction.", study: "code-intelligence-gateway" },
      { text: "Built ArmorCode's tenant-scoped knowledge-graph RAG layer over 1M+ entities of root-cause analyses, test cases, and product documentation in Neo4j and pgvector, giving Office OS agents grounded product knowledge without cross-tenant leakage, with retrieval scored on accuracy, ranking quality, and context precision across five query modes.", study: "knowledge-graph-rag" },
      { text: "Cut CS and support escalations to engineering with a codebase-search MCP service in Go over 8 product repositories, fronting a read-only agent against a daily-reindexed vector index. Restored it after 100+ queries returned zero content by isolating two independent causes in SDK and host internals: a Go output-schema defect that made schema-aware clients discard every answer, and a query deadline sized for a longer client timeout tier. Shipped the fix with a negative-control test and flagged 14 exposed connectors.", study: "governed-mcp-registry" },
      { text: "Kept AI-drafted documentation reviewable rather than blind-published by shipping Quill, an Electron/React/TypeScript GitHub PR review tool pairing a WYSIWYG editor with an embedded AI agent terminal, per-branch Git worktrees, and permission-aware GitHub delivery.", study: "quill" }
    ],
  },
];

export interface Project {
  slug: string;
  /** Featured projects get a full card; the rest render in the compact list. */
  featured?: boolean;
  title: string;
  category: string;
  summary: string;
  description: string;
  impact: string;
  role: string;
  timeline?: string;
  complexity: string;
  tech: string[];
  images: string[];
  github: string;
  live?: string;
}

export const projects: Project[] = [
  {
    slug: "codenex",
    featured: true,
    title: "CodeNex: AI Builder",
    category: "Full-Stack AI SaaS",
    summary: "An AI-driven code generation SaaS platform for building full React applications from natural-language prompts.",
    description: "Built an AI codegen SaaS that turns natural-language prompts into full React applications using Spring Boot and Spring AI, with SSE streaming, MinIO/NFS persistence, and Kubernetes preview pods.",
    impact: "Designed for SaaS-scale concurrency with Kubernetes preview pods, token quotas, RBAC, autoscaling, and Stripe subscriptions.",
    role: "SaaS architecture, backend systems, streaming infrastructure, and platform design",
    timeline: "Flagship platform build",
    complexity: "Distributed codegen, streaming, Kubernetes previews, persistence, auth, billing, and quotas",
    images: [
      "/images/projects/codenex/landing-page-light.png",
      "/images/projects/codenex/landing-page-dark.png",
      "/images/projects/codenex/system-architecture-dark.png",
      "/images/projects/codenex/dashboard-overview-light.png",
      "/images/projects/codenex/dashboard-overview-dark.png",
      "/images/projects/codenex/dashboard-usage-dark.png",
      "/images/projects/codenex/project-builder-dark.png",
      "/images/projects/codenex/login-page-dark.png",
    ],
    tech: ["Java", "Spring Boot", "Spring AI", "React", "TypeScript", "SSE", "Kubernetes", "MinIO", "Stripe"],
    github: "https://github.com/Nikunj2003/Codenex-backend-v1",
    live: "https://www.codenex.dev/",
  },
  {
    slug: "codenex-ai-api-proxy",
    featured: true,
    title: "CodeNex AI API Proxy",
    category: "AI Gateway & Infra",
    summary: "A unified AI gateway for routing model traffic through one consistent API layer.",
    description: "Built an OpenAI-compatible AI gateway in Go and Gin with provider abstraction, multi-account load balancing, health-aware fallbacks, Redis-backed response caching, streaming support, and operational controls behind a single API surface.",
    impact: "Demonstrates strong infra instincts around reliability, cost control, abstraction, observability, and multi-model platform design.",
    role: "Gateway architecture, backend implementation, and operational tooling",
    timeline: "Infra-focused product build",
    complexity: "Provider abstraction, account pooling, fallback routing, Redis caching, streaming, and control plane UX",
    images: [
      "/images/projects/codenex-proxy/dashbord.png",
      "/images/projects/codenex-proxy/providers.png",
      "/images/projects/codenex-proxy/api-docs.png",
      "/images/projects/codenex-proxy/login.png",
    ],
    tech: ["Go", "Gin", "Redis", "PostgreSQL", "React", "OpenAI-compatible APIs"],
    github: "https://github.com/Nikunj2003/codenex-ai-api-proxy",
  },
  {
    slug: "serenify",
    featured: true,
    title: "Serenify",
    category: "Full-Stack AI Product",
    summary: "A consumer-style AI wellness product with thoughtful UX, not just chat wrapped around a model.",
    description: "Built an open-source AI wellness product that combines empathetic Gemini-powered chat, mood tracking, journaling, guided sessions, crisis-help flows, privacy-aware analytics, and pgvector-backed personalization.",
    impact: "Shows product empathy, privacy-minded AI interaction design, end-user UX judgment, and the ability to shape AI into a coherent consumer experience users can return to consistently.",
    role: "Product design, frontend experience, and AI workflow implementation",
    timeline: "Full product build",
    complexity: "State-rich UX, AI interactions, crisis-help flows, Supabase-backed product workflows, pgvector personalization, and privacy-minded product design",
    images: [
      "/images/projects/serenify/landing-page-light.png",
      "/images/projects/serenify/dashboard-light.png",
      "/images/projects/serenify/chat-light.png",
      "/images/projects/serenify/activities-light.png",
      "/images/projects/serenify/profile-light.png",
      "/images/projects/serenify/crisis-help-light.png",
      "/images/projects/serenify/login-page-light.png",
      "/images/projects/serenify/dashboard-streak-dark.png",
    ],
    tech: ["React", "TypeScript", "Supabase", "pgvector", "Gemini AI", "Vercel"],
    github: "https://github.com/Nikunj2003/Serenify",
    live: "https://serenify.codenex.dev/",
  },
  {
    slug: "resume-fit-codenex",
    title: "Resume Fit — CodeNex",
    category: "AI Product",
    summary: "An AI resume improvement workflow built like a practical product instead of a one-off analyzer.",
    description: "Built an AI resume analysis and optimization tool with ATS-style scoring, keyword extraction, guided refinements, and visual feedback for iterative resume improvement.",
    impact: "Highlights applied AI product thinking, user guidance, and polished workflow design around a high-frequency use case.",
    role: "Product UX, AI workflow design, and frontend implementation",
    timeline: "Focused product build",
    complexity: "AI scoring UX, iterative feedback loops, and productized guidance",
    images: [
      "/images/projects/resumefit/landing-page-light.png",
      "/images/projects/resumefit/landing-page-dark.png",
      "/images/projects/resumefit/job-description-dark.png",
      "/images/projects/resumefit/api-key-entry-light.png",
      "/images/projects/resumefit/api-key-entry-dark.png",
      "/images/projects/resumefit/upload-resume-empty-dark.png",
      "/images/projects/resumefit/upload-resume-filled-dark.png",
    ],
    tech: ["React", "TypeScript", "Gemini AI", "Vercel AI SDK", "Recharts"],
    github: "https://github.com/Nikunj2003/Resume-Fit-Codenex",
  },
  {
    slug: "codenex-images",
    title: "CodeNex Images",
    category: "Full-Stack AI Product",
    summary: "An AI image workspace designed around focused creation and editing flows.",
    description: "Built an AI image generation and editing product around Gemini models, Auth0, and a polished workspace that emphasizes creation flow instead of exposing raw model controls.",
    impact: "Shows ability to wrap multimodal AI into a more usable and polished creative product experience.",
    role: "Product workflow design and full-stack implementation",
    timeline: "Creative AI product build",
    complexity: "Auth, image workflows, and UI-first multimodal product design",
    images: [
      "/images/projects/codenex-images/login-page-dark.png",
      "/images/projects/codenex-images/generation-workspace-dark.png",
    ],
    tech: ["React", "TypeScript", "Vite", "Auth0", "Gemini AI", "Node.js", "MongoDB"],
    github: "https://github.com/Nikunj2003/codenex-images",
  },
  {
    slug: "llama-mcp-streamlit",
    title: "LLaMa MCP Streamlit",
    category: "LLM Tooling / MCP",
    summary: "A tool-aware AI interface that pairs LLaMA with MCP for real-time external actions.",
    description: "Built an interactive assistant that combines NVIDIA NIM-hosted LLaMA 3.3 70B with MCP to show how LLM interfaces can move beyond chat into real-time tool execution.",
    impact: "Useful proof of experimentation depth around MCP, tool use, and practical LLM interaction design.",
    role: "LLM tooling experimentation and applied interface design",
    timeline: "Focused tooling exploration",
    complexity: "Tool invocation, orchestration, and interactive AI UX",
    images: [
      "/images/projects/llama-mcp-streamlit/configuration-dark.png",
      "/images/projects/llama-mcp-streamlit/tools-list-dark.png",
    ],
    tech: ["Python", "Streamlit", "MCP", "LLaMA", "NVIDIA NIM"],
    github: "https://github.com/Nikunj2003/LLaMa-MCP-Streamlit",
  },
];

export const skillCategories = [
  {
    title: "Applied AI, Agents & Evaluation",
    description: "The agent, retrieval, and evaluation stack I use to build governed AI systems and prove they still work after a change.",
    skills: ["AI Agents", "Agentic AI", "Multi-Agent Systems", "Model Context Protocol (MCP)", "Tool Calling", "Agent Memory", "LLM Evaluation", "LLM-as-a-Judge", "Golden Datasets", "Langfuse", "Ragas", "OpenTelemetry", "RAG", "GraphRAG", "Knowledge Graph RAG", "Prompt Engineering", "Prompt Caching", "Model Routing", "LangGraph", "Spring AI", "Graphiti", "AWS Bedrock"],
  },
  {
    title: "Languages & Backend",
    description: "The languages and frameworks I use to build AI products, APIs, and internal platforms end to end.",
    skills: ["Python", "TypeScript", "Go", "Java", "SQL", "FastAPI", "Spring Boot", "Node.js", "Gin", "Next.js", "React", "REST APIs", "Microservices", "OAuth2", "RBAC"],
  },
  {
    title: "Data, Retrieval & Storage",
    description: "The storage, graph, and vector technologies behind the retrieval and context systems I build.",
    skills: ["Neo4j", "pgvector", "PostgreSQL", "Elasticsearch", "Redis", "MongoDB", "Apache Superset", "S3"],
  },
  {
    title: "Platform, Observability & Delivery",
    description: "The infrastructure and measurement tooling I use to deploy, route, observe, and gate AI systems in production.",
    skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Jenkins", "GitHub Actions", "LiteLLM", "pytest", "scikit-learn", "Kafka", "Grafana", "Prometheus", "n8n"],
  },
];

/** Phrased to exercise the AI Twin's tools rather than invite a canned answer. */
export const chatSuggestions = [
  "Which system handles tenant isolation?",
  "How does the evaluation platform work?",
  "Compare the MCP registry and the RAG layer",
  "What broke in production, and how was it fixed?",
  "Show me the strongest proof of ownership",
];
