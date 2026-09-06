import { caseStudies, getCaseStudyPath } from "@/data/case-studies";
import { about, experiences, highlightSentences, personalInfo, projects, recognition, skillCategories, stats } from "@/data/portfolio";

export const CHAT_MEMORY_WINDOW = 10;
export const CHAT_STORAGE_KEY = "nikunj-ai-twin-chat";
export const PROJECT_ANCHOR_PREFIX = "project-";
export const WELCOME_MESSAGE = "Hi — I’m Nikunj’s AI twin. I can give you a quick recruiter summary, walk through a project, or explain how he approaches agent systems, governed MCP tool use, agent memory, evaluation, and AI product delivery. You can also read the [LLM evaluation platform case study](/work/llm-evaluation-platform), [browse the work](#work), or [download the resume](/Nikunj_Resume.pdf).";

type ConversationWindowMessage = {
  content: string;
  id?: string;
  role?: "user" | "assistant";
  sender?: "user" | "ai";
};

function getConversationWindowRole(message: ConversationWindowMessage) {
  if (message.id === "welcome") return null;
  if (message.role === "user" || message.role === "assistant") return message.role;
  if (message.sender === "user" || message.sender === "ai") return message.sender;
  return null;
}

export function trimConversationHistory<T extends ConversationWindowMessage>(
  messages: T[],
  maxMessages = CHAT_MEMORY_WINDOW
) {
  if (maxMessages <= 0) return [];

  const turns: T[][] = [];
  let currentTurn: T[] = [];

  messages.forEach((message) => {
    const role = getConversationWindowRole(message);

    if (!role) return;

    if (role === "user") {
      if (currentTurn.length > 0) {
        turns.push(currentTurn);
      }

      currentTurn = [message];
      return;
    }

    if (currentTurn.length === 0) return;
    currentTurn.push(message);
  });

  if (currentTurn.length > 0) {
    turns.push(currentTurn);
  }

  const trimmed: T[] = [];

  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];

    if (trimmed.length + turn.length > maxMessages) {
      break;
    }

    trimmed.unshift(...turn);
  }

  return trimmed;
}

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

const caseStudyMatchers = caseStudies.map((study) => ({
  study,
  phrases: Array.from(
    new Set(
      [
        normalizeText(study.title),
        normalizeText(study.slug.replace(/-/g, " ")),
        ...study.tags.map((tag) => normalizeText(tag)),
        ...study.aliases.map((alias) => normalizeText(alias)),
      ].filter((phrase) => phrase.length > 0)
    )
  ),
}));

export function findMatchingCaseStudies(text: string) {
  const corpus = normalizeText(text);

  return caseStudyMatchers
    .filter(({ phrases }) => phrases.some((phrase) => corpus.includes(phrase)))
    .map(({ study }) => study)
    .slice(0, 2);
}

const profileStats = stats.map((stat) => `${stat.value}${stat.suffix} ${stat.label}`).join(", ");

const experienceContext = experiences
  .map(
    (experience) =>
      `- ${experience.company} | ${experience.role} | ${experience.period}\n${experience.bullets
        .map((bullet) => `  - ${bullet}`)
        .join("\n")}`
  )
  .join("\n");

/**
 * An index of the case studies, not their full text.
 *
 * This deliberately omits every decision body and section body. Those used to be
 * inlined here, which meant the full prose of every study was resent on every
 * single request — a cost that grew linearly with the number of case studies and
 * would have tripled as the set went from three to nine.
 *
 * Depth is available on demand instead: `get_case_study(slug, section?)` returns
 * the problem, constraints, decisions with their rejected alternatives, results,
 * ownership, or the full section detail. That is both cheaper and more honest to
 * the design of the chat — the agent fetches what a question actually needs, and
 * the visitor sees it do so in the trace.
 *
 * Slugs are listed so the model always has a valid argument for the tool.
 * Results and the ownership boundary stay inline because they are short, they are
 * the two things most likely to be asked for directly, and the ownership line
 * must never be paraphrased from memory.
 */
const caseStudyContext = caseStudies
  .map((study) => {
    const results = study.results.map((result) => `${result.metric} ${result.label}`).join("; ");

    return (
      `- ${study.title}${study.employer ? ` at ${study.employer}` : ""} (${study.period}) — slug: ${study.slug} — page: ${getCaseStudyPath(study.slug)}\n` +
      `  - One-liner: ${study.oneLiner}\n` +
      `  - Themes: ${[...study.tags, ...study.stack.slice(0, 6)].join(", ")}\n` +
      `  - Results: ${results}\n` +
      `  - Ownership boundary: ${study.ownership}\n` +
      `  - For the problem, constraints, decisions, rejected alternatives, or section detail: call get_case_study("${study.slug}").`
    );
  })
  .join("\n");

