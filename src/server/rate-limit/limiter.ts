type Bucket = number[];

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  retryAfterMs: number;
};

/**
 * Single-process window limiter. Replace this module with a shared store
 * before running more than one application instance.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = (buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs);

  if (current.length >= limit) {
    buckets.set(key, current);
    return { ok: false, retryAfterMs: windowMs - (now - current[0]) };
  }

  current.push(now);
  buckets.set(key, current);
  return { ok: true, retryAfterMs: 0 };
}
