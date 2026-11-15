/**
 * Opens the Nex panel, optionally with a question to send.
 *
 * Lives in its own module to break a cycle: `AskAboutThis` renders
 * `InlineAnswer`, and `InlineAnswer` needs to hand its exchange off to the
 * panel — importing the dispatcher back from `AskAboutThis` would make the two
 * modules depend on each other.
 *
 * By default this opens the inline ask bubble beside the guide avatar.
 *
 * @param answer When supplied, the exchange is appended as an already
 *   answered turn instead of re-sending the question, and the full panel opens.
 * @param options.expand Open the full conversation panel instead of the bubble.
 */
export function openNex(question: string, answer?: string, options: { expand?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent("open-nex", { detail: { question, answer, expand: options.expand } }));
}
