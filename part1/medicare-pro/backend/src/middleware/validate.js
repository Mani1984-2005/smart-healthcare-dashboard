import { AppError } from '../utils/AppError.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUploadRequest(req, res, next) {
  if (!req.file) {
    return next(AppError.badRequest('No file was uploaded. Attach a field named "prescription".'));
  }

  const allowedSources = new Set(['image', 'pdf', 'camera']);
  const source = req.body.uploadSource || 'image';
  if (!allowedSources.has(source)) {
    return next(AppError.badRequest(`Invalid uploadSource "${source}". Must be one of: image, pdf, camera.`));
  }
  req.body.uploadSource = source;
  next();
}

export function validateUuidParam(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !UUID_RE.test(value)) {
      return next(AppError.badRequest(`Invalid "${paramName}" — must be a valid UUID.`));
    }
    next();
  };
}

export function validatePagination(req, res, next) {
  let { page = '1', limit = '20' } = req.query;
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
}
