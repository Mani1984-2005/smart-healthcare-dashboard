import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import multer from 'multer';

// 404 handler — placed after all routes
export function notFoundHandler(req, res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler — must be registered last
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  // Normalize Multer upload errors into AppError
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = AppError.payloadTooLarge(`File exceeds the ${env.maxFileSizeMb}MB limit`);
    } else {
      error = AppError.badRequest(`Upload error: ${err.message}`);
    }
  }

  // Normalize PostgreSQL errors. Constraint NAMES are internal schema
  // details: they are logged server-side (below) but never echoed into the
  // HTTP response.
  if (err.code === '23505') {
    error = AppError.badRequest('Duplicate record detected');
  } else if (err.code === '23503') {
    error = AppError.badRequest('Referenced record does not exist');
  } else if (err.code === '22P02') {
    error = AppError.badRequest('Invalid identifier format supplied');
  }

  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const code = isAppError ? error.code : 'INTERNAL_ERROR';

  // The real detail (including driver messages, constraint names and stack)
  // is logged server-side only. It never reaches the HTTP response.
  // `originalUrl` with the query string stripped (not `req.path`, which can be
  // mount-relative inside routers) keeps e.g. /api/search?q=<patient name>
  // out of the error log while still identifying the route.
  logger.error(error.message, {
    statusCode,
    code,
    path: (req.originalUrl || '').split('?')[0],
    method: req.method,
    constraint: err.constraint,
    stack: error.stack,
  });

  // Public response policy:
  //   * AppError messages are authored in this codebase and are safe to show.
  //   * Raw driver/runtime messages are NOT. PostgreSQL authentication and
  //     connection errors embed usernames and connection details, and runtime
  //     errors embed absolute local file paths. Those stay in the server log.
  const publicMessage = isAppError
    ? error.message || 'An unexpected error occurred'
    : 'An internal error occurred while processing the request';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: publicMessage,
      ...(isAppError && error.details ? { details: error.details } : {}),
    },
  });
}
