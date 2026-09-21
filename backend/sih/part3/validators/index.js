// Hand-written request validators (no dependency). Each returns clean values or throws a 400/415/422 AppError.
import { AppError, badRequest } from "../middleware/errors.js";
import { ALL_ROLES } from "../middleware/auth.js";
import { ALLOWED_MIME, sanitizeFilename, sniffMime } from "../services/fileSniffer.js";
import { DOC_TYPES, STATUSES } from "../services/documentService.js";
import { EVENT_TYPES } from "../services/timeline/timelineBuilder.js";

const ID_RE = /^[A-Za-z0-9_-]{3,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LANG_RE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;

const fail = (fields) => badRequest("VALIDATION_ERROR", "The request is not valid.", { fields });
const isRealDate = (s) => DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

export function validateId(value, field = "id") {
  if (typeof value !== "string" || !ID_RE.test(value)) throw fail([{ field, message: "Invalid identifier." }]);
  return value;
}

export function validateSessionBody(body) {
  const errors = [];
  const role = body?.role;
  // eslint-disable-next-line no-control-regex -- intentionally strips control characters from a user-supplied display name
  const name = typeof body?.name === "string" ? body.name.replace(/[\u0000-\u001F\u007F]/g, "").trim() : "";
  if (!ALL_ROLES.includes(role)) errors.push({ field: "role", message: `Role must be one of: ${ALL_ROLES.join(", ")}.` });
  if (name.length < 1 || name.length > 80) errors.push({ field: "name", message: "Name must be 1-80 characters." });
  if (errors.length) throw fail(errors);
  return { role, name };
}

export function validateUploadRequest(req, { maxBytes }) {
  const errors = [];
  const patientId = typeof req.query.patientId === "string" ? req.query.patientId : "";
  const docType = typeof req.query.docType === "string" ? req.query.docType : "";
  const rawName = typeof req.query.filename === "string" ? req.query.filename : "";
  if (!ID_RE.test(patientId)) errors.push({ field: "patientId", message: "patientId is required." });
  if (!DOC_TYPES.includes(docType)) errors.push({ field: "docType", message: `docType must be one of: ${DOC_TYPES.join(", ")}.` });
  if (!rawName.trim() || rawName.length > 150) errors.push({ field: "filename", message: "filename is required (max 150 characters)." });
  if (errors.length) throw fail(errors);

  const mimeType = req.is(ALLOWED_MIME);
  if (!mimeType) throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", `Unsupported file type. Allowed: ${ALLOWED_MIME.join(", ")}.`);
  const buffer = req.body;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw badRequest("EMPTY_FILE", "The uploaded file is empty.");
  if (buffer.length > maxBytes) throw new AppError(413, "FILE_TOO_LARGE", "The uploaded file exceeds the maximum allowed size.");
  if (sniffMime(buffer) !== mimeType) throw new AppError(415, "FILE_CONTENT_MISMATCH", "The file content does not match its declared type.");
  return { patientId, docType, filename: sanitizeFilename(rawName), mimeType, buffer };
}

export function validateOcrBody(body, enabledProviderIds) {
  const errors = [];
  const { providerId, languageHints } = body ?? {};
  if (providerId !== undefined && (typeof providerId !== "string" || !enabledProviderIds.includes(providerId))) errors.push({ field: "providerId", message: `providerId must be one of: ${enabledProviderIds.join(", ") || "(none enabled)"}.` });
  if (languageHints !== undefined && (!Array.isArray(languageHints) || languageHints.length > 5 || !languageHints.every((l) => typeof l === "string" && LANG_RE.test(l)))) errors.push({ field: "languageHints", message: "languageHints must be up to 5 language codes such as 'en' or 'hi'." });
  if (errors.length) throw fail(errors);
  return { providerId, languageHints: languageHints ?? [] };
}

export function validateListQuery(query) {
  const errors = [];
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) errors.push({ field: "page", message: "page must be an integer >= 1." });
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) errors.push({ field: "limit", message: "limit must be an integer between 1 and 50." });
  if (query.status !== undefined && !STATUSES.includes(query.status)) errors.push({ field: "status", message: `status must be one of: ${STATUSES.join(", ")}.` });
  if (query.patientId !== undefined && !ID_RE.test(String(query.patientId))) errors.push({ field: "patientId", message: "Invalid patientId." });
  if (errors.length) throw fail(errors);
  return { page, limit, status: query.status, patientId: query.patientId };
}

export function validateTimelineQuery(query) {
  const errors = [];
  const order = query.order ?? "asc";
  if (!["asc", "desc"].includes(order)) errors.push({ field: "order", message: "order must be asc or desc." });
  let types = null;
  if (query.types !== undefined) {
    types = String(query.types).split(",").map((t) => t.trim()).filter(Boolean);
    if (!types.length || !types.every((t) => EVENT_TYPES.includes(t))) errors.push({ field: "types", message: `types must be a comma list of: ${EVENT_TYPES.join(", ")}.` });
  }
  for (const key of ["from", "to"]) if (query[key] !== undefined && !isRealDate(String(query[key]))) errors.push({ field: key, message: `${key} must be a valid YYYY-MM-DD date.` });
  if (!errors.length && query.from && query.to && query.from > query.to) errors.push({ field: "from", message: "from must not be after to." });
  if (errors.length) throw fail(errors);
  return { order, types, from: query.from ?? null, to: query.to ?? null };
}
