/** One-line, section-aware remarks from the companion, shown in its bubble. Rationed by `bubble-policy`. */
export const SECTION_TIPS: Record<string, string> = {
  about: "Click me any time to ask how he measures AI quality, or what he owns end to end.",
  work: "Each card has the measured result on its face. Ask me how any of them was built.",
  "ai-twin": "That's me. Ask anything about his work and watch which tools I call.",
  experience: "Ask what he owned end to end in any role; I'll answer from the case studies.",
  skills: "Want to know where a skill was used in production? Ask me.",
  contact: "Not sure what to write? I can summarise his fit for a role you describe.",
};

export const TIP_RULES = {
  /** How long a section must hold the screen before its tip shows. */
  dwellMs: 2500,
  /** Minimum gap between two tips. */
  gapMs: 20_000,
  /** Tips per session, at most. */
  maxPerSession: 3,
  /** How long a tip stays up when not hovered or focused. */
  showMs: 6000,
};
