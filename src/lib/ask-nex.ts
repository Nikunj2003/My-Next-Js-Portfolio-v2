import type { AskHost } from "@/lib/guide/ask-hosts";

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
 * @param options.inPage With `answer`: open the exchange in the page (the
 *   section's host) instead of the full panel.
 * @param options.expand Open the full conversation panel instead of the bubble.
 * @param options.host Open it in a particular in-page host ("hero", "footer", "section:work", ...)
 *   rather than wherever it would open by default.
 */
export function openNex(question: string, answer?: string, options: { expand?: boolean; host?: AskHost; inPage?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent("open-nex", { detail: { question, answer, expand: options.expand, host: options.host, inPage: options.inPage } }));
}
