// Part 3B validators. Kept separate from middleware/validate.js so Part
// 1-3A's validator file is never touched.
import { AppError } from '../utils/AppError.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateBarcodeLookup(req, res, next) {
  const { barcode } = req.body || {};
  if (!barcode || typeof barcode !== 'string' || !barcode.trim()) {
    return next(AppError.badRequest('"barcode" is required.'));
  }
  next();
}

export function validateBarcodeRegister(req, res, next) {
  const { barcode, itemKey } = req.body || {};
  if (!barcode || typeof barcode !== 'string') return next(AppError.badRequest('"barcode" is required.'));
  if (!itemKey || typeof itemKey !== 'string') return next(AppError.badRequest('"itemKey" is required.'));
  next();
}

export function validateQrLookup(req, res, next) {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string' || !token.trim()) {
    return next(AppError.badRequest('"token" is required.'));
  }
  next();
}

const APPROVAL_ENTITY_TYPES = new Set(['prescription', 'invoice', 'dispensation', 'lab_report', 'patient']);
export function validateApprovalCreate(req, res, next) {
  const b = req.body || {};
  if (!b.entityType || !APPROVAL_ENTITY_TYPES.has(b.entityType)) {
    return next(AppError.badRequest(`"entityType" must be one of: ${[...APPROVAL_ENTITY_TYPES].join(', ')}.`));
  }
  if (!b.entityId || !UUID_RE.test(b.entityId)) return next(AppError.badRequest('"entityId" must be a valid UUID.'));
  if (!b.action || typeof b.action !== 'string' || !b.action.trim()) {
    return next(AppError.badRequest('"action" is required (e.g. "dispense", "void_invoice").'));
  }
  next();
}

const APPROVAL_DECISIONS = new Set(['approve', 'reject']);
export function validateApprovalDecision(req, res, next) {
  const { decision } = req.body || {};
  if (!APPROVAL_DECISIONS.has(decision)) {
    return next(AppError.badRequest(`"decision" must be one of: ${[...APPROVAL_DECISIONS].join(', ')}.`));
  }
  next();
}

const NOTIFICATION_CHANNELS = new Set(['in_app', 'email', 'sms', 'push']);
export function validateNotificationPreferences(req, res, next) {
  const b = req.body || {};
  if (b.channels && (!Array.isArray(b.channels) || b.channels.some((c) => !NOTIFICATION_CHANNELS.has(c)))) {
    return next(AppError.badRequest(`"channels" must be an array from: ${[...NOTIFICATION_CHANNELS].join(', ')}.`));
  }
  next();
}

export function validateBiometricRegisterVerify(req, res, next) {
  const b = req.body || {};
  if (!b.credentialId || typeof b.credentialId !== 'string') {
    return next(AppError.badRequest('"credentialId" is required.'));
  }
  if (!b.publicKey || typeof b.publicKey !== 'string') {
    return next(AppError.badRequest('"publicKey" is required.'));
  }
  next();
}

export function validateBiometricAuthVerify(req, res, next) {
  const b = req.body || {};
  if (!b.credentialId || !b.signature || !b.challengeId) {
    return next(AppError.badRequest('"credentialId", "challengeId" and "signature" are required.'));
  }
  next();
}

export function validateClinicalAssistantQuery(req, res, next) {
  const { question } = req.body || {};
  if (!question || typeof question !== 'string' || !question.trim()) {
    return next(AppError.badRequest('"question" is required.'));
  }
  if (question.length > 2000) return next(AppError.badRequest('"question" must be under 2000 characters.'));
  next();
}

export function validateEntityTypeParam(req, res, next) {
  const entityType = req.params.entityType;
  if (!entityType || typeof entityType !== 'string') {
    return next(AppError.badRequest('"entityType" path param is required.'));
  }
  next();
}
