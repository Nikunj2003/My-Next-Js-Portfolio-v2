/**
 * What the hero avatar says in its speech bubble. Short, first person, and
 * only true things. Picked by what just happened, so it reads as a reaction
 * rather than a rotating banner.
 */

export function greetingFor(hour: number) {
  if (hour < 5) return "Up late? I'm Nikunj's AI twin. Ask me anything about his work.";
  if (hour < 12) return "Good morning! I'm Nikunj's AI twin. Ask me about his agents, RAG or evals.";
  if (hour < 17) return "Hi there! I'm Nikunj's AI twin. Want the 60-second tour?";
  return "Good evening! I'm Nikunj's AI twin. Ask me anything about his work.";
}

/** Lines for the click streak, in the same order as `PET_STREAK`. */
export const PET_LINES = [
  "Hey, that tickles!",
  "Ha! Okay, okay.",
  "You found the fun part.",
  "I run on tool calls and good evals.",
  "You're making me blush.",
  "Achievement unlocked: persistent clicker.",
];

export const DIZZY_LINE = "Whoa… slow down, I'm seeing double.";
export const HOVER_LINE = "I'm listening. Click me, or ask about his work.";
export const BORED_LINE = "Still there? The case studies are right below.";
export const ASLEEP_LINE = "Zzz… move the mouse to wake me.";
export const WAKE_LINE = "Oh! I'm up. Where were we?";
