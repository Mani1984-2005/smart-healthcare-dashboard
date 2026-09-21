// Express middleware for the Part 6 boundary: request context, secure headers, rate limiting.
import crypto from "node:crypto";
import { Errors } from "../errors.js";
import { ANONYMOUS_ACTOR } from "../audit/auditService.js";

export function requestContext(req, res, next) {
  const requestId = crypto.randomUUID();
  req.part6 = { requestId, ip: req.socket?.remoteAddress ?? null };
  res.setHeader("X-Request-Id", requestId);
  next();
}

/** API-only hardening headers. Health data must never be cached by browsers or proxies. */
export function secureHeaders(config) {
  return (req, res, next) => {
    res.removeHeader("X-Powered-By");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    if (config.isProduction) res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    next();
  };
}

export function rateLimit({ limiter, audit, skip }) {
  return (req, res, next) => {
    if (skip?.(req)) return next();
    const r = limiter.take(`${req.part6.ip}`);
    res.setHeader("X-RateLimit-Remaining", String(r.remaining));
    if (r.allowed) return next();
    res.setHeader("Retry-After", String(r.retryAfterSeconds));
    // Audit only the first rejection in a window so an attacker cannot flood the log.
    if (r.count === r.limit + 1) {
      audit.append({ actor: ANONYMOUS_ACTOR, action: "RATE_LIMITED", resource: { type: "Endpoint", id: req.path }, status: "denied", reason: "rate limit exceeded", req });
    }
    return next(Errors.rateLimited());
  };
}
