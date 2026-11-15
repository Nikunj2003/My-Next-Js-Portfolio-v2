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

/**
 * Which client-IP header the deployment's edge sets (and overwrites), so it
 * can be trusted. Any other header is whatever the client chose to send:
 * trusting it gives every spoofed value a fresh bucket.
 * - On Vercel (`VERCEL` is set by the platform): `x-vercel-forwarded-for`.
 * - Behind another proxy: name its header in `TRUSTED_PROXY_HEADER`
 *   (for example `cf-connecting-ip` or `x-real-ip`).
 * - Otherwise: the rightmost `x-forwarded-for` hop, written by our own edge.
 */
function trustedIpHeader(): string | null {
  const configured = process.env.TRUSTED_PROXY_HEADER?.trim().toLowerCase();
  if (configured) return configured;
  if (process.env.VERCEL) return "x-vercel-forwarded-for";
  return null;
}

export function getClientKey(request: Request) {
  const header = trustedIpHeader();
  const forwardedIp =
    (header ? sanitizeFingerprintSegment(request.headers.get(header)?.split(",")[0]) : "") ||
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

type BudgetState = { count: number; resetAt: number };
const budgets = new Map<string, BudgetState>();

/**
 * A ceiling shared by every client of one route on this instance, so rotating
 * client keys (or evicting the per-client store) can't buy unlimited calls to
 * a paid upstream. True when the budget is spent.
 */
export function checkGlobalBudget(name: string, limit: number, windowMs: number, now = Date.now()) {
  let state = budgets.get(name);
  if (!state || now >= state.resetAt) {
    state = { count: 0, resetAt: now + windowMs };
    budgets.set(name, state);
  }
  state.count += 1;
  return { exhausted: state.count > limit, retryAfter: Math.max(1, Math.ceil((state.resetAt - now) / 1000)) };
}
