export const personalInfo = {
  name: "Nikunj Khitha",
  role: "Full-Stack GenAI Engineer",
  tagline: "I build production GenAI platforms, backend systems, and product experiences that improve retrieval quality, reduce model cost, and automate work at real scale.",
  focus: "Open to full-stack GenAI, AI platform, and backend product engineering roles where I can own architecture, delivery, and measurable outcomes.",
  email: "njkhitha2003@gmail.com",
  linkedin: "https://www.linkedin.com/in/nikunj-khitha/",
  github: "https://github.com/Nikunj2003",
  resumeUrl: "/Nikunj_Resume.pdf",
};

export const stats = [
  { value: 200, suffix: "+", label: "Customers Served" },
  { value: 500, suffix: "K+", label: "Entities Unified" },
  { value: 40, suffix: "%", label: "Retrieval Lift" },
  { value: 50, suffix: "%", label: "Indexing Cost Cut" },
];

export const about = {
  summary: "I work best on products and platforms where AI has to be useful, reliable, and cost-aware — not just impressive in a demo. My sweet spot is owning the system end to end: shaping the product experience, building the backend and retrieval layer, wiring the infrastructure, and turning model behavior into something teams can trust in production.",
  highlights: [
    "Architected a GraphRAG platform for 200+ customers that unified 500K+ entities across 5+ enterprise systems and improved retrieval accuracy by 40%.",
    "Reduced LLM indexing cost by 50%, saving $15K+ annually, by redesigning ingestion and retrieval workflows instead of simply scaling spend.",
    "Built backend APIs, automation systems, and internal tooling that removed 200+ manual hours per month across support, QA, HR, and marketing.",
    "Led AI-driven documentation automation for 250+ integrations and shipped multi-model gateway tooling with centralized observability and control.",
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
    summary: "Shipped backend and AI systems for sports products, with strong emphasis on service quality, delivery speed, and retrieval-backed user experiences.",
    bullets: [
      "Built Node.js and FastAPI microservices with test-driven development, reaching 100% test coverage and improving API performance by 40%.",
      "Designed Docker and GitHub Actions delivery pipelines that reduced deployment time by 42% and improved release confidence.",
      "Engineered Fantasy GPT with RAG and LangGraph to resolve 98% of complex sports queries and built AIKO to deliver personalized highlights with 96% commentary accuracy.",
      "Created scalable MSSQL and Azure ETL pipelines that maintained 100% data accuracy for AI product workflows.",
    ],
  },
  {
    company: "ArmorCode",
    role: "AI Automation Intern",
    period: "Jan 2025 - Nov 2025",
    type: "work",
    summary: "Built production AI automation and platform capabilities across documentation, knowledge workflows, and multi-model infrastructure.",
    bullets: [
      "Expanded the core platform agent with Java and Spring Boot APIs, prompt improvements, and AWS S3 vector knowledge base workflows.",
      "Led AI-driven code-to-documentation automation for 250+ security integrations using CrewAI and MCP servers, cutting update latency by 99% from 72 hours to 45 minutes.",
      "Built an OpenAI-compatible proxy for Gemini and Claude and deployed LiteLLM to monitor 15+ AI APIs with centralized cost visibility.",
    ],
  },
  {
    company: "ArmorCode",
    role: "Associate Engineer (Full-Stack GenAI)",
    period: "Dec 2025 – Present",
    type: "work",
    summary: "Own end-to-end GenAI product and platform work across retrieval, backend APIs, automation, and production reliability for enterprise customers.",
    bullets: [
      "Architected enterprise GenAI platforms for 200+ customers, including a Neo4j + PGVector GraphRAG system that unified 500,000+ entities across 5+ systems and improved retrieval accuracy by 40%.",
      "Orchestrated GraphRAG and LightRAG ETL pipelines that cut LLM indexing costs by 50% and saved $15,000+ annually.",
      "Expanded the core Java and Spring Boot backend with 10+ REST APIs serving 5,000+ daily requests at 99.8% uptime for GenAI product workflows.",
      "Built automation suites across support, QA, HR, and marketing with n8n, Java microservices, and Python, eliminating 200+ manual hours per month.",
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
    category: "Full-Stack AI Product",
    summary: "A full-stack AI app builder designed like a real product, not a toy prompt box.",
    description: "Built a full-stack AI builder inspired by Lovable and v0, with a Java microservices backend, authentication, dashboards, usage views, and a guided builder workflow across Redis, Kafka, Docker, and Kubernetes.",
    impact: "Shows product thinking, backend architecture depth, and the ability to package GenAI into a usable developer platform.",
    role: "Product architecture, backend systems, and platform design",
    timeline: "Flagship platform build",
    complexity: "Distributed systems, orchestration, auth, and usage tracking",
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
    tech: ["Java", "Spring Boot", "React", "TypeScript", "Docker", "Kubernetes", "Redis", "Kafka"],
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
    description: "The languages, frameworks, and application-layer tools I use to build production products end to end.",
    skills: ["TypeScript", "Node.js", "Go", "Gin", "Java", "Spring Boot", "Maven", "Python", "FastAPI", "NestJS", "SQLAlchemy", "Express.js", "Next.js", "React", "Prisma"],
  },
  {
    title: "GenAI, Agents & Retrieval",
    description: "The AI, orchestration, and retrieval stack I use to build production-grade GenAI systems and agent workflows.",
    skills: ["RAG", "GraphRAG", "LightRAG", "Agentic AI", "Multi-Agent Systems", "LangGraph", "LangChain", "LangChain4j", "Spring AI", "CrewAI", "MCP", "Prompt Engineering", "Vercel AI SDK", "Claude", "Gemini AI", "OpenAI", "LLaMA", "NVIDIA NIM", "AWS Bedrock", "Vertex AI"],
  },
  {
    title: "Data & Search Infrastructure",
    description: "The storage, indexing, vector, and search technologies I use to make AI systems accurate, scalable, and cost-aware.",
    skills: ["PostgreSQL", "pgvector", "Neo4j", "Qdrant", "Pinecone", "MongoDB", "Elasticsearch", "Azure AI Search", "Supabase", "AWS S3", "Redis"],
  },
  {
    title: "Platform, DevOps & Delivery",
    description: "The infrastructure and operational tooling I use to deploy, observe, and scale products reliably.",
    skills: ["Docker", "Kubernetes", "Kafka", "RabbitMQ", "SQS", "CI/CD", "GitHub Actions", "Jenkins", "AWS", "Azure", "LiteLLM", "Grafana", "Nginx", "Traefik", "n8n"],
  },
  {
    title: "Product Tooling & UX",
    description: "Supporting tools I use to shape authentication, charts, prototypes, and polished product workflows.",
    skills: ["Auth0", "Tailwind CSS", "Framer Motion", "shadcn/ui", "next-themes", "Recharts", "Streamlit", "Swagger", "Postman", "Vite", "Vercel"],
  },
];

export const chatSuggestions = [
  "What impact are you driving at ArmorCode?",
  "Which project best shows your backend depth?",
  "How did you cut indexing cost by 50%?",
  "What kind of roles are you targeting next?",
  "How do you balance product UX and AI infra?",
];
