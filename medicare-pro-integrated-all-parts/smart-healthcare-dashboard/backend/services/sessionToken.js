// backend/services/sessionToken.js
//
// Team 1 kiosk session-token mechanism (Phase 2 Final Design, section 7).
// The raw token is returned to the staff caller exactly once and is
// NEVER persisted — only its SHA-256 hash is stored, so a database
// read can never recover a usable token.

import crypto from "node:crypto";

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashSessionToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/** Constant-time comparison to avoid timing side-channels on hash comparison. */
export function verifySessionToken(rawToken, storedHash) {
  if (!rawToken || !storedHash) return false;
  const candidate = hashSessionToken(rawToken);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
