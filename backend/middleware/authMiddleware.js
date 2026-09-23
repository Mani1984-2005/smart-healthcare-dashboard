import { getAuth } from "firebase-admin/auth";
import "../config/firebaseAdmin.js"; // Ensure initialized

// Authenticate user via Firebase ID Token
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorised: No Bearer token provided",
    });
  }

  const idToken = authHeader.split("Bearer ")[1];

  if ((process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") && idToken.startsWith("test-token-")) {
    const tokenParts = idToken.replace(/^test-token-/, "").split("-");
    const role = tokenParts[0]?.toUpperCase() || "PATIENT";
    const subjectId = tokenParts.slice(1).join("-");
    const userId = subjectId || "test-user";

    req.user = {
      uid: userId,
      id: userId,
      role,
      patientId: role === "PATIENT" && Number.isInteger(Number(userId)) ? Number(userId) : null,
      doctorId: role === "DOCTOR" && userId ? userId : null,
    };
    return next();
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken; // attach decoded claims to request
    next();
  } catch (error) {
    if (req.log) req.log.error("Firebase token verification failed:", error.message);
    else console.error("Firebase token verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Unauthorised: Invalid or expired token",
    });
  }
};

function normalizeRole(value) {
  if (Array.isArray(value)) {
    return value.map((role) => normalizeRole(role)).filter(Boolean);
  }

  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase();
}

/**
 * Canonical aliases so legacy backend names and frontend role names resolve
 * to the same value (e.g. LAB_TECH vs LAB_TECHNICIAN).
 */
const ROLE_ALIASES = {
  LAB_TECH: "LAB_TECHNICIAN",
  SUPERUSER: "SUPER_ADMIN",
};

/**
 * The five top-level roles are PATIENT, DOCTOR, HOSPITAL_STAFF,
 * HOSPITAL_ADMIN, SUPER_ADMIN. Department-level staff (receptionist,
 * laboratory technician, pharmacist, nurse, billing) remain HOSPITAL_STAFF.
 * Routes may authorize either a concrete legacy role or the top-level group.
 */
const HOSPITAL_STAFF_ROLES = ["NURSE", "RECEPTIONIST", "LAB_TECHNICIAN", "PHARMACIST", "BILLING"];

function canonicalRole(role) {
  const upper = typeof role === "string" ? role.trim().toUpperCase() : "";
  return ROLE_ALIASES[upper] || upper;
}

function roleMatches(userRole, allowedRole) {
  if (userRole === allowedRole) return true;
  if (allowedRole === "HOSPITAL_STAFF") return HOSPITAL_STAFF_ROLES.includes(userRole);
  if (allowedRole === "HOSPITAL_ADMIN") return userRole === "ADMIN";
  return false;
}

// RBAC Middleware
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    // If no user is attached (should be caught by authenticate first)
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorised: User not found in request" });
    }

    const normalizedAllowedRoles = normalizeRole(allowedRoles).map(canonicalRole);
    const rawUserRoles = normalizeRole(req.user.roles || req.user.role || ["PATIENT"]);
    const userRole =
      canonicalRole((Array.isArray(rawUserRoles) ? rawUserRoles[0] : rawUserRoles) || "PATIENT") || "PATIENT";

    // SUPER_ADMIN passes every authorize() check.
    // ADMIN (HOSPITAL_ADMIN) keeps its existing unrestricted access.
    const hasPermission =
      userRole === "SUPER_ADMIN" ||
      userRole === "ADMIN" ||
      normalizedAllowedRoles.some((allowed) => roleMatches(userRole, allowed));

    if (!hasPermission) {
      if (req.log) req.log.warn(`Forbidden: User role ${userRole} attempted to access restricted route.`);
      return res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};

export default authenticate;