import test from "node:test";
import assert from "node:assert/strict";

import { checkGlobalBudget, checkRateLimit, getClientKey, getRateLimitHeaders } from "../src/lib/rate-limit.ts";

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

test("getClientKey ignores the client-controlled leftmost x-forwarded-for hop", () => {
  const a = getClientKey(createRequest({ "x-forwarded-for": "1.1.1.1, 198.51.100.7" }));
  const b = getClientKey(createRequest({ "x-forwarded-for": "2.2.2.2, 198.51.100.7" }));
  const other = getClientKey(createRequest({ "x-forwarded-for": "1.1.1.1, 198.51.100.8" }));

  assert.equal(a, b, "spoofing the first hop must not change the key");
  assert.notEqual(a, other, "a different edge-observed address must change the key");
});

function withEnv(env: Record<string, string | undefined>, run: () => void) {
  const saved = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("getClientKey ignores client-settable IP headers unless the platform sets them", () => {
  withEnv({ VERCEL: undefined, TRUSTED_PROXY_HEADER: undefined }, () => {
    const key = (headers: Record<string, string>) => getClientKey(createRequest(headers));
    const edge = { "x-forwarded-for": "9.9.9.9, 10.0.0.4" };
    // Off Vercel, a spoofed x-vercel-forwarded-for / cf-connecting-ip / x-real-ip
    // must not change the bucket.
    assert.equal(key({ ...edge, "x-vercel-forwarded-for": "1.1.1.1" }), key(edge));
    assert.equal(key({ ...edge, "cf-connecting-ip": "1.1.1.1" }), key(edge));
    assert.equal(key({ ...edge, "x-real-ip": "1.1.1.1" }), key(edge));
  });
});

test("getClientKey trusts x-vercel-forwarded-for on Vercel", () => {
  withEnv({ VERCEL: "1", TRUSTED_PROXY_HEADER: undefined }, () => {
    const key = (headers: Record<string, string>) => getClientKey(createRequest(headers));
    assert.equal(key({ "x-vercel-forwarded-for": "10.0.0.1", "x-forwarded-for": "9.9.9.9, 10.0.0.4" }), key({ "x-vercel-forwarded-for": "10.0.0.1" }));
    assert.notEqual(key({ "x-vercel-forwarded-for": "10.0.0.1" }), key({ "x-vercel-forwarded-for": "10.0.0.2" }));
  });
});

test("getClientKey trusts the header named in TRUSTED_PROXY_HEADER", () => {
  withEnv({ VERCEL: undefined, TRUSTED_PROXY_HEADER: "cf-connecting-ip" }, () => {
    const key = (headers: Record<string, string>) => getClientKey(createRequest(headers));
    assert.notEqual(key({ "cf-connecting-ip": "10.0.0.1" }), key({ "cf-connecting-ip": "10.0.0.2" }));
    assert.equal(key({ "cf-connecting-ip": "10.0.0.1", "x-real-ip": "7.7.7.7" }), key({ "cf-connecting-ip": "10.0.0.1" }));
  });
});

test("checkGlobalBudget caps every client together", () => {
  const now = 1_000_000;
  for (let i = 0; i < 3; i += 1) assert.equal(checkGlobalBudget("t", 3, 60_000, now).exhausted, false);
  assert.equal(checkGlobalBudget("t", 3, 60_000, now).exhausted, true);
  assert.equal(checkGlobalBudget("t", 3, 60_000, now + 60_001).exhausted, false, "a new window resets it");
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
