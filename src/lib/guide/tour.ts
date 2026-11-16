import type { AvatarCue } from "@/lib/guide/types";
import type { GuideHighlight } from "@/lib/guide/targets";

export type TourStep = {
  id: string;
  /** Section to scroll to. */
  href: string;
  /** Element to ring once there. */
  highlight?: GuideHighlight;
  title: string;
  /** One line, 140 characters or fewer. */
  line: string;
  cue: AvatarCue;
  /** Sent to Nex by "Ask about this". */
  askPrompt: string;
};

/**
 * The scripted 60-second tour. No LLM involved: it has to work when the
 * assistant is offline, and it has to say exactly the same true things to
 * every visitor.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "proof",
    href: "#hero",
    highlight: "hero-proof",
    title: "The numbers first",
    line: "Each figure links to the system that produced it. Nothing here is estimated.",
    cue: { state: "proud", face: "happy" },
    askPrompt: "Which of these numbers was hardest to earn, and why?",
  },
  {
    id: "experience",
    href: "#experience",
    highlight: "experience-intro",
    title: "How he got here",
    line: "From public-sector software to applied AI: discovery, agent design, rollout, and debugging in production.",
    cue: { state: "reading", face: "calm" },
    askPrompt: "What did Nikunj own end to end in his current role?",
  },
  {
    id: "featured",
    href: "#work",
    highlight: "work-featured",
    title: "Three flagship systems",
    line: "Evaluation, governed MCP tools, and knowledge-graph RAG: the agent stack Nikunj owns at ArmorCode.",
    cue: { state: "reading", face: "inspecting" },
    askPrompt: "Walk me through the evaluation platform in 30 seconds.",
  },
  {
    id: "skills",
    href: "#skills",
    highlight: "skills-panel",
    title: "The toolkit",
    line: "Agents, retrieval, evaluation and the platform work underneath them.",
    cue: { state: "curious", face: "calm" },
    askPrompt: "Which skills has Nikunj used in production, not just side projects?",
  },
  {
    id: "agent",
    href: "#nex",
    highlight: "nex-card",
    title: "Meet Nex",
    line: "I'm a tool-calling agent over Nikunj's work. Every call I make is shown, and unmeasured means unmeasured.",
    cue: { state: "happy", face: "happy" },
    askPrompt: "How do you decide which tool to call, Nex?",
  },
  {
    id: "contact",
    href: "#contact",
    highlight: "contact-form",
    title: "Say hello",
    line: "If any of this fits what you are building, this form goes straight to Nikunj.",
    cue: { state: "happy", face: "happy" },
    askPrompt: "What kind of role is Nikunj looking for?",
  },
];
