import type { Message } from "@/lib/chat/types";

/**
 * The latest question and the answer after it, for surfaces that show one
 * exchange at a time (the ask bubble). The answer is null while none has
 * arrived yet; the welcome message alone yields no exchange.
 */
export function selectLatestExchange(messages: Message[]): { question: Message; answer: Message | null } | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role !== "user") continue;
    const answer = messages.slice(index + 1).find((message) => message.role === "assistant") ?? null;
    return { question: messages[index], answer };
  }
  return null;
}
