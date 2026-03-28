export const personalInfo = {
  name: "Nikunj Khitha",
  role: "Associate Engineer - GenAI Platform Engineering",
  tagline: "I build full-stack GenAI platforms with TypeScript/Node.js, Go/Gin, Java/Spring, and Python/FastAPI - from GraphRAG and AI gateways to backend APIs and workflow automation.",
  email: "njkhitha2003@gmail.com",
  linkedin: "https://www.linkedin.com/in/nikunj-khitha/",
  github: "https://github.com/Nikunj2003",
  resumeUrl: "/Nikunj_Resume.pdf",
};

export const stats = [
  { value: 200, suffix: "+", label: "Customers Supported" },
  { value: 500, suffix: "K+", label: "Entities Unified" },
  { value: 15, suffix: "K+", label: "Annual Savings" },
  { value: 200, suffix: "+", label: "Hours Saved/Month" },
];

export const about = {
  summary: "I build full-stack GenAI platforms that improve retrieval quality, lower model cost, and eliminate manual work. My work spans GraphRAG and LightRAG pipelines, TypeScript/Node.js and Go/Gin services, Java/Spring and Python/FastAPI backends, AI gateways and observability, and the automation systems that make enterprise AI reliable at scale. I enjoy owning the stack end to end - from data and APIs to infrastructure and polished product experiences.",
  highlights: [
    "Architected GenAI platforms for 200+ customers, including a GraphRAG system unifying 500K+ entities across 5+ enterprise systems.",
    "Cut indexing cost by 50%, saving $15K+ annually, while improving retrieval accuracy by 40%.",
    "Built automations across support, QA, HR, and marketing that eliminate 200+ manual hours every month.",
    "Led documentation automation for 250+ integrations, reducing update latency by 99% from 72 hours to 45 minutes.",
  ],
};

export interface Experience {
  company: string;
  role: string;
  period: string;
  type: "work" | "education";
  bullets: string[];
}

export const experiences: Experience[] = [
  {
    company: "Central Electricity Authority, Government of India",
    role: "Software Development Intern",
    period: "May 2023 - July 2023",
    type: "work",
    bullets: [
      "Enhanced a national renewable energy dashboard for 150+ power stations by integrating National Power Portal data in Java, improving accuracy by 30%.",
      "Built a secure PHP and MySQL file management system with role-based access control, improving retrieval efficiency by 25% across 5,000+ files.",
      "Developed a full-stack MERN conference room booking system that cut booking time by 60% and reduced scheduling errors by 40%.",
    ],
  },
  {
    company: "Xansr Media (Aiko)",
    role: "SDE Intern (Backend/AI)",
    period: "Jun 2024 – Dec 2024",
    type: "work",
    bullets: [
      "Built Node.js and FastAPI microservices with test-driven development, achieving 100% test coverage and improving API performance by 40%.",
      "Designed Docker and GitHub Actions CI/CD pipelines that reduced deployment time by 42%.",
      "Engineered Fantasy GPT with RAG and LangGraph to achieve 98% complex-query resolution, and built AIKO for personalized sports highlights with 96% commentary accuracy.",
      "Created scalable MSSQL and Azure ETL pipelines that maintained 100% data accuracy for AI products.",
    ],
  },
  {
    company: "ArmorCode",
    role: "AI Automation Intern",
    period: "Jan 2025 - Nov 2025",
    type: "work",
    bullets: [
      "Built backend capabilities for the core platform agent with Java and Spring Boot, including new APIs, prompt refinements, and AWS S3 vector knowledge base workflows.",
      "Led AI-driven code-to-documentation automation with CrewAI and MCP servers for 250+ security integrations, reducing update latency by 99% from 72 hours to 45 minutes.",
      "Created an OpenAI-compatible proxy for Gemini and Claude, and deployed LiteLLM to monitor 15+ AI APIs with centralized cost visibility.",
    ],
  },
  {
    company: "ArmorCode",
    role: "Associate Engineer (Platform & GenAI)",
    period: "Jan 2025 – Present",
    type: "work",
    bullets: [
      "Architected enterprise GenAI platforms for 200+ customers, including a Neo4j + PGVector GraphRAG system unifying 500,000+ entities across 5+ systems with 40% better retrieval accuracy.",
      "Orchestrated GraphRAG and LightRAG ETL pipelines that cut LLM indexing costs by 50% and saved $15,000+ annually.",
      "Expanded the core Java and Spring Boot backend with 10+ REST APIs serving 5,000+ daily requests at 99.8% uptime.",
      "Built automation suites across support, QA, HR, and marketing with n8n, Java microservices, and Python, eliminating 200+ manual hours each month.",
    ],
  },
];

