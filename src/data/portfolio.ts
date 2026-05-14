export const personalInfo = {
  name: "Nikunj Khitha",
  role: "Full-Stack GenAI Engineer",
  tagline: "I build full-stack GenAI platforms where Spring Boot APIs, retrieval systems, MCP servers, LLM gateways, security, observability, and product UX work together in production.",
  focus: "Open to Full-Stack GenAI, backend, platform, and AI infrastructure roles where I can own architecture, delivery, and measurable outcomes.",
  email: "njkhitha2003@gmail.com",
  linkedin: "https://www.linkedin.com/in/nikunj-khitha/",
  github: "https://github.com/Nikunj2003",
  resumeUrl: "/Nikunj_Resume.pdf",
};

export const stats = [
  { value: 1, suffix: "M+", label: "KG Entities" },
  { value: 6, suffix: "", label: "Production MCP Servers" },
  { value: 30, suffix: "+", label: "Automations" },
  { value: 40, suffix: "%", label: "Retrieval Lift" },
];

export const about = {
  summary: "I work best on products and platforms where backend systems have to be reliable, AI has to be useful, and the user experience has to earn trust in production. My sweet spot is owning the system end to end: designing product surfaces, building Java/Spring Boot and Node.js backends, shaping MCP access layers and LLM gateways, wiring observability and security controls, and turning retrieval-heavy model behavior into software teams can trust.",
  highlights: [
    "Built ArmorCode's central Knowledge Graph RAG brain over 1,000,000+ entities from Zendesk, QMetry, Jira, Chorus, and codebase sources, improving retrieval accuracy by 40%.",
    "Designed tenant-scoped MCP access so platform and internal agents can retrieve context and execute authorized tools without cross-tenant leakage.",
    "Shipped 6 production MCP servers and an internal AI runtime stack across Knowledge Graph RAG, LiteLLM, OpenCode Server, n8n, and agent workflows.",
    "Built AI Exposure Management product surfaces for AI visibility, ownership, governance, shadow AI discovery, and auditable risk tracking.",
    "Delivered 30+ automations and 25+ AI workflows across 20+ systems, eliminating 200+ manual hours monthly and earning ArmorCode's AI Ninja Award.",
    "Built CodeNex, a distributed AI code generation SaaS with Spring Boot, Spring AI, SSE streaming, Kubernetes previews, MinIO/NFS persistence, RBAC, and Stripe subscriptions.",
  ],
};

export interface Experience {
  company: string;
  role: string;
  period: string;
  type: "work" | "education";
  summary: string;
  bullets: string[];
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
    role: "SDE Intern (Backend/AI)",
    period: "Jun 2024 – Dec 2024",
    type: "work",
    summary: "Shipped full-stack, backend, GenAI, and data systems for AIKO and Fantasy GPT, powering personalized sports experiences, voice AI, and retrieval-backed cricket intelligence.",
    bullets: [
      "Built Node.js and FastAPI microservices, improving API performance by 40% and reducing deployment time by 42% with Docker and GitHub Actions.",
      "Engineered Fantasy GPT with RAG, LangGraph, backend APIs, agents, and DeepEval quality checks to resolve 98% of complex sports queries.",
      "Built Python-based ETL pipelines to collect sports data from multiple sources and ingest it into MS SQL for Fantasy GPT SQL RAG workflows.",
      "Worked across AIKO, a voice-based sports companion using Azure Speech SDK for text-to-speech and speech-to-text, user-level personalization, and live AI-generated commentary in 20+ languages.",
      "Built AIKO personalization features for on-the-fly highlight reels, where AI agents stitched sports moments based on each user's profile and interests for a product presented at IBC 2024 in Amsterdam.",
    ],
  },
  {
    company: "ArmorCode",
    role: "Software Development Engineer Intern",
    period: "Jan 2025 - Nov 2025",
    type: "work",
    summary: "Built backend integrations, reusable backend infrastructure, AI-assisted scaffolding, and internal LLM platform components across ArmorCode's AppSec platform.",
    bullets: [
      "Owned backend integrations for 5+ security tools, including Black Duck, Snyk, and Checkmarx, on an AppSec platform with 130+ connectors for consolidated security finding management.",
      "Created AI-assisted code generation utilities with template engines and AST parsing to automate new integration scaffolding, reducing per-integration boilerplate setup time by 30%.",
      "Built a shared backend service-orchestration library with parallel container startup for MySQL, Elasticsearch, Redis, Kafka, MongoDB, and LocalStack across backend services.",
      "Built an OpenAI-compatible proxy in Go for Gemini CLI, Codex, and Claude Code auth with multi-account load balancing, provider fallbacks, and Redis-backed LLM caching, cutting LLM indexing costs by 70% and saving $15,000+ annually.",
      "Shipped a reusable HTTP client using Resilience4j for failure isolation, configurable backoff, timeout handling, and SSRF protection adopted across multiple services.",
    ],
  },
  {
    company: "ArmorCode",
    role: "Associate Engineer (Full-Stack GenAI)",
    period: "Dec 2025 – Present",
    type: "work",
    summary: "Own end-to-end backend, full-stack, and GenAI platform work across ArmorCode's platform agent memory, AI Exposure Management, MCP servers, gateways, automation, observability, and production AI infrastructure.",
    bullets: [
      "Architected ArmorCode's central Knowledge Graph RAG brain, ingesting 1,000,000+ entities from Zendesk, QMetry, Jira, Chorus, and codebase sources into Neo4j and pgvector, improving retrieval accuracy by 40%.",
      "Built the tenant-scoped MCP access layer around the graph brain, enabling platform and internal agents to retrieve tenant-specific context and execute authorized tools without cross-tenant leakage.",
      "Deployed and maintained ArmorCode's internal AI runtime stack with Knowledge Graph RAG, LiteLLM, OpenCode Server, n8n, and 6 production MCP servers for retrieval, model access, agent execution, and workflow orchestration.",
      "Shipped the ArmorCode platform agent memory layer with Graphiti temporal knowledge graphs, combining session-scoped context with tenant and person-level long-term Knowledge Graph recall for multi-step reasoning workflows.",
      "Contributed to ArmorCode AI Exposure Management (AIEM), building frontend and backend workflows for AI visibility, ownership, governance, shadow AI discovery, and auditable risk tracking.",
      "Built the OpenCode gateway in front of OpenCode Server using Go and Gin with observability, load balancing, task queueing, main-server routing, and scheduled and PR-triggered workflow orchestration.",
      "Delivered 30+ automations and 25+ AI workflows across 20+ systems with fallback paths, approval gates, and Slack/Jira handoffs, eliminating 200+ manual hours monthly and earning ArmorCode's AI Ninja Award in the second month after FTE conversion."
    ],
  },
];

