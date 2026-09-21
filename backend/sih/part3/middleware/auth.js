// Part 3 — authentication + role-based authorization (server-side, deny by default).
import { AppError } from "./errors.js";
import { verifySession } from "../services/sessionTokens.js";

// Role names mirror src/app/roles.js (copied, not imported: Part 3's backend has no dependency on the rest of the repo).
export const ALL_ROLES = ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "LAB_TECHNICIAN", "PHARMACIST", "BILLING", "PATIENT"];

const CLINICAL = ["ADMIN", "DOCTOR", "NURSE"];
export const PERMISSIONS = {
  "documents:read": CLINICAL,
  "documents:upload": CLINICAL,
  "documents:process": CLINICAL, // run OCR, run extraction
  "timeline:read": CLINICAL,
  "timeline:write": CLINICAL,
  "audit:read": ["ADMIN"],
  "demo:reset": ["ADMIN"],
};

export function createAuth({ config, audit }) {
  function authenticate(req, _res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return next(new AppError(401, "UNAUTHENTICATED", "Authentication required. Start a Part 3 session first."));
    }
    const payload = verifySession(header.slice(7), config.auth.secret);
    if (!payload || !ALL_ROLES.includes(payload.role)) {
      return next(new AppError(401, "INVALID_SESSION", "Session is invalid or has expired. Please start a new session."));
    }
    req.actor = { id: payload.sub, role: payload.role, name: payload.name ?? null };
    return next();
  }

  function authorize(permission) {
    const allowed = PERMISSIONS[permission];
    if (!allowed) throw new Error(`Unknown Part 3 permission: ${permission}`);
    return (req, _res, next) => {
      if (req.actor && allowed.includes(req.actor.role)) return next();
      audit?.record({ actor: req.actor, action: "ACCESS_DENIED", resourceType: "permission", resourceId: permission, outcome: "denied", requestId: req.requestId });
      return next(new AppError(403, "FORBIDDEN", "Your role is not permitted to perform this action."));
    };
  }

  return { authenticate, authorize };
}