export interface Project {
  slug: string;
  title: string;
  category: string;
  description: string;
  images: string[];
  tech: string[];
  github: string;
  live?: string;
}

export const projects: Project[] = [
  {
    slug: "codenex",
    title: "CodeNex",
    category: "Full Stack / AI Product",
    description: "Production-grade Java backend for the Codenex platform — a microservices-based system automating full-stack-web app generation using LLMs, inspired by Lovable/v0.",
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
    tech: ["Java", "Spring Boot", "Maven", "Docker", "Kubernetes", "Redis", "Kafka"],
    github: "https://github.com/Nikunj2003/Codenex-backend-v1",
  },
  {
    slug: "codenex-ai-api-proxy",
    title: "CodeNex AI API Proxy",
    category: "AI Infrastructure",
    description: "Unified AI gateway bridging local AI tools to the web. Single API interface to multiple LLM providers with protocol translation, provider pooling, health-tracked failover, and streaming.",
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
    category: "Full Stack / AI Product",
    description: "Open-source mental wellness app combining empathetic AI chat (Gemini 2.5 Flash), mood tracking, journaling, guided wellness sessions, and personal analytics with privacy-first design.",
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
    slug: "codenex-images",
    title: "CodeNex Images",
    category: "AI Product",
    description: "AI-powered image generation and editing platform using Google Gemini models, with Auth0 authentication and a polished editing workspace.",
    images: [
      "/images/projects/codenex-images/login-page-dark.png",
      "/images/projects/codenex-images/generation-workspace-dark.png",
    ],
    tech: ["React", "TypeScript", "Vite", "Auth0", "Gemini AI", "Node.js", "MongoDB"],
    github: "https://github.com/Nikunj2003/codenex-images",
  },
  {
    slug: "resume-fit-codenex",
    title: "Resume Fit — CodeNex",
    category: "AI Product",
    description: "AI-powered resume analysis & optimization tool with ATS score checking, multi-pillar performance scoring, refinement workflows, and keyword extraction.",
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
    slug: "llama-mcp-streamlit",
    title: "LLaMa MCP Streamlit",
    category: "AI / LLM / MCP",
    description: "Interactive AI assistant using Streamlit, NVIDIA NIM's LLaMA 3.3 70B, and Model Context Protocol (MCP) for real-time external tool execution.",
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
    title: "Generative AI & ML",
    skills: ["RAG", "GraphRAG", "LightRAG", "Agentic AI", "CrewAI", "LangGraph", "LangChain", "LangChain4j", "MCP", "Prompt Engineering", "AWS Bedrock", "Gemini AI", "OpenAI", "Claude", "LLaMA", "NVIDIA NIM", "Vertex AI", "Azure AI Foundry", "Azure Speech SDK", "Spring AI"],
  },
  {
    title: "Full Stack Development",
    skills: ["TypeScript", "Node.js", "Go", "Gin", "Java", "Spring Boot", "Maven", "Python", "FastAPI", "NestJS", "SQLAlchemy", "Next.js", "React", "Express.js", "Prisma", "Kafka", "RabbitMQ", "SQS", "Streamlit"],
  },
  {
    title: "Databases & Data",
    skills: ["Neo4j", "PostgreSQL", "pgvector", "SQLite", "Qdrant", "Pinecone", "Supabase", "AWS S3", "MongoDB", "Elasticsearch", "Azure AI Search", "Firebase", "Redis"],
  },
  {
    title: "DevOps & Infrastructure",
    skills: ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "CI/CD", "GitHub Actions", "Nginx", "Grafana", "Jenkins", "Traefik"],
  },
  {
    title: "Dev Tools & Platforms",
    skills: ["LiteLLM", "Claude Code", "Gemini CLI", "Windsurf", "OpenWeb UI", "Vercel", "Vercel AI SDK", "Vite", "Swagger", "Auth0", "Postman", "n8n", "Git", "Recharts"],
  },
];

export const chatSuggestions = [
  "How did you unify 500K entities with GraphRAG?",
  "What cut your indexing cost by 50%?",
  "How did you automate docs for 250+ integrations?",
  "How do you balance AI infra and product work?",
];
