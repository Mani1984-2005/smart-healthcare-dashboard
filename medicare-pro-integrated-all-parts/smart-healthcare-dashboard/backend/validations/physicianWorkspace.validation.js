// backend/validations/physicianWorkspace.validation.js
//
// Part 5 — Physician AI Workspace — server-side request validation.
// Never trusts frontend input; every mutating endpoint runs its inputs
// through here before touching the store.

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function validateCaseId(caseId) {
  if (!isValidId(caseId)) {
    return "A valid caseId path parameter is required.";
  }
  return null;
}

export function validateSummaryId(summaryId) {
  if (!isValidId(summaryId)) {
    return "A valid summaryId path parameter is required.";
  }
  return null;
}

const EDITABLE_SECTION_KEYS = [
  "chiefComplaint",
  "historyOfPresentIllness",
  "pastMedicalHistory",
  "medications",
  "allergies",
  "familyHistory",
  "socialHistory",
  "vitals",
  "investigations",
  "missingInformation",
];

const MAX_SECTION_LENGTH = 4000;

export function validateEditPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }
  const { sections } = body;
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return "Request body must include a 'sections' object.";
  }
  const keys = Object.keys(sections);
  if (keys.length === 0) {
    return "At least one section must be provided to edit.";
  }
  for (const key of keys) {
    if (!EDITABLE_SECTION_KEYS.includes(key)) {
      return `Unknown section '${key}'. Allowed sections: ${EDITABLE_SECTION_KEYS.join(", ")}.`;
    }
    if (typeof sections[key] !== "string") {
      return `Section '${key}' must be a string.`;
    }
    if (sections[key].length > MAX_SECTION_LENGTH) {
      return `Section '${key}' exceeds the maximum length of ${MAX_SECTION_LENGTH} characters.`;
    }
  }
  return null;
}

export function validateRejectPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }
  if (!body.reason || typeof body.reason !== "string" || !body.reason.trim()) {
    return "A non-empty 'reason' string is required to reject a summary.";
  }
  if (body.reason.length > MAX_SECTION_LENGTH) {
    return `'reason' exceeds the maximum length of ${MAX_SECTION_LENGTH} characters.`;
  }
  return null;
}

export function validateRevisePayload(body) {
  if (body === undefined || body === null) return null;
  if (typeof body !== "object" || Array.isArray(body)) {
    return "Request body, if provided, must be a JSON object.";
  }
  if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > MAX_SECTION_LENGTH)) {
    return `'note', if provided, must be a string up to ${MAX_SECTION_LENGTH} characters.`;
  }
  return null;
}
