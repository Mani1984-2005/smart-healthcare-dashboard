// src/api/prescriptionUploads.js
// API module for the isolated PaddleOCR prescription-upload workflow.
//
// Uses the existing apiClient. For multipart requests the browser sets the
// Content-Type header (with the correct boundary) automatically — it is
// NEVER set manually here. No authentication headers are added: the backend
// currently gates these routes by environment (development mode or
// verified OIDC once AUTH_ENABLED=true), not by a frontend-sent token.

import { apiClient } from './client.js';

export const OCR_UPLOAD_SOURCES = ['image', 'pdf', 'camera'];

export const OCR_MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = OCR_MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

/**
 * Client-side pre-validation (mirrors the server rules).
 * Returns { ok: true } or { ok: false, error: <message> }.
 */
export function validateUploadFile(file, { uploadSource } = {}) {
  if (!file) {
    return { ok: false, error: 'No file selected.' };
  }

  const type = (file.type || '').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_FILE_TYPES, type)) {
    return {
      ok: false,
      error: 'Unsupported file type. Please choose a JPG, PNG, WEBP or PDF file.',
    };
  }

  if (file.size === 0) {
    return { ok: false, error: 'The selected file is empty.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is ${OCR_MAX_FILE_SIZE_MB} MB.`,
    };
  }

  if (uploadSource === 'pdf' && type !== 'application/pdf') {
    return { ok: false, error: 'uploadSource "pdf" requires a PDF file.' };
  }

  if (uploadSource && uploadSource !== 'pdf' && type === 'application/pdf') {
    return { ok: false, error: 'PDF files must use the "pdf" upload source.' };
  }

  return { ok: true };
}

/** Derives the upload source from the selected file's type. */
export function deriveUploadSource(file) {
  return file && file.type === 'application/pdf' ? 'pdf' : 'image';
}

/**
 * Uploads a prescription document for OCR processing.
 * FormData is sent as-is; the browser supplies the multipart boundary.
 * (Upload progress is intentionally not reported — the fetch transport
 * does not support request upload progress.)
 */
export async function uploadPrescriptionOcr(file, { uploadSource } = {}) {
  const source = uploadSource || deriveUploadSource(file);

  const formData = new FormData();
  formData.append('prescription', file);
  formData.append('uploadSource', source);

  const { data } = await apiClient.post('/prescription-uploads', formData);
  return data.data;
}

/** Paginated history list. */
export async function fetchPrescriptionUploads({
  page = 1,
  limit = 10,
  status = null,
  uploadSource = null,
  q = null,
  includeDeleted = false,
} = {}) {
  const params = { page, limit };
  if (status) params.status = status;
  if (uploadSource) params.uploadSource = uploadSource;
  if (q) params.q = q;
  if (includeDeleted) params.includeDeleted = 'true';

  const { data } = await apiClient.get('/prescription-uploads', { params });
  return data;
}

/** Upload detail (metadata + machine-extracted text). */
export async function fetchPrescriptionUpload(id) {
  const { data } = await apiClient.get(`/prescription-uploads/${id}`);
  return data.data;
}

/** Dedicated OCR audit history. */
export async function fetchPrescriptionUploadAudit(id) {
  const { data } = await apiClient.get(`/prescription-uploads/${id}/audit`);
  return data.data;
}

/** Soft delete (server keeps files and history). */
export async function deletePrescriptionUpload(id) {
  const { data } = await apiClient.delete(`/prescription-uploads/${id}`);
  return data.data;
}

/** Records a human review/correction (stored in the audit trail). */
export async function submitPrescriptionUploadReview(id, { reviewedText, note } = {}) {
  const { data } = await apiClient.post(`/prescription-uploads/${id}/review`, {
    reviewedText,
    ...(note ? { note } : {}),
  });
  return data.data;
}

/**
 * URL of the original document, served by an access-gated API route —
 * never a public static /uploads path.
 */
export function prescriptionDocumentUrl(id) {
  return `/api/prescription-uploads/${id}/document`;
}
