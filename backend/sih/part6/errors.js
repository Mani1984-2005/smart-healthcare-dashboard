// Typed errors so every failure has a stable machine code and a safe, user-facing message.
export class Part6Error extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "Part6Error";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  unauthenticated: (msg = "Authentication is required to use this resource.") =>
    new Part6Error(401, "UNAUTHENTICATED", msg),
  forbidden: (msg = "You do not have permission to access this health record.", code = "FORBIDDEN", details) =>
    new Part6Error(403, code, msg, details),
  notFound: (what = "Resource") => new Part6Error(404, "NOT_FOUND", `${what} was not found.`),
  validation: (message, details) => new Part6Error(400, "VALIDATION_FAILED", message, details),
  invalidState: (message) => new Part6Error(409, "INVALID_STATE", message),
  consentBlocked: (code, message, details) => new Part6Error(403, code, message, details),
  rateLimited: () => new Part6Error(429, "RATE_LIMITED", "Too many requests. Please slow down and try again shortly."),
  invalidJson: () => new Part6Error(400, "INVALID_JSON", "The request body is not valid JSON."),
  tooLarge: () => new Part6Error(413, "PAYLOAD_TOO_LARGE", "The request body is too large."),
};

/** Convert any thrown value into the JSON body sent to the client. No stack traces, ever. */
export function toPublicError(err, requestId) {
  if (err instanceof Part6Error) {
    return {
      status: err.status,
      body: { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) }, requestId },
    };
  }
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    const e = Errors.invalidJson();
    return { status: e.status, body: { error: { code: e.code, message: e.message }, requestId } };
  }
  if (err?.type === "entity.too.large") {
    const e = Errors.tooLarge();
    return { status: e.status, body: { error: { code: e.code, message: e.message }, requestId } };
  }
  return {
    status: 500,
    body: { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }, requestId },
  };
}
