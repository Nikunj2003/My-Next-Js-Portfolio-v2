import test from "node:test";
import assert from "node:assert/strict";

import {
  CHAT_STORAGE_TTL_MS,
  CHAT_STORAGE_VERSION,
  createStoredChatEnvelope,
  parseStoredChatEnvelope,
} from "../src/lib/chat-storage.ts";

test("createStoredChatEnvelope wraps messages with versioned metadata", () => {
  const envelope = createStoredChatEnvelope([{ id: "1" }], 1234);

  assert.deepEqual(envelope, {
    version: CHAT_STORAGE_VERSION,
    savedAt: 1234,
    messages: [{ id: "1" }],
  });
});

test("parseStoredChatEnvelope accepts fresh envelopes", () => {
  const envelope = createStoredChatEnvelope([{ id: "1" }], 5_000);
  const parsed = parseStoredChatEnvelope<{ id: string }>(envelope, 5_500);

  assert.deepEqual(parsed?.messages, [{ id: "1" }]);
});

test("parseStoredChatEnvelope rejects expired envelopes", () => {
  const envelope = createStoredChatEnvelope([{ id: "1" }], 1_000);
  const parsed = parseStoredChatEnvelope(envelope, 1_000 + CHAT_STORAGE_TTL_MS + 1);

  assert.equal(parsed, null);
});

test("parseStoredChatEnvelope rejects legacy array payloads", () => {
  const parsed = parseStoredChatEnvelope([{ id: "legacy" }], Date.now());

  assert.equal(parsed, null);
});
