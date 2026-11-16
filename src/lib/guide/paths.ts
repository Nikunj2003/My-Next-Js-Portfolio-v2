import type { TourStep } from "@/lib/guide/tour";
import { TOUR_STEPS } from "@/lib/guide/tour";

/**
 * Visitor paths: the same scripted tour, ordered and worded for who is
 * reading. No LLM involved, so a path says the same true things to every
 * visitor and works with the assistant offline. Every step points at a
 * section and highlight that already exist (`tests/visitor-paths.test.ts`).
 *
 * The chosen path is also sent with each chat request as an id from this
 * list (never free text); the server maps it to `context` below, a short,
 * authored note on what that reader usually wants.
 */
export const VISITOR_IDS = ["default", "recruiter", "hiring-manager", "engineer", "founder"] as const;
export type VisitorId = (typeof VISITOR_IDS)[number];

export function isVisitorId(value: unknown): value is VisitorId {
  return typeof value === "string" && (VISITOR_IDS as readonly string[]).includes(value);
}

export type VisitorPath = {
  id: VisitorId;
  /** On the chooser button. */
  label: string;
  /** Under the label: what the path covers. */
  blurb: string;
  steps: TourStep[];
  /** For Nex: what this reader usually wants. One or two sentences, no claims. */
  context: string;
};

const step = (id: string) => {
  const found = TOUR_STEPS.find((each) => each.id === id);
  if (!found) throw new Error(`Unknown tour step: ${id}`);
  return found;
};

export const VISITOR_PATHS: Record<VisitorId, VisitorPath> = {
  default: {
    id: "default",
    label: "The 60-second tour",
    blurb: "Proof, career, flagship systems, toolkit, Nex and contact.",
    steps: TOUR_STEPS,
    context: "",
  },
  recruiter: {
    id: "recruiter",
    label: "Recruiter",
    blurb: "Role, experience and how to reach him.",
    steps: [
      step("proof"),
      step("experience"),
      { ...step("skills"), line: "The stack he has run in production, grouped the way a job description is." },
      step("contact"),
    ],
    context: "The reader is a recruiter: lead with role fit, current position, seniority signals and how to get in touch. Keep answers short.",
  },
  "hiring-manager": {
    id: "hiring-manager",
    label: "Hiring manager",
    blurb: "What he owned, the results, and how he works.",
    steps: [
      step("proof"),
      { ...step("experience"), line: "What he owned end to end in each role, and where the work was shared." },
      step("featured"),
      step("contact"),
    ],
    context: "The reader is a hiring manager: lead with ownership, measured results, decisions and trade-offs, and say clearly what was shared work.",
  },
  engineer: {
    id: "engineer",
    label: "Engineer",
    blurb: "Architecture, decisions and how Nex works.",
    steps: [
      step("featured"),
      step("skills"),
      { ...step("agent"), line: "I'm a tool-calling agent over his work. Every call I make is shown, so you can check how I got there." },
      step("contact"),
    ],
    context: "The reader is an engineer: lead with architecture, design decisions, rejected alternatives and failure modes. Technical detail is welcome.",
  },
  founder: {
    id: "founder",
    label: "Founder",
    blurb: "Shipped systems, outcomes, and whether he fits.",
    steps: [
      step("proof"),
      step("featured"),
      step("agent"),
      { ...step("contact"), line: "If he could help with what you are building, this goes straight to him." },
    ],
    context: "The reader is a founder: lead with what shipped, the business outcome, speed and breadth, and how he works with a small team.",
  },
};

export function stepsFor(id: VisitorId | null | undefined) {
  return VISITOR_PATHS[id ?? "default"]?.steps ?? TOUR_STEPS;
}

/** The authored context for a visitor id, or "" for the default and anything unknown. */
export function visitorContext(id: unknown) {
  return isVisitorId(id) ? VISITOR_PATHS[id].context : "";
}