export interface Project {
  slug: string;
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
    title: "CodeNex: AI Builder",
    category: "Full-Stack AI SaaS",
    summary: "An AI-driven code generation SaaS platform for building full React applications from natural-language prompts.",
    description: "Built an AI codegen SaaS that turns natural-language prompts into full React applications using Spring Boot and Spring AI, with SSE streaming, MinIO/NFS persistence, and Kubernetes preview pods.",
    impact: "Designed for production SaaS scale with 10K+ concurrent streams, sub-2s previews, token quotas, RBAC, autoscaling, and Stripe subscriptions.",
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
    title: "Backend & Product Engineering",
    description: "The languages, frameworks, and application-layer tools I use to build production products, APIs, and internal platforms end to end.",
    skills: ["Java 21", "Spring Boot 3", "Spring AI", "TypeScript", "Node.js", "Go", "Gin", "Python", "FastAPI", "SQLAlchemy", "Next.js", "React", "REST APIs", "Microservices", "Server-Sent Events", "RBAC", "JWT", "OAuth2", "Stripe"],
  },
  {
    title: "GenAI, Agents & Retrieval",
    description: "The AI, orchestration, and retrieval stack I use to build production-grade GenAI systems and agent workflows.",
    skills: ["RAG", "GraphRAG", "Knowledge Graph RAG", "LightRAG", "Graphiti", "Temporal Graph Memory", "Agentic AI", "Multi-Step Reasoning Agents", "Multi-Agent Systems", "LangGraph", "LangChain4j", "Spring AI", "CrewAI", "DeepEval", "MCP", "Tenant-Scoped Tools", "Prompt Engineering", "Claude", "Gemini AI", "OpenAI", "LLaMA", "LLM Proxying"],
  },
  {
    title: "Data & Search Infrastructure",
    description: "The storage, indexing, vector, and search technologies I use to make AI systems accurate, scalable, and cost-aware.",
    skills: ["PostgreSQL", "pgvector", "Neo4j", "MongoDB", "Elasticsearch", "Redis", "MSSQL", "Supabase", "MinIO", "NFS"],
  },
  {
    title: "Platform, DevOps & Delivery",
    description: "The infrastructure and operational tooling I use to deploy, route, observe, secure, and scale products reliably.",
    skills: ["Resilience4j", "Docker", "Kubernetes", "Kubernetes Autoscaling", "Fabric8", "Kubernetes Ingress", "Kafka", "LocalStack", "GitHub Actions", "Jenkins", "AWS", "Azure", "Vercel", "LiteLLM", "Grafana", "Nginx", "Load Balancing", "API Gateways", "AI Observability", "AI Security", "n8n", "OpenCode Server"],
  },
  {
    title: "Product Tooling & UX",
    description: "Supporting tools I use to ship full-stack product surfaces, admin workflows, charts, authentication, and polished UX.",
    skills: ["Auth0", "Tailwind CSS", "Framer Motion", "shadcn/ui", "next-themes", "Recharts", "Streamlit", "Swagger", "Postman", "Vite", "Kiro", "Claude Code", "Codex"],
  },
];

export const chatSuggestions = [
  "Which project best shows your backend depth?",
  "What did you build for AIEM?",
  "How did you build platform agent memory?",
  "How do you approach platform reliability?",
  "Which build best shows end-to-end ownership?",
];
