/** The homepage sections the scroll companion follows, in page order. */
export const SECTION_IDS = ["about", "experience", "work", "skills", "nex", "contact"];

/** Starter questions the ask bubble offers, chosen by the section in view. */
export const SECTION_CHIPS: Record<string, string[]> = {
  hero: ["What does Nikunj work on?", "Show me the strongest proof", "What roles is he looking for?"],
  about: ["What does he own end to end?", "How does he measure AI quality?", "What was the AI Ninja Award for?"],
  experience: ["What did he build at ArmorCode?", "What broke in production?", "How did Xansr shape him?"],
  work: ["Walk me through the evaluation platform", "Compare the MCP registry and the RAG layer", "Which project is most impressive?"],
  skills: ["Which skills are production-proven?", "What's his agent stack?", "How deep is his MLOps work?"],
  nex: ["How do you pick a tool?", "What won't you answer?", "Show me your trace"],
  contact: ["Is he open to relocation?", "How do I reach him fastest?"],
  "work-index": ["Which three should I read first?", "Which study shows production debugging?", "What should I read in five minutes?"],
  "case-study": ["Why was this approach chosen?", "What did he own here?", "What would break first at 10x?"],
};
