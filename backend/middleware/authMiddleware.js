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

// RBAC Middleware
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    // If no user is attached (should be caught by authenticate first)
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorised: User not found in request" });
    }

    const normalizedAllowedRoles = normalizeRole(allowedRoles);
    const userRoles = normalizeRole(req.user.roles || req.user.role || ["PATIENT"]);
    const userRole = Array.isArray(userRoles) ? userRoles[0] : userRoles || "PATIENT";

    const hasPermission = normalizedAllowedRoles.includes(userRole) || userRole === "ADMIN";

    if (!hasPermission) {
      if (req.log) req.log.warn(`Forbidden: User role ${userRole} attempted to access restricted route.`);
      return res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};

export default authenticate;