export const personalInfo = {
  name: "Nikunj Khitha",
  role: "Full-Stack GenAI Engineer",
  tagline: "I build backend systems, full-stack products, and AI platforms where APIs, gateways, security, observability, and model workflows have to work together in production.",
  focus: "Open to backend, full-stack, platform, and GenAI engineering roles where I can own architecture, delivery, and measurable outcomes.",
  email: "njkhitha2003@gmail.com",
  linkedin: "https://www.linkedin.com/in/nikunj-khitha/",
  github: "https://github.com/Nikunj2003",
  resumeUrl: "/Nikunj_Resume.pdf",
};

export const stats = [
  { value: 200, suffix: "+", label: "Customers Served" },
  { value: 10, suffix: "+", label: "Backend APIs" },
  { value: 5, suffix: "K+", label: "Daily API Requests" },
  { value: 40, suffix: "%", label: "Retrieval Lift" },
];

export const about = {
  summary: "I work best on products and platforms where backend systems have to be reliable, AI has to be useful, and the user experience has to earn trust in production. My sweet spot is owning the system end to end: designing the product surface, building Java/Spring Boot and Node.js backends, shaping gateways and load-balancing layers, wiring observability and security controls, and turning model behavior into software teams can trust.",
  highlights: [
    "Architected a GraphRAG platform for 200+ customers that unified 500K+ entities across 5+ enterprise systems and improved retrieval accuracy by 40%.",
    "Expanded Java and Spring Boot backends with 10+ REST APIs, gateway capabilities, and platform workflows serving 5,000+ daily requests.",
    "Built AIEM-facing full-stack and backend features for AI security, observability, ownership, governance, and shadow AI risk workflows.",
    "Shipped Anya backend memory, OpenCode gateway work, MCP-enabled tooling, and automation systems that removed 200+ manual hours per month.",
    "Built CodeNex, a distributed AI code generation SaaS with Spring Boot, Spring AI, SSE streaming, Kubernetes previews, MinIO/NFS persistence, RBAC, and Stripe subscriptions.",
    "Reduced LLM indexing cost by 50%, saving $15K+ annually, by redesigning ingestion and retrieval workflows instead of simply scaling spend.",
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
      "Built a secure PHP/MySQL file management system with role-based access control that improved retrieval efficiency by 25% across 5,000+ files.",
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
      "Built Node.js and FastAPI microservices with test-driven development, reaching 92% test coverage and improving API performance by 40%.",
      "Designed Docker and GitHub Actions delivery pipelines that reduced deployment time by 42% and improved release confidence.",
      "Worked across the backend and frontend of AIKO, a voice-based sports companion using Azure Speech SDK for text-to-speech and speech-to-text, user-level personalization, and live AI-generated commentary in 20+ languages.",
      "Built AIKO personalization features for on-the-fly highlight reels, where AI agents stitched sports moments based on each user's profile and interests; the product was presented at IBC 2024 in Amsterdam.",
      "Engineered Fantasy GPT with RAG, LangGraph, backend APIs, and a multi-agent layer to resolve 98% of complex sports queries, then evaluated answer quality with DeepEval.",
      "Created scalable ETL pipelines with SQLAlchemy to transform cricket data into MSSQL for the SQL RAG agent, maintaining 100% data accuracy across AI product workflows.",
    ],
  },
  {
    company: "ArmorCode",
    role: "AI Automation Intern",
    period: "Jan 2025 - Nov 2025",
    type: "work",
    summary: "Built production automation, backend APIs, knowledge workflows, and multi-model platform infrastructure across ArmorCode's AI systems.",
    bullets: [
      "Expanded the core platform agent with Java and Spring Boot APIs, prompt improvements, and AWS S3 vector knowledge base workflows.",
      "Led AI-driven code-to-documentation automation for 250+ security integrations using CrewAI and MCP servers, cutting update latency by 99% from 72 hours to 45 minutes.",
      "Built an OpenAI-compatible proxy for Gemini and Claude and deployed LiteLLM to monitor 15+ AI APIs with centralized cost visibility.",

      "Built automation suites across support, QA, HR, and marketing with n8n, Java microservices, and Python, eliminating 200+ manual hours per month.",
      "Expanded the core Java and Spring Boot backend with 10+ REST APIs serving 5,000+ daily requests at 99.8% uptime for AI and platform product workflows.",
    ],
  },
  {
    company: "ArmorCode",
    role: "Associate Engineer (Full-Stack GenAI)",
    period: "Dec 2025 – Present",
    type: "work",
    summary: "Own end-to-end backend, full-stack, and GenAI platform work across Anya, AI Exposure Management, gateways, observability, automation, and production reliability.",
    bullets: [
      "Architected enterprise GenAI platforms for 200+ customers, including a Neo4j + PGVector GraphRAG system that unified 500,000+ entities across 5+ systems and improved retrieval accuracy by 40%.",
      "Built the backend memory layer for Anya, ArmorCode's multi-step reasoning agent, using Graphiti-backed temporal graph memory with session-scoped context and person-level long-term GraphRAG recall.",
      "Developed AI Exposure Management (AIEM) capabilities across frontend and backend workflows for AI security, observability, ownership, governance, shadow AI visibility, and auditable risk outcomes.",
      "Built gateway and load-balancing capabilities for OpenCode server workflows with built-in MCP support, AI security controls, observability, and operational routing.",
      "Orchestrated GraphRAG and LightRAG ETL pipelines that cut LLM indexing costs by 50% and saved $15,000+ annually."
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
  },
  {
    slug: "codenex-ai-api-proxy",
    title: "CodeNex AI API Proxy",
    category: "AI Gateway & Infra",
    summary: "A unified AI gateway for routing across providers through one consistent API layer.",
    description: "Built a provider-agnostic AI gateway that handles protocol translation, provider pooling, health-aware failover, streaming, and operational controls behind a single API surface.",
    impact: "Demonstrates strong infra instincts around reliability, abstraction, observability, and multi-model platform design.",
    role: "Gateway architecture, backend implementation, and operational tooling",
    timeline: "Infra-focused product build",
    complexity: "Provider abstraction, failover, streaming, and control plane UX",
    images: [
      "/images/projects/codenex-proxy/dashbord.png",
      "/images/projects/codenex-proxy/providers.png",
      "/images/projects/codenex-proxy/api-docs.png",
      "/images/projects/codenex-proxy/login.png",
    ],
    tech: ["Go", "Gin", "Node.js", "Express.js", "Redis", "PostgreSQL", "React"],
    github: "https://github.com/Nikunj2003/codenex-ai-api-proxy",
  },
  {
    slug: "serenify",
    title: "Serenify",
    category: "Full-Stack AI Product",
    summary: "A consumer-style AI wellness product with thoughtful UX, not just chat wrapped around a model.",
    description: "Built an open-source AI wellness platform that combines empathetic chat, mood tracking, journaling, guided sessions, and privacy-aware analytics into a product users can return to consistently.",
    impact: "Shows product empathy, end-user UX judgment, and the ability to shape AI into a coherent consumer experience.",
    role: "Product design, frontend experience, and AI workflow implementation",
    timeline: "Full product build",
    complexity: "State-rich UX, AI interactions, privacy-minded product design",
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
    skills: ["TypeScript", "Node.js", "Go", "Gin", "Java", "Spring Boot", "Maven", "Python", "FastAPI", "NestJS", "SQLAlchemy", "Express.js", "Next.js", "React", "Prisma", "REST APIs", "Server-Sent Events", "RBAC"],
  },
  {
    title: "GenAI, Agents & Retrieval",
    description: "The AI, orchestration, and retrieval stack I use to build production-grade GenAI systems and agent workflows.",
    skills: ["RAG", "GraphRAG", "LightRAG", "Graphiti", "Temporal Graph Memory", "Agentic AI", "Multi-Step Reasoning Agents", "Multi-Agent Systems", "LangGraph", "LangChain", "LangChain4j", "Spring AI", "CrewAI", "MCP", "Prompt Engineering", "Vercel AI SDK", "Claude", "Gemini AI", "OpenAI", "LLaMA", "NVIDIA NIM", "AWS Bedrock", "Vertex AI"],
  },
  {
    title: "Data & Search Infrastructure",
    description: "The storage, indexing, vector, and search technologies I use to make AI systems accurate, scalable, and cost-aware.",
    skills: ["PostgreSQL", "pgvector", "Neo4j", "Qdrant", "Pinecone", "MongoDB", "Elasticsearch", "Azure AI Search", "Supabase", "AWS S3", "MinIO", "NFS", "Redis"],
  },
  {
    title: "Platform, DevOps & Delivery",
    description: "The infrastructure and operational tooling I use to deploy, route, observe, secure, and scale products reliably.",
    skills: ["Docker", "Kubernetes", "Kubernetes Autoscaling", "Fabric8", "Ingress", "Kafka", "RabbitMQ", "SQS", "CI/CD", "GitHub Actions", "Jenkins", "AWS", "Azure", "LiteLLM", "Grafana", "Nginx", "Traefik", "Load Balancing", "API Gateways", "AI Observability", "AI Security", "n8n"],
  },
  {
    title: "Product Tooling & UX",
    description: "Supporting tools I use to ship full-stack product surfaces, admin workflows, charts, authentication, and polished UX.",
    skills: ["Auth0", "Stripe", "Tailwind CSS", "Framer Motion", "shadcn/ui", "next-themes", "Recharts", "Streamlit", "Swagger", "Postman", "Vite", "Vercel"],
  },
];

export const chatSuggestions = [
  "Which project best shows your backend depth?",
  "What did you build for AIEM?",
  "How did you build Anya memory?",
  "How do you approach platform reliability?",
  "Which build best shows end-to-end ownership?",
];
