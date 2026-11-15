/**
 * What Nex says in the hero avatar's speech bubble. Short, first person for
 * Nex (Nikunj is "he"), dry rather than cute, and only true things. Picked by
 * what just happened, so it reads as a reaction rather than a rotating banner.
 */

export function greetingFor(hour: number) {
  if (hour < 5) return "Up late? I'm Nex, the AI guide to Nikunj's work. Ask me anything.";
  if (hour < 12) return "Morning. I'm Nex, Nikunj's AI guide. Ask about his agents, RAG or evals.";
  if (hour < 17) return "Hi, I'm Nex, the AI guide to Nikunj's work. Want the 60-second tour?";
  return "Evening. I'm Nex. I answer from Nikunj's case studies, citations included.";
}

/** Lines for the click streak, in the same order as `PET_STREAK`. */
export const PET_LINES = [
  "That's not a documented input.",
  "Noted. Logging it.",
  "You found the undocumented feature.",
  "I run on tool calls and good evals.",
  "Still within rate limits. Barely.",
  "Achievement unlocked: persistent clicker.",
];

export const DIZZY_LINE = "Too many requests. Rate-limiting myself.";
export const HOVER_LINE = "Listening. Click me, or ask about Nikunj's work.";
export const BORED_LINE = "Still there? The case studies are right below.";
export const ASLEEP_LINE = "Idle. Move the mouse to resume.";
export const WAKE_LINE = "Back online. Where were we?";
