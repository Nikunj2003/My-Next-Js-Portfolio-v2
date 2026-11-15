/** The homepage sections the scroll companion follows, in page order. */
export const SECTION_IDS = ["about", "experience", "work", "skills", "ai-twin", "contact"];

/** Starter questions the ask bubble offers, chosen by the section in view. */
export const SECTION_CHIPS: Record<string, string[]> = {
  hero: ["What does Nikunj work on?", "Show me the strongest proof", "What roles is he looking for?"],
  about: ["What does he own end to end?", "How does he measure AI quality?", "What was the AI Ninja Award for?"],
  experience: ["What did he build at ArmorCode?", "What broke in production?", "How did Xansr shape him?"],
  work: ["Walk me through the evaluation platform", "Compare the MCP registry and the RAG layer", "Which project is most impressive?"],
  skills: ["Which skills are production-proven?", "What's his agent stack?", "How deep is his MLOps work?"],
  "ai-twin": ["How do you decide which tool to call?", "What can't you answer?", "Show me your trace"],
  contact: ["Summarise his fit for an AI engineer role", "Is he open to relocation?", "How do I reach him fastest?"],
};
