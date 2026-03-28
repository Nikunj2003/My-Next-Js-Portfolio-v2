import { about, personalInfo } from "@/data/portfolio";

const siteUrl = "https://nikunj.codenex.dev";

export const siteConfig = {
  siteUrl,
  homeUrl: `${siteUrl}/`,
  resumeUrl: `${siteUrl}${personalInfo.resumeUrl}`,
  updatedAt: "2026-03-28T00:00:00.000Z",
  siteName: "Nikunj Khitha Portfolio",
  title: `${personalInfo.name} — Full Stack GenAI Developer`,
  description: personalInfo.tagline,
  author: personalInfo.name,
  creator: personalInfo.name,
  email: personalInfo.email,
  github: personalInfo.github,
  linkedin: personalInfo.linkedin,
  locale: "en_IN",
  ogImage: "/images/projects/codenex/landing-page-light.png",
  keywords: [
    "Nikunj Khitha",
    "Full Stack GenAI Developer",
    "Software Engineer",
    "GraphRAG",
    "Multi-Agent Systems",
    "MCP",
    "LangChain",
    "LangGraph",
    "FastAPI",
    "AI Infrastructure",
    "RAG",
    "Platform Engineering",
  ],
  geo: {
    region: "IN-HR",
    placename: "Gurugram, Haryana, India",
    latitude: 28.4595,
    longitude: 77.0266,
    position: "28.4595;77.0266",
    icbm: "28.4595, 77.0266",
  },
  sameAs: [personalInfo.github, personalInfo.linkedin],
  aboutSummary: about.summary,
} as const;

export const canonicalPages = [siteConfig.homeUrl] as const;
