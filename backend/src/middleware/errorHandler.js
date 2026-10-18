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

  // Normalize PostgreSQL errors
  if (err.code === '23505') {
    error = AppError.badRequest('Duplicate record detected', { constraint: err.constraint });
  } else if (err.code === '23503') {
    error = AppError.badRequest('Referenced record does not exist', { constraint: err.constraint });
  } else if (err.code === '22P02') {
    error = AppError.badRequest('Invalid identifier format supplied');
  }

  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const code = isAppError ? error.code : 'INTERNAL_ERROR';

  logger.error(error.message, {
    statusCode,
    code,
    path: req.originalUrl,
    method: req.method,
    stack: env.isProd ? undefined : error.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: error.message || 'An unexpected error occurred',
      details: isAppError ? error.details : undefined,
      ...(env.isProd ? {} : { stack: error.stack }),
    },
  });
}
