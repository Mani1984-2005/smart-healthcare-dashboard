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

export function validateAnalyzeRequest(req, res, next) {
  const body = req.body || {};
  let { knownAllergies } = body;

  if (knownAllergies === undefined || knownAllergies === null) {
    knownAllergies = [];
  } else if (typeof knownAllergies === 'string') {
    knownAllergies = knownAllergies.split(',').map((a) => a.trim()).filter(Boolean);
  } else if (!Array.isArray(knownAllergies)) {
    return next(AppError.badRequest('"knownAllergies" must be an array of strings or a comma-separated string.'));
  }

  if (knownAllergies.some((a) => typeof a !== 'string')) {
    return next(AppError.badRequest('Every entry in "knownAllergies" must be a string.'));
  }

  req.body.knownAllergies = knownAllergies.slice(0, 20);
  next();
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

// ---------------------------------------------------------------------
// Part 3A — Core Enterprise Integration validators
// ---------------------------------------------------------------------

const GENDERS = new Set(['male', 'female', 'other', 'unspecified']);

export function validatePatientCreate(req, res, next) {
  const b = req.body || {};
  if (!b.fullName || typeof b.fullName !== 'string' || !b.fullName.trim()) {
    return next(AppError.badRequest('"fullName" is required.'));
  }
  if (b.gender && !GENDERS.has(b.gender)) {
    return next(AppError.badRequest(`Invalid "gender". Must be one of: ${[...GENDERS].join(', ')}.`));
  }
  if (b.knownAllergies && !Array.isArray(b.knownAllergies)) {
    return next(AppError.badRequest('"knownAllergies" must be an array of strings.'));
  }
  if (b.chronicConditions && !Array.isArray(b.chronicConditions)) {
    return next(AppError.badRequest('"chronicConditions" must be an array of strings.'));
  }
  next();
}

export function validateDispenseRequest(req, res, next) {
  const b = req.body || {};
  if (!b.medicineName || typeof b.medicineName !== 'string' || !b.medicineName.trim()) {
    return next(AppError.badRequest('"medicineName" is required.'));
  }
  if (b.quantityDispensed === undefined || Number.isNaN(Number(b.quantityDispensed)) || Number(b.quantityDispensed) < 0) {
    return next(AppError.badRequest('"quantityDispensed" must be a non-negative number.'));
  }
  next();
}

const ABNORMAL_FLAGS = new Set(['normal', 'low', 'high', 'critical_low', 'critical_high']);

export function validateLabReportCreate(req, res, next) {
  const b = req.body || {};
  if (!b.patientId || !UUID_RE.test(b.patientId)) {
    return next(AppError.badRequest('"patientId" must be a valid UUID.'));
  }
  if (!b.testName || typeof b.testName !== 'string' || !b.testName.trim()) {
    return next(AppError.badRequest('"testName" is required.'));
  }
  if (b.resultValue === undefined || b.resultValue === null || String(b.resultValue).trim() === '') {
    return next(AppError.badRequest('"resultValue" is required.'));
  }
  if (b.abnormalFlag && !ABNORMAL_FLAGS.has(b.abnormalFlag)) {
    return next(AppError.badRequest(`Invalid "abnormalFlag". Must be one of: ${[...ABNORMAL_FLAGS].join(', ')}.`));
  }
  if (b.prescriptionId && !UUID_RE.test(b.prescriptionId)) {
    return next(AppError.badRequest('"prescriptionId" must be a valid UUID.'));
  }
  next();
}

const INVOICE_STATUSES = new Set(['draft', 'pending', 'paid', 'partially_paid', 'void', 'refunded']);

export function validateInvoiceStatusUpdate(req, res, next) {
  const b = req.body || {};
  if (b.status && !INVOICE_STATUSES.has(b.status)) {
    return next(AppError.badRequest(`Invalid "status". Must be one of: ${[...INVOICE_STATUSES].join(', ')}.`));
  }
  if (b.amountPaid !== undefined && Number.isNaN(Number(b.amountPaid))) {
    return next(AppError.badRequest('"amountPaid" must be a number.'));
  }
  next();
}

export function validateLinkPatientRequest(req, res, next) {
  const b = req.body || {};
  if (!b.patientId || !UUID_RE.test(b.patientId)) {
    return next(AppError.badRequest('"patientId" must be a valid UUID.'));
  }
  next();
}
