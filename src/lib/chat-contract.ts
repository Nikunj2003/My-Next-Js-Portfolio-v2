export const CHAT_ENDPOINT = "/live-assistant";
export const CHAT_PRIMARY_RESPONSE_TIMEOUT_MS = 16_000;
export const CHAT_SUGGESTION_TIMEOUT_MS = 4_000;
export const CHAT_TOTAL_RESPONSE_BUDGET_MS = 18_500;
export const CHAT_CLIENT_TIMEOUT_MS = 24_000;
export const CHAT_AVAILABILITY_CACHE_MS = 60_000;

export type ChatAvailabilityResponse = {
  available: boolean;
};
