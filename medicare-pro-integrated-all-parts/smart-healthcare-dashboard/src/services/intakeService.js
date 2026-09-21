// src/services/intakeService.js
//
// Team 1 — kiosk API client. Reuses the existing shared Axios instance
// (src/services/api.js) for baseURL/error-normalization, exactly as the
// approved design specified, but sets its own Authorization header per
// call rather than relying on the shared interceptor's localStorage
// token — the kiosk's session token and the staff demo-adapter header
// are Team 1-specific and must never be confused with MediCare Pro's
// own (currently unused) `medicare_auth_token` key.

import api from "./api.js";

const STAFF_HEADER = "x-team1-demo-staff-id";

/**
 * Staff-side: create a new intake session for a patient.
 * `staffId` is the CURRENT DEMO staff identity only — see
 * backend/middleware/team1StaffAuthorizationAdapter.js for why this is
 * explicitly not production authentication.
 */
export async function createIntakeSession({ patientId, staffId, encounterId, intakeMode }) {
  const { data } = await api.post(
    "/intake/sessions",
    { patientId, encounterId, intakeMode },
    { headers: { [STAFF_HEADER]: staffId } }
  );
  return data; // { success, session, sessionToken }
}

function kioskHeaders(sessionToken) {
  return { headers: { Authorization: `Bearer ${sessionToken}` } };
}

export async function getSessionState(sessionId, sessionToken) {
  const { data } = await api.get(`/intake/sessions/${sessionId}`, kioskHeaders(sessionToken));
  return data; // { success, session, answers, nextQuestion }
}

export async function updateSession(sessionId, sessionToken, patch) {
  const { data } = await api.patch(`/intake/sessions/${sessionId}`, patch, kioskHeaders(sessionToken));
  return data;
}

export async function postMessage(sessionId, sessionToken, message) {
  const { data } = await api.post(`/intake/sessions/${sessionId}/messages`, message, kioskHeaders(sessionToken));
  return data;
}

export async function submitAnswer(sessionId, sessionToken, answer) {
  const { data } = await api.post(`/intake/sessions/${sessionId}/answers`, answer, kioskHeaders(sessionToken));
  return data; // { success, answer, nextQuestion, completion }
}

export async function getHistory(sessionId, sessionToken) {
  const { data } = await api.get(`/intake/sessions/${sessionId}/history`, kioskHeaders(sessionToken));
  return data.history;
}

export async function editHistoryAnswer(sessionId, sessionToken, { questionId, rawValue }) {
  const { data } = await api.patch(
    `/intake/sessions/${sessionId}/history`,
    { questionId, rawValue },
    kioskHeaders(sessionToken)
  );
  return data.history;
}

export async function completeSession(sessionId, sessionToken) {
  const { data } = await api.post(`/intake/sessions/${sessionId}/complete`, {}, kioskHeaders(sessionToken));
  return data;
}

/** Staff-side read, e.g. for a "review completed intake" screen. */
export async function exportSession(sessionId, staffId) {
  const { data } = await api.get(`/intake/sessions/${sessionId}/export`, { headers: { [STAFF_HEADER]: staffId } });
  return data;
}
