/**
 * The client-safe part of Nex: constants and helpers the chat UI,
 * store and links need. Kept free of the portfolio and case-study data, which
 * only the server's prompt context (`lib/nex-knowledge.ts`) needs.
 */
export const CHAT_MEMORY_WINDOW = 10;
export const CHAT_STORAGE_KEY = "nikunj-nex-chat";
/** Where history was saved before the assistant was named Nex; read once, moved, then deleted. */
export const LEGACY_CHAT_STORAGE_KEY = "nikunj-ai-twin-chat";
export const PROJECT_ANCHOR_PREFIX = "project-";
export const WELCOME_MESSAGE = "Hi, I’m Nex, the AI guide to Nikunj’s work. I can give you a quick recruiter summary, walk through a system, or explain how he approaches agents, governed MCP tools, memory and evaluation. I answer from his case studies and show every call I make. Start with the [evaluation platform case study](/work/llm-evaluation-platform), [browse the work](#work), or [download the resume](/Nikunj_Resume.pdf).";

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
