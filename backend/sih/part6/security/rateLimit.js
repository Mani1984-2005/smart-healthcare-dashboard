// Small fixed-window in-memory rate limiter. Per-process only; behind several instances use a shared store.
export function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  return {
    /** Returns { allowed, remaining, retryAfterSeconds } and records the hit. */
    take(key, limit = max) {
      const now = Date.now();
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      return {
        count: entry.count,
        limit,
        allowed: entry.count <= limit,
        remaining: Math.max(0, limit - entry.count),
        retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
      };
    },
    reset: () => hits.clear(),
  };
}
