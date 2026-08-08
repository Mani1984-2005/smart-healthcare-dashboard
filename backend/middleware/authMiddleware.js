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
    const role = idToken.split("-")[2] || "PATIENT";
    req.user = { uid: "test-user", role };
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

// RBAC Middleware
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    // If no user is attached (should be caught by authenticate first)
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorised: User not found in request" });
    }

    // Role could be embedded in custom claims or passed in some other way for dev
    // We will assume `req.user.role` or `req.user.roles` is available
    const userRole = req.user.role || (req.user.roles && req.user.roles[0]) || "PATIENT"; // Defaulting to PATIENT for safety if no role is explicitly assigned

    if (!allowedRoles.includes(userRole) && userRole !== "ADMIN") {
      if (req.log) req.log.warn(`Forbidden: User role ${userRole} attempted to access restricted route.`);
      return res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};

export default authenticate;