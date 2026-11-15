/** One-line, section-aware remarks from Nex, shown in its bubble. Rationed by `bubble-policy`. */
export const SECTION_TIPS: Record<string, string> = {
  about: "Click me any time to ask how Nikunj measures AI quality, or what he owns end to end.",
  work: "Each card leads with its measured result. Ask me how any of them was built.",
  nex: "That's me. Ask anything and watch which tools I call.",
  experience: "Ask what Nikunj owned end to end in any role. I answer from the case studies.",
  skills: "Want to know where a skill ran in production, not just a side project? Ask me.",
  contact: "Not sure what to write? Describe the role and I'll summarise Nikunj's fit.",
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
