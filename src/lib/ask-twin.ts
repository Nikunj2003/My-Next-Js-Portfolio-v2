/**
 * Opens the AI Twin panel, optionally with a question to send.
 *
 * Lives in its own module to break a cycle: `AskAboutThis` renders
 * `InlineAnswer`, and `InlineAnswer` needs to hand its exchange off to the
 * panel — importing the dispatcher back from `AskAboutThis` would make the two
 * modules depend on each other.
 *
 * @param answer When supplied, the panel appends the exchange as an already
 *   answered turn instead of re-sending the question.
 */
export function openAiTwin(question: string, answer?: string) {
  window.dispatchEvent(new CustomEvent("open-ai-twin", { detail: { question, answer } }));
}
