// Part 3 — error type + JSON error handler. Never leaks stacks or internals to the client.
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new AppError(400, code, message, details);
export const notFound = (code, message) => new AppError(404, code, message);
export const conflict = (code, message, details) => new AppError(409, code, message, details);
export const unprocessable = (code, message, details) => new AppError(422, code, message, details);

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, "NOT_FOUND", `No Part 3 route for ${req.method} ${req.path}.`));
}

export function errorHandler(logger = console) {
  // Express identifies error middleware by its 4-argument signature, so the unused 4th parameter must stay.
  return (err, req, res, _next) => {
    let status = 500;
    let code = "INTERNAL_ERROR";
    let message = "Unexpected server error. Please retry; if it persists contact the administrator with the request id.";
    let details;

    if (err instanceof AppError) {
      ({ status, code, message, details } = err);
    } else if (err?.type === "entity.too.large") {
      status = 413;
      code = "FILE_TOO_LARGE";
      message = "The uploaded file exceeds the maximum allowed size.";
    } else if (err?.type === "entity.parse.failed") {
      status = 400;
      code = "INVALID_JSON";
      message = "Request body is not valid JSON.";
    } else if (err?.type === "request.aborted" || err?.code === "ECONNABORTED") {
      status = 400;
      code = "REQUEST_ABORTED";
      message = "The request was aborted before it completed.";
    }

    if (status >= 500) {
      // Log for developers (no request bodies, no document text, no PHI).
      logger.error(JSON.stringify({ level: "error", service: "part3", requestId: req.requestId, code, message: err?.message, stack: err?.stack }));
    }
    if (res.headersSent) return;
    res.status(status).json({ error: { code, message, ...(details ? { details } : {}), requestId: req.requestId } });
  };
}
