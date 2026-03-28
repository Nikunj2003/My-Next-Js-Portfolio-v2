import { about, experiences, personalInfo, projects, skillCategories, stats } from "@/data/portfolio";

export const CHAT_MEMORY_WINDOW = 10;
export const CHAT_STORAGE_KEY = "nikunj-ai-twin-chat";
export const PROJECT_ANCHOR_PREFIX = "project-";
export const WELCOME_MESSAGE = "Hey! I'm Nikunj's AI twin. Ask me anything about his projects, tech stack, or experience - I'll answer as he would. [Jump to projects](#projects) or [download his resume](/Nikunj_Resume.pdf) any time.";

export function getProjectAnchor(slug: string) {
  return `#${PROJECT_ANCHOR_PREFIX}${slug}`;
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const projectMatchers = projects.map((project) => ({
  project,
  phrases: Array.from(
    new Set(
      [
        normalizeText(project.title),
        normalizeText(project.title.replace(/\bv\d+\b/gi, "")),
        normalizeText(project.slug.replace(/-/g, " ")),
        ...project.title.split(/[-:|\u2013\u2014]/).map((part) => normalizeText(part)),
      ].filter((phrase) => phrase.length > 0)
    )
  ),
}));

const projectAnchorMap = new Map(projects.map((project) => [getProjectAnchor(project.slug), project]));

const profileStats = stats.map((stat) => `${stat.value}${stat.suffix} ${stat.label}`).join(", ");

const experienceContext = experiences
  .map(
    (experience) =>
      `- ${experience.company} | ${experience.role} | ${experience.period}\n${experience.bullets
        .map((bullet) => `  - ${bullet}`)
        .join("\n")}`
  )
  .join("\n");

const projectContext = projects
  .map(
    (project) =>
      `- ${project.title} (${project.category})\n  - Description: ${project.description}\n  - Tech: ${project.tech.join(", ")}\n  - Internal link: ${getProjectAnchor(project.slug)}\n  - GitHub: ${project.github}`
  )
  .join("\n");

const skillContext = skillCategories
  .map((category) => `- ${category.title}: ${category.skills.join(", ")}`)
  .join("\n");

export const PORTFOLIO_CONTEXT = `
Personal info:
- Name: ${personalInfo.name}
- Role: ${personalInfo.role}
- Tagline: ${personalInfo.tagline}
- Email: ${personalInfo.email}
- LinkedIn: ${personalInfo.linkedin}
- GitHub: ${personalInfo.github}
- Resume: ${personalInfo.resumeUrl}

Professional summary:
- ${about.summary}
- Highlights: ${about.highlights.join(" | ")}
- Stats: ${profileStats}

Experience:
${experienceContext}

Projects:
${projectContext}

Skills:
${skillContext}

Navigation links:
- Contact section: #contact
- Projects section: #projects
- Resume download: ${personalInfo.resumeUrl}
`;

export const PORTFOLIO_LINK_GUIDE = `
When links would help the user, use these markdown links directly in the answer:
- [Jump to Contact](#contact)
- [View LinkedIn](${personalInfo.linkedin})
- [View GitHub](${personalInfo.github})
- [Browse Projects](#projects)
- [Download Resume](${personalInfo.resumeUrl})
${projects
  .map(
    (project) =>
      `- [View ${project.title}](${getProjectAnchor(project.slug)})\n- [Open ${project.title} Repo](${project.github})`
  )
  .join("\n")}
`;

export function findMatchingProjects(text: string) {
  const corpus = normalizeText(text);

  return projectMatchers
    .filter(({ phrases }) => phrases.some((phrase) => phrase.length > 0 && corpus.includes(phrase)))
    .map(({ project }) => project)
    .slice(0, 2);
}

function getAnchorLabel(href: string) {
  if (href === "#contact") return "Contact section";
  if (href === "#projects") return "Projects section";

  const project = projectAnchorMap.get(href);
  if (project) return project.title;

  return href.replace(/^#/, "");
}

function normalizeGeneratedLinks(response: string) {
  let next = response;

  next = next.replace(/\[(#(?:project-[a-z0-9-]+|projects|contact))\]/gi, (_, href: string) => {
    return `[${getAnchorLabel(href)}](${href})`;
  });

  next = next.replace(/(View details:\s*)(#(?:project-[a-z0-9-]+|projects|contact))/gi, (_, prefix: string, href: string) => {
    return `${prefix}[${getAnchorLabel(href)}](${href})`;
  });

  return next;
}

type InlineLink = {
  href: string;
  label: string;
  kind: "linkedin" | "github" | "resume" | "contact" | "projects" | "project" | "repo";
};

function buildInlineLinkSentence(links: InlineLink[]) {
  if (links.length === 0) return "";

  const clauses = links.map((link) => {
    switch (link.kind) {
      case "linkedin":
        return `view Nikunj's [LinkedIn](${link.href})`;
      case "github":
        return `browse Nikunj's [GitHub](${link.href})`;
      case "resume":
        return `download the [resume](${link.href})`;
      case "contact":
        return `jump to the [Contact section](${link.href})`;
      case "projects":
        return `open the [Projects section](${link.href})`;
      case "project":
        return `view [${link.label}](${link.href})`;
      case "repo":
        return `browse the [${link.label}](${link.href})`;
      default:
        return `open [${link.label}](${link.href})`;
    }
  });

  if (clauses.length === 1) {
    return `You can ${clauses[0]} here.`;
  }

  if (clauses.length === 2) {
    return `You can ${clauses[0]} and ${clauses[1]} here.`;
  }

  const lastClause = clauses[clauses.length - 1];
  return `You can ${clauses.slice(0, -1).join(", ")}, and ${lastClause} here.`;
}

export function appendContextualLinks(userMessage: string, aiResponse: string) {
  const response = normalizeGeneratedLinks(aiResponse.trim());
  const normalizedUserMessage = normalizeText(userMessage);
  const links: InlineLink[] = [];
  const asksForLinkedIn = /(linkedin|linked in)/i.test(normalizedUserMessage);
  const asksForGitHub = /(github|git hub)/i.test(normalizedUserMessage);
  const asksForResume = /\b(resume|cv)\b/i.test(normalizedUserMessage);
  const asksForRepo = /(repo|repository|source code|codebase|open source|open-source)/i.test(normalizedUserMessage);
  const asksForProjectLink = /(project link|live link|demo link|link to|open|show me|navigate|take me|where can i see|where can i find)/i.test(normalizedUserMessage);
  const asksForContactSection = /(contact section|open contact|navigate to contact|take me to contact)/i.test(normalizedUserMessage);
  const asksForProjectsSection = /(projects section|open projects|navigate to projects|take me to projects)/i.test(normalizedUserMessage);

  const addLink = (link: InlineLink) => {
    const { href } = link;
    if (response.includes(href) || links.some((link) => link.href === href)) return;
    links.push(link);
  };

  if (asksForLinkedIn) {
    addLink({ label: "LinkedIn", href: personalInfo.linkedin, kind: "linkedin" });
  }

  if (asksForResume) {
    addLink({ label: "resume", href: personalInfo.resumeUrl, kind: "resume" });
  }

  if (asksForGitHub) {
    addLink({ label: "GitHub", href: personalInfo.github, kind: "github" });
  }

  if (asksForContactSection) {
    addLink({ label: "Contact section", href: "#contact", kind: "contact" });
  }

  if (asksForProjectsSection) {
    addLink({ label: "Projects section", href: "#projects", kind: "projects" });
  }

  const matchedProjects = findMatchingProjects(userMessage);

  matchedProjects.forEach((project) => {
    if (asksForProjectLink) {
      addLink({ label: project.title, href: getProjectAnchor(project.slug), kind: "project" });
    }

    if (asksForRepo || asksForGitHub) {
      addLink({ label: `${project.title} repo`, href: project.github, kind: "repo" });
    }
  });

  if (links.length === 0) return response;

  const inlineLinkSentence = buildInlineLinkSentence(links);
  return inlineLinkSentence ? `${response}\n\n${inlineLinkSentence}` : response;
}
