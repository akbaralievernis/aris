type RateLimitEntry = {
  tokens: number;
  lastRefill: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const bucket = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = bucket.get(key);
  if (!entry) {
    bucket.set(key, { tokens: RATE_LIMIT_MAX - 1, lastRefill: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  const elapsed = now - entry.lastRefill;
  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    entry.tokens = RATE_LIMIT_MAX;
    entry.lastRefill = now;
  }

  if (entry.tokens <= 0) {
    return { allowed: false, remaining: 0 };
  }

  entry.tokens -= 1;
  return { allowed: true, remaining: entry.tokens };
}
