// Part 4 — server-side authentication + RBAC. Authorization is ALWAYS decided here, never by the frontend.
//   demo mode      : short-lived HMAC-signed session issued by POST /session (demo only — mirrors the existing role-picker login,
//                    but the role is now verified on every request). Disabled automatically outside demo mode.
//   firebase mode  : reuses the existing Firebase ID-token middleware (../../middleware/authMiddleware.js), loaded lazily so a
//                    missing Firebase config fails CLOSED (503) instead of crashing the app.
import crypto from "node:crypto";
import { errors } from "./errors.js";

export function createSessionManager({ secret, ttlSeconds, now = () => Date.now() }) {
  const key = secret || crypto.randomBytes(32).toString("hex"); // random per process when not configured
  const b64 = (v) => Buffer.from(v).toString("base64url");
  const mac = (body) => crypto.createHmac("sha256", key).update(body).digest("base64url");
  return {
    issue({ role, name, hospitalId }) {
      const iat = Math.floor(now() / 1000);
      const payload = { sub: `demo-${crypto.randomBytes(6).toString("hex")}`, role, name: name || `Demo ${role.toLowerCase()}`, hid: hospitalId || "hospital-01", iat, exp: iat + ttlSeconds };
      const body = b64(JSON.stringify(payload));
      return { token: `${body}.${mac(body)}`, expiresAt: new Date(payload.exp * 1000).toISOString(), user: { id: payload.sub, role: payload.role, name: payload.name, hospitalId: payload.hid } };
    },
    verify(token) {
      if (typeof token !== "string" || token.length > 2048) return null;
      const [body, sig, extra] = token.split(".");
      if (!body || !sig || extra !== undefined) return null;
      const expected = Buffer.from(mac(body));
      const given = Buffer.from(sig);
      if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
      try {
        const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
        if (!p.exp || p.exp * 1000 < now()) return null;
        return { id: p.sub, role: p.role, name: p.name, hospitalId: p.hid };
      } catch { return null; }
    },
  };
}

let firebaseMiddleware; // undefined = not tried, null = unavailable
async function loadFirebaseMiddleware() {
  if (firebaseMiddleware !== undefined) return firebaseMiddleware;
  try { firebaseMiddleware = (await import("../../middleware/authMiddleware.js")).default; }
  catch { firebaseMiddleware = null; }
  return firebaseMiddleware;
}

export function createAuthenticator({ config, sessions, firebaseLoader = loadFirebaseMiddleware }) {
  return async function authenticate(req, res, next) {
    try {
      if (config.authMode === "firebase") {
        const mw = await firebaseLoader();
        if (!mw) throw errors.unavailable("The authentication provider is not configured.");
        let passed = false;
        await mw(req, res, () => { passed = true; });
        if (!passed) return; // the existing middleware already sent its 401
        const { uid, role, hospitalId, name, email } = req.user ?? {};
        if (!role || !hospitalId) throw errors.forbidden("The account has no clinical role or hospital assignment.");
        req.actor = { id: uid, role: String(role).toUpperCase(), name: name || email || uid, hospitalId };
        return next();
      }
      const header = req.headers.authorization || "";
      const actor = header.startsWith("Bearer ") ? sessions.verify(header.slice(7)) : null;
      if (!actor) throw errors.unauthenticated();
      req.actor = actor;
      next();
    } catch (err) { next(err); }
  };
}

export const requireRole = (...roles) => (req, _res, next) => (roles.includes(req.actor?.role) ? next() : next(errors.forbidden()));
