/** Self-hosted Bifrost gateway (OpenAI-compatible) in front of the model provider. */
export const DEFAULT_CHAT_COMPLETIONS_URL = "https://bifrost.codenex.dev/v1/chat/completions";

const CHAT_COMPLETIONS_SUFFIX = "/chat/completions";

/**
 * Turns `LLM_BASE_URL` into the chat-completions endpoint.
 *
 * Accepts either an OpenAI-style base (`https://bifrost.codenex.dev/v1`) or a
 * full endpoint URL (`…/v1/chat/completions`), so either convention works in
 * env config. A bare host gets `/v1/chat/completions`. Plain http is only
 * allowed for localhost, so a typo can't send the API key in cleartext.
 */
export function resolveChatCompletionsUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_CHAT_COMPLETIONS_URL;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("LLM_BASE_URL is not a valid URL");
  }

  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    throw new Error("LLM_BASE_URL must use https");
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (path.endsWith(CHAT_COMPLETIONS_SUFFIX)) {
    url.pathname = path;
  } else if (path === "") {
    url.pathname = `/v1${CHAT_COMPLETIONS_SUFFIX}`;
  } else {
    url.pathname = `${path}${CHAT_COMPLETIONS_SUFFIX}`;
  }

  return url.toString();
}