const projectContext = projects
  .map(
    (project) =>
      `- ${project.title} (${project.category})\n  - Description: ${project.description}\n  - Tech: ${project.tech.join(", ")}\n  - Internal link: ${getProjectAnchor(project.slug)}\n  - GitHub: ${project.github}`
      + (project.live ? `\n  - Live: ${project.live}` : "")
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
- Highlights: ${highlightSentences.join(" | ")}
- Stats: ${profileStats}
- Recognition: ${recognition.title} — ${recognition.detail}

Experience:
${experienceContext}

Engineering case studies (deep-dive pages on this site — the strongest technical proof available):
${caseStudyContext}

Projects:
${projectContext}

Skills:
${skillContext}

Navigation links:
- Contact section: #contact
- Work section: #work
- Resume download: ${personalInfo.resumeUrl}
${caseStudies.map((study) => `- ${study.title} case study: ${getCaseStudyPath(study.slug)}`).join("\n")}
`;

/**
 * Topic-level context for the suggestion generator, which only needs to know
 * which subjects exist to write four short follow-up questions. Sending it the
 * full case-study prose was costing more tokens than the answer prompt itself.
 */
export const PORTFOLIO_CONTEXT_BRIEF = `
Personal info:
- Name: ${personalInfo.name}
- Role: ${personalInfo.role}
- Tagline: ${personalInfo.tagline}

Professional summary:
- ${about.summary}
- Stats: ${profileStats}
- Recognition: ${recognition.title} — ${recognition.detail}

Experience (companies and roles):
${experiences.map((experience) => `- ${experience.company} | ${experience.role} | ${experience.period}\n  ${experience.summary}`).join("\n")}

Engineering case studies (topics available for deep questions):
${caseStudies
  .map(
    (study) =>
      `- ${study.title}: ${study.oneLiner}\n  Themes: ${[...study.tags, ...study.stack.slice(0, 6)].join(", ")}`
  )
  .join("\n")}

Projects:
${projects.map((project) => `- ${project.title} (${project.category}): ${project.summary}`).join("\n")}

Skills:
${skillContext}
`;

export const PORTFOLIO_LINK_GUIDE = `
When links would help the user, use these markdown links directly in the answer:
- [Jump to Contact](#contact)
- [View LinkedIn](${personalInfo.linkedin})
- [View GitHub](${personalInfo.github})
- [Browse Work](#work)
- [Download Resume](${personalInfo.resumeUrl})
${caseStudies
  .map((study) => `- [Read the ${study.title} case study](${getCaseStudyPath(study.slug)})`)
  .join("\n")}
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
  kind: "linkedin" | "github" | "resume" | "contact" | "projects" | "project" | "repo" | "case-study";
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
        return `open the [Work section](${link.href})`;
      case "case-study":
        return `read the [${link.label} case study](${link.href})`;
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
  // `open` needs a following noun. Bare `open` matched "open to relocating",
  // "open source", and "OpenTelemetry", injecting project links into answers
  // that never asked for one.
  const asksForProjectLink = /(project link|live link|demo link|link to|open (?:the )?(?:project|demo|repo|site|page|app)|show me|navigate|take me|where can i see|where can i find)/i.test(normalizedUserMessage);
  const asksForContactSection = /(contact section|open contact|navigate to contact|take me to contact)/i.test(normalizedUserMessage);
  const asksForProjectsSection = /(projects section|work section|open projects|open work|navigate to projects|take me to projects)/i.test(normalizedUserMessage);
  const asksForDetail = /(case study|deep dive|architecture|how does it work|how did you build|more detail|write up|writeup|read more)/i.test(
    normalizedUserMessage
  );

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
    addLink({ label: "Work section", href: "#work", kind: "projects" });
  }

  // Case studies are the deepest proof on the site, so surface them whenever the
  // visitor asks about one by name or asks for architecture-level detail.
  findMatchingCaseStudies(userMessage).forEach((study) => {
    addLink({ label: study.title, href: getCaseStudyPath(study.slug), kind: "case-study" });
  });

  if (asksForDetail && links.every((link) => link.kind !== "case-study")) {
    const [firstMatch] = findMatchingCaseStudies(userMessage);
    if (firstMatch) {
      addLink({ label: firstMatch.title, href: getCaseStudyPath(firstMatch.slug), kind: "case-study" });
    }
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
