type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  limited: boolean;
  remaining: number;
  retryAfter: number;
};

export function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const firstIp = forwardedFor.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip") || "";
  const ip = firstIp || realIp || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return `${ip}-${userAgent}`;
}

export function getRateLimitHeaders(limit: number, remaining: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
  };
}

export function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  clientKey: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs } = options;
  const now = Date.now();

  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }

  const entry = store.get(clientKey);

  if (!entry) {
    store.set(clientKey, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: Math.max(limit - 1, 0), retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return {
      limited: true,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  return {
    limited: false,
    remaining: Math.max(limit - entry.count, 0),
    retryAfter: 0,
  };
}
