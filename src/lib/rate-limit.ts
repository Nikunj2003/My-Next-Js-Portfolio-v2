import { createHash } from "node:crypto";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const MAX_STORE_SIZE = 500;
const MAX_FINGERPRINT_LENGTH = 120;

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  limited: boolean;
  remaining: number;
  retryAfter: number;
  resetAt: number;
};

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function sanitizeFingerprintSegment(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ").slice(0, MAX_FINGERPRINT_LENGTH) ?? "";
}

/**
 * The LAST hop of an `x-forwarded-for` chain. Each proxy appends the address it
 * received the connection from, so the rightmost entry was written by our own
 * edge and the leftmost entries are whatever the client chose to send.
 */
function getLastForwardedValue(value?: string | null) {
  const hops = value?.split(",").map((hop) => hop.trim()).filter(Boolean) ?? [];
  return sanitizeFingerprintSegment(hops[hops.length - 1]);
}

function pruneStore(store: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }

  while (store.size >= MAX_STORE_SIZE) {
    let oldestKey: string | null = null;
    let oldestResetAt = Number.POSITIVE_INFINITY;

    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < oldestResetAt) {
        oldestResetAt = entry.resetAt;
        oldestKey = key;
      }
    }

    if (!oldestKey) {
      break;
    }

    store.delete(oldestKey);
  }
}

export function getClientKey(request: Request) {
  // Edge-set headers first (the platform overwrites any client-sent copy), then
  // the rightmost x-forwarded-for hop. Never the leftmost: the client controls it.
  const forwardedIp =
    sanitizeFingerprintSegment(request.headers.get("x-vercel-forwarded-for")?.split(",")[0]) ||
    sanitizeFingerprintSegment(request.headers.get("cf-connecting-ip")) ||
    sanitizeFingerprintSegment(request.headers.get("x-real-ip")) ||
    getLastForwardedValue(request.headers.get("x-forwarded-for"));

  if (forwardedIp) {
    return `ip:${hashKey(forwardedIp)}`;
  }

  const fingerprint = [
    sanitizeFingerprintSegment(request.headers.get("user-agent")),
    sanitizeFingerprintSegment(request.headers.get("accept-language")),
    sanitizeFingerprintSegment(request.headers.get("sec-ch-ua-platform")),
  ]
    .filter(Boolean)
    .join("|");

  return fingerprint ? `fingerprint:${hashKey(fingerprint)}` : "anonymous";
}

export function getRateLimitHeaders(limit: number, remaining: number, resetAt: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
    "Cache-Control": "no-store",
  };
}

export function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  clientKey: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs } = options;
  const now = Date.now();

  if (store.size >= MAX_STORE_SIZE) {
    pruneStore(store, now);
  }

  const entry = store.get(clientKey);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(clientKey, { count: 1, resetAt });
    return { limited: false, remaining: Math.max(limit - 1, 0), retryAfter: 0, resetAt };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return {
      limited: true,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      resetAt: entry.resetAt,
    };
  }

  return {
    limited: false,
    remaining: Math.max(limit - entry.count, 0),
    retryAfter: 0,
    resetAt: entry.resetAt,
  };
}
