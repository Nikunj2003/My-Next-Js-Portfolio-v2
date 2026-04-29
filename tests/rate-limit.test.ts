import test from "node:test";
import assert from "node:assert/strict";

import { checkRateLimit, getClientKey, getRateLimitHeaders } from "../src/lib/rate-limit.ts";

function createRequest(headers: Record<string, string>) {
  return new Request("https://example.com/api/chat", { headers });
}

test("getClientKey hashes forwarded IP values", () => {
  const key = getClientKey(
    createRequest({
      "x-forwarded-for": "203.0.113.10, 203.0.113.11",
    }),
  );

  assert.match(key, /^ip:[a-f0-9]{32}$/);
  assert.notEqual(key, "ip:203.0.113.10");
});

test("getClientKey falls back to a hashed fingerprint when IP headers are missing", () => {
  const key = getClientKey(
    createRequest({
      "user-agent": "PortfolioBot/1.0",
      "accept-language": "en-US",
    }),
  );

  assert.match(key, /^fingerprint:[a-f0-9]{32}$/);
});

test("getClientKey returns anonymous when no identifying headers exist", () => {
  assert.equal(getClientKey(createRequest({})), "anonymous");
});

test("getRateLimitHeaders serializes standard no-store headers", () => {
  assert.deepEqual(getRateLimitHeaders(39, 12, 1_700_000_123_456), {
    "X-RateLimit-Limit": "39",
    "X-RateLimit-Remaining": "12",
    "X-RateLimit-Reset": "1700000124",
    "Cache-Control": "no-store",
  });
});

test("checkRateLimit limits requests after the configured threshold", () => {
  const store = new Map<string, { count: number; resetAt: number }>();

  const first = checkRateLimit(store, "client-1", { limit: 2, windowMs: 60_000 });
  const second = checkRateLimit(store, "client-1", { limit: 2, windowMs: 60_000 });
  const third = checkRateLimit(store, "client-1", { limit: 2, windowMs: 60_000 });

  assert.equal(first.limited, false);
  assert.equal(second.limited, false);
  assert.equal(third.limited, true);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfter >= 1);
});

test("checkRateLimit evicts the oldest active entry when the memory store is full", () => {
  const store = new Map<string, { count: number; resetAt: number }>();
  const now = Date.now() + 60_000;

  for (let index = 0; index < 500; index += 1) {
    store.set(`client-${index}`, {
      count: 1,
      resetAt: now + index,
    });
  }

  checkRateLimit(store, "new-client", { limit: 1, windowMs: 1_000 });

  assert.equal(store.size, 500);
  assert.equal(store.has("client-0"), false);
  assert.equal(store.has("new-client"), true);
});

test("checkRateLimit starts a new window after reset", () => {
  const store = new Map<string, { count: number; resetAt: number }>();

  store.set("client-1", {
    count: 10,
    resetAt: Date.now() - 1,
  });

  const result = checkRateLimit(store, "client-1", { limit: 3, windowMs: 60_000 });
  const entry = store.get("client-1");

  assert.equal(result.limited, false);
  assert.equal(result.remaining, 2);
  assert.equal(entry?.count, 1);
  assert.ok((entry?.resetAt ?? 0) > Date.now());
});
