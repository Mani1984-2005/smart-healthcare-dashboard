// Small in-memory fixed-window limiter (no dependency). Per actor (or IP when unauthenticated) per bucket.
import { AppError } from "./errors.js";

export function createRateLimiter({ windowMs, max, bucket, now = () => Date.now() }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = `${bucket}:${req.actor?.id ?? req.ip ?? "unknown"}`;
    const t = now();
    const entry = hits.get(key);
    if (!entry || t - entry.start >= windowMs) {
      hits.set(key, { start: t, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.start + windowMs - t) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return next(new AppError(429, "RATE_LIMITED", "Too many requests. Please wait a moment and try again."));
    }
    if (hits.size > 5000) for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k);
    return next();
  };
}
