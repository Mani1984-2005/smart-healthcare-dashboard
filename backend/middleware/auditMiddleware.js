// backend/middleware/auditMiddleware.js
const { logAuditEvent } = require("../utils/logger");

function getActor(req) {
  const user = req.user || {};
  return {
    userId: user.id || user._id || "anonymous",
    role: user.role || "guest",
    name: user.name || "unknown",
  };
}

function getRequestMeta(req) {
  return {
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "",
    requestId: req.requestId || req.headers["x-request-id"] || "",
  };
}

function auditMiddleware(req, res, next) {
  const startedAt = Date.now();
  const actor = getActor(req);
  const reqMeta = getRequestMeta(req);

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const statusCode = res.statusCode;

    const action =
      req.method === "POST" ? "CREATE" :
      req.method === "PUT" || req.method === "PATCH" ? "UPDATE" :
      req.method === "DELETE" ? "DELETE" :
      "READ";

    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      logAuditEvent({
        action,
        actor,
        request: reqMeta,
        response: {
          statusCode,
          durationMs,
        },
        resource: {
          type: req.baseUrl || "unknown",
          id: req.params?.id || req.body?.id || null,
        },
        timestamp: new Date().toISOString(),
        outcome: statusCode >= 400 ? "failure" : "success",
      });
    }
  });

  next();
}

module.exports = auditMiddleware;