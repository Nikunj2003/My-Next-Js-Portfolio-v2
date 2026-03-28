export const personalInfo = {
  name: "Nikunj Khitha",
  role: "Software Engineer · Full-Stack GenAI, GraphRAG & Agents",
  tagline: "I ship production-grade Generative AI systems - GraphRAG engines, multi-agent workflows, AI gateways, and MCP automations for enterprise products.",
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
  summary: "I am a software engineer focused on taking Generative AI from prototype to production. I build GraphRAG systems, multi-agent workflows, ETL and data pipelines, AI gateways, and MCP-based tooling, then ship the backend, infrastructure, and product experiences that make them useful at scale.",
  highlights: [
    "At ArmorCode, building enterprise AI systems across GraphRAG, agentic workflows, AI gateways, and automation.",
    "Delivered measurable impact: 40% better retrieval precision, 37% lower token cost, and 80% lower MTTR on production AI initiatives.",
    "Previously built AIKO and Fantasy GPT at Xansr Media with 96% commentary accuracy and 98% complex-query resolution.",
    "AI Ninja Award recipient with end-to-end ownership from backend infra to polished product experiences.",
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
      "Enhanced a national renewable energy dashboard for 150+ power stations by integrating data from the National Power Portal in Java, improving accuracy by 30%.",
      "Built a secure PHP and MySQL file management system with role-based access control and optimized retrieval for 5,000+ files by 25%.",
      "Developed a full-stack MERN conference room booking system that cut booking time by 60% and reduced scheduling errors by 40%.",
    ],
  },
  {
    company: "Xansr Media (Aiko)",
    role: "SDE Intern (Backend/AI)",
    period: "Jun 2024 – Dec 2024",
    type: "work",
    bullets: [
      "Built Node.js and FastAPI microservices with test-driven development, reaching 100% test coverage and improving API performance by 40%.",
      "Designed Docker and GitHub Actions CI/CD pipelines that reduced deployment time by 42%.",
      "Engineered Fantasy GPT with RAG and LangGraph to reach 98% complex-query resolution and built AIKO for personalized sports highlights with 96% commentary accuracy.",
      "Created scalable MSSQL and Azure ETL pipelines that maintained 100% data accuracy for AI products.",
    ],
  },
  {
    company: "Armorcode Inc.",
    role: "AI Automation Intern",
    period: "Jan 2025 - Nov 2025",
    type: "work",
    bullets: [
      "Built backend capabilities for the core platform agent with Java and Spring Boot, including new APIs, prompt refinements, and AWS S3 vector knowledge base management.",
      "Led AI-driven code-to-documentation automation with CrewAI and MCP servers for 250+ security integrations, reducing update latency by 99% from 72 hours to 45 minutes.",
      "Created an OpenAI-compatible proxy API for Gemini and Claude and deployed LiteLLM to monitor 15+ AI APIs with centralized cost visibility.",
    ],
  },
  {
    company: "ArmorCode",
    role: "Associate Engineer (Platform & GenAI)",
    period: "Jan 2025 – Present",
    type: "work",
    bullets: [
      "Architected enterprise GenAI platforms for 200+ customers and designed a Neo4j plus PGVector GraphRAG platform unifying 500,000+ entities across 5+ systems with 40% better retrieval accuracy.",
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
    slug: "codenex-backend-v1",
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
      "/images/projects/resumefit/system-architecture-dark.png",
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
