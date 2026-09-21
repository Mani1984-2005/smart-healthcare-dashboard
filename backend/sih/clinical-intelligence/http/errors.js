// Structured, PHI-safe errors. Responses never contain stack traces, secrets, or echoed input values.

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  unauthenticated: (msg = "Authentication is required.") => new ApiError(401, "UNAUTHENTICATED", msg),
  forbidden: (msg = "Your role is not permitted to perform this action.") => new ApiError(403, "FORBIDDEN", msg),
  notFound: (what = "Resource") => new ApiError(404, "NOT_FOUND", `${what} was not found.`),
  validation: (details) => new ApiError(422, "VALIDATION_FAILED", "The request failed validation.", details),
  rateLimited: () => new ApiError(429, "RATE_LIMITED", "Too many requests. Please retry shortly."),
  unavailable: (msg = "The service is temporarily unavailable.") => new ApiError(503, "SERVICE_UNAVAILABLE", msg),
};

// Zod messages can echo the offending value for enums ("received 'x'"). Strip that; keep path + rule only.
function sanitizeMessage(message) {
  return String(message).replace(/,?\s*received\s+.*$/i, "").slice(0, 200);
}

export function zodIssues(zodError) {
  return zodError.issues.slice(0, 25).map((issue) => ({
    path: issue.path.join("."),
    message: sanitizeMessage(issue.message),
  }));
}

export function errorBody(err, requestId) {
  return {
    success: false,
    error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}), requestId },
  };
}

// Express 4-arg error handler mounted at the end of the module router.
export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId;
  let apiError;

  if (err instanceof ApiError) apiError = err;
  else if (err?.type === "entity.too.large") apiError = new ApiError(413, "PAYLOAD_TOO_LARGE", "The request body is too large.");
  else if (err?.type === "entity.parse.failed") apiError = new ApiError(400, "INVALID_JSON", "The request body is not valid JSON.");
  else apiError = new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred.");

  if (apiError.status >= 500) {
    // Log only non-sensitive identifiers. err.message may contain clinical values, so it is intentionally omitted.
    console.error(JSON.stringify({ level: "error", module: "clinical-intelligence", requestId, code: apiError.code, name: err?.name }));
  }
  if (res.headersSent) return;
  res.status(apiError.status).json(errorBody(apiError, requestId));
}
