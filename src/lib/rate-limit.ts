type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const MAX_STORE_SIZE = 500;

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

export function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const firstIp = forwardedFor.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip") || "";
  const forwardedHost = request.headers.get("x-forwarded-host") || "";
  const ip = firstIp || realIp || forwardedHost || "unknown";

  return ip;
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
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
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
