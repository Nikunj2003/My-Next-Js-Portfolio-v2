export const personalInfo = {
  name: "Nikunj Khitha",
  role: "Software Engineer · GenAI Platforms & Multi-Agent Systems",
  tagline: "I productionize Generative AI — building GraphRAG engines, platform agents, AI gateways, and MCP-based automations for real enterprise environments.",
  email: "njkhitha2003@gmail.com",
  linkedin: "https://www.linkedin.com/in/nikunj-khitha/",
  github: "https://github.com/Nikunj2003",
  resumeUrl: "/Nikunj_Resume.pdf",
};

export const stats = [
  { value: 2, suffix: "+", label: "Years Experience" },
  { value: 7, suffix: "+", label: "Production Projects" },
  { value: 60, suffix: "+", label: "Technologies" },
  { value: 1, suffix: "", label: "AI Ninja Award 🏆" },
];

export const about = {
  summary: "I'm a software engineer at the intersection of AI, automation, and platform engineering. I specialize in architecting GraphRAG systems, multi-agent orchestrations (LangGraph/LangChain), ETL pipelines, vector stores, and MCP-based tooling — taking them from prototype to production at enterprise scale.",
  highlights: [
    "Currently an Associate Engineer (Platform & GenAI) at ArmorCode, building enterprise AI infrastructure that serves 200+ customers.",
    "Previously built voice-based sports AI assistants at Xansr Media (Aiko), achieving 96% commentary accuracy.",
    "End-to-end ownership from backend infra to polished products — Serenify, Resume Fit, Codenex Images, and more.",
    "B.Tech CSE graduate from The NorthCap University (CGPA 8.16).",
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
    company: "ArmorCode",
    role: "Associate Engineer (Platform & GenAI)",
    period: "Jan 2025 – Present",
    type: "work",
    bullets: [
      "Architected \"Nexus\", a hybrid GraphRAG engine using FastAPI + Neo4j, integrating 5+ enterprise data sources and improving retrieval precision by ~40%.",
      "Core contributor to \"Anya\", an autonomous security platform agent using AWS Bedrock, S3 vector stores, LangChain4j, Spring AI, and MCP — serving 200+ enterprise customers.",
      "Designed a unified multi-provider AI gateway (Gemini, Claude, OpenAI) reducing token costs by 37% through prompt templates, caching, and provider pooling.",
      "Developed MCP servers in n8n/Go/Python powering SDLC, security, and documentation automations. Received ArmorCode's first \"AI Ninja Award\".",
    ],
  },
  {
    company: "Xansr Media (Aiko)",
    role: "SDE Intern (Backend/AI)",
    period: "Jun 2024 – Dec 2024",
    type: "work",
    bullets: [
      "Built scalable backend for AIKO (voice-based sports assistant) using FastAPI, NestJS, and async queues achieving ~96% commentary accuracy.",
      "Engineered ETL pipelines integrating Azure AI Foundry, Azure AI Search, Azure Speech SDK, and SQLAlchemy.",
      "Developed Fantasy GPT — a multi-step reasoning sports agent with LangGraph, SQL RAG, and fine-tuned LLM resolving ~98% complex sports queries.",
    ],
  },
  {
    company: "The NorthCap University",
    role: "B.Tech Computer Science & Engineering",
    period: "Aug 2021 – Jun 2025",
    type: "education",
    bullets: ["CGPA: 8.16 · Gurugram, India"],
  },
];

export interface Project {
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
    title: "CodeNex Backend v1",
    category: "Backend / Microservices",
    description: "Production-grade Java backend for the Codenex platform — a microservices-based system automating full-stack-web app generation using LLMs, inspired by Lovable/v0.",
    images: [
      "/images/projects/codenex/landing-page-light.png",
      "/images/projects/codenex/landing-page-dark.png",
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
      "/images/projects/resumefit/system-architecture-dark.png",
    ],
    tech: ["React", "TypeScript", "Gemini AI", "Vercel AI SDK", "Recharts"],
    github: "https://github.com/Nikunj2003/Resume-Fit-Codenex",
  },
  {
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
    skills: ["Java", "Spring Boot", "Maven", "Python", "FastAPI", "Go", "Gin", "NestJS", "SQLAlchemy", "TypeScript", "Node.js", "Next.js", "React", "Express.js", "Prisma", "Kafka", "RabbitMQ", "SQS", "Streamlit"],
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
  "Explain your GraphRAG engine architecture",
  "How does your AI gateway pool providers?",
  "Walk me through Serenify's RAG pipeline",
  "What's your experience with MCP?",
];
