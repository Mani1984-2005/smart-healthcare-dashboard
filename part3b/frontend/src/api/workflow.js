// Part 3B — thin API clients for the enterprise workflow & security
// endpoints, matching the axios instance/error-shape conventions of
// api/client.js from Part 1-3A. No UI components are included here by
// design (see INTEGRATION.md) — these are the seams for Part 3C's
// dashboards (approval queue, notification bell, scanner UI, etc).
import { apiClient } from './client.js';

// --- RBAC ---------------------------------------------------------------
export const authApi = {
  devToken: (payload) => apiClient.post('/auth/dev-token', payload).then((r) => r.data),
  me: () => apiClient.get('/auth/me').then((r) => r.data),
  listRoles: () => apiClient.get('/auth/roles').then((r) => r.data),
  assignRole: (userId, roleName) => apiClient.post(`/auth/users/${userId}/roles`, { roleName }).then((r) => r.data),
  revokeRole: (userId, roleName) => apiClient.delete(`/auth/users/${userId}/roles/${roleName}`).then((r) => r.data),
};

// --- Scanner (barcode + QR) ----------------------------------------------
export const scannerApi = {
  lookupBarcode: (barcode) => apiClient.post('/scanner/barcode/lookup', { barcode }).then((r) => r.data),
  registerBarcode: (payload) => apiClient.post('/scanner/barcode/register', payload).then((r) => r.data),
  lookupQr: (token) => apiClient.post('/scanner/qr/lookup', { token }).then((r) => r.data),
  generatePatientQr: (patientId) => apiClient.post(`/scanner/qr/patients/${patientId}`).then((r) => r.data),
  generatePrescriptionQr: (prescriptionId) => apiClient.post(`/scanner/qr/prescriptions/${prescriptionId}`).then((r) => r.data),
};

// --- Biometric authentication ---------------------------------------------
export const biometricApi = {
  getRegistrationChallenge: () => apiClient.post('/biometric/register/options').then((r) => r.data),
  verifyRegistration: (payload) => apiClient.post('/biometric/register/verify', payload).then((r) => r.data),
  getAuthChallenge: () => apiClient.post('/biometric/auth/options').then((r) => r.data),
  verifyAuth: (payload) => apiClient.post('/biometric/auth/verify', payload).then((r) => r.data),
  listCredentials: () => apiClient.get('/biometric/credentials').then((r) => r.data),
  revokeCredential: (credentialId) => apiClient.delete(`/biometric/credentials/${credentialId}`).then((r) => r.data),
};

// --- AI Clinical Assistant -------------------------------------------------
export const clinicalAssistantApi = {
  ask: (payload) => apiClient.post('/clinical-assistant/query', payload).then((r) => r.data),
  getSession: (sessionId) => apiClient.get(`/clinical-assistant/sessions/${sessionId}`).then((r) => r.data),
  getForPrescription: (prescriptionId) => apiClient.get(`/clinical-assistant/prescriptions/${prescriptionId}`).then((r) => r.data),
};

// --- Notifications -----------------------------------------------------
export const notificationsApi = {
  list: (params) => apiClient.get('/notifications', { params }).then((r) => r.data),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.post('/notifications/read-all').then((r) => r.data),
  getPreferences: () => apiClient.get('/notifications/preferences').then((r) => r.data),
  updatePreferences: (payload) => apiClient.put('/notifications/preferences', payload).then((r) => r.data),
};

// --- Review & approval workflow ----------------------------------------
export const approvalsApi = {
  create: (payload) => apiClient.post('/approvals', payload).then((r) => r.data),
  queue: (params) => apiClient.get('/approvals', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/approvals/${id}`).then((r) => r.data),
  decide: (id, decision, note) => apiClient.post(`/approvals/${id}/decide`, { decision, note }).then((r) => r.data),
  escalate: (id, payload) => apiClient.post(`/approvals/${id}/escalate`, payload).then((r) => r.data),
};

// --- Version history -----------------------------------------------------
export const versionsApi = {
  history: (entityType, entityId) => apiClient.get(`/versions/${entityType}/${entityId}`).then((r) => r.data),
  get: (entityType, entityId, versionNumber) => apiClient.get(`/versions/${entityType}/${entityId}/${versionNumber}`).then((r) => r.data),
  diff: (entityType, entityId, from, to) => apiClient.get(`/versions/${entityType}/${entityId}/diff`, { params: { from, to } }).then((r) => r.data),
  restore: (entityType, entityId, versionNumber) => apiClient.post(`/versions/${entityType}/${entityId}/${versionNumber}/restore`).then((r) => r.data),
};
