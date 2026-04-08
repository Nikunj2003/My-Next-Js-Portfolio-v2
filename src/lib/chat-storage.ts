export const CHAT_STORAGE_VERSION = 1;
export const CHAT_STORAGE_TTL_MS = 7 * 24 * 60 * 60_000;

export type ChatStorageEnvelope<T> = {
  version: number;
  savedAt: number;
  messages: T[];
};

export function createStoredChatEnvelope<T>(
  messages: T[],
  savedAt = Date.now(),
): ChatStorageEnvelope<T> {
  return {
    version: CHAT_STORAGE_VERSION,
    savedAt,
    messages,
  };
}

export function parseStoredChatEnvelope<T>(
  value: unknown,
  now = Date.now(),
): ChatStorageEnvelope<T> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ChatStorageEnvelope<unknown>>;

  if (
    candidate.version !== CHAT_STORAGE_VERSION ||
    typeof candidate.savedAt !== "number" ||
    !Number.isFinite(candidate.savedAt) ||
    !Array.isArray(candidate.messages)
  ) {
    return null;
  }

  if (candidate.savedAt + CHAT_STORAGE_TTL_MS < now) {
    return null;
  }

  return {
    version: CHAT_STORAGE_VERSION,
    savedAt: candidate.savedAt,
    messages: candidate.messages as T[],
  };
}
