export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message = 'Request conflicts with current resource state', details) {
    return new AppError(message, 409, 'CONFLICT', details);
  }

  static unsupportedMedia(message = 'Unsupported file type') {
    return new AppError(message, 415, 'UNSUPPORTED_MEDIA_TYPE');
  }

  static payloadTooLarge(message = 'File exceeds maximum allowed size') {
    return new AppError(message, 413, 'PAYLOAD_TOO_LARGE');
  }

  static internal(message = 'Internal server error', details) {
    return new AppError(message, 500, 'INTERNAL_ERROR', details);
  }
}
