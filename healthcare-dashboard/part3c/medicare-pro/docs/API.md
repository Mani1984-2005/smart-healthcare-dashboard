# API Reference

Base URL: `/api`. Endpoints marked 🔒 require `Authorization: Bearer <token>`
(see `/api/rbac/me`); most 🔒 endpoints additionally require a specific
permission via `requirePermission`/`requireRole` — see
`backend/src/config/roles.js` for the permission matrix.

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness/readiness, DB connectivity |

## Prescriptions

| Method | Path | Description |
|---|---|---|
| POST | `/api/prescriptions/upload` | Upload prescription image/PDF (multipart, field `prescription`), triggers OCR |
| GET | `/api/prescriptions` | Paginated list |
| GET | `/api/prescriptions/:id` | Detail + OCR text |
| GET | `/api/prescriptions/:id/audit` | Audit trail for this record |
| DELETE | `/api/prescriptions/:id` | Delete |
| POST | `/api/prescriptions/:id/analyze` | Run AI analysis (medicine ID, interactions, risk) |
| GET | `/api/prescriptions/:id/analysis` | Retrieve stored analysis result |
| POST | `/api/prescriptions/:id/link-patient` | Associate with a patient record |
| POST | `/api/prescriptions/:id/dispense` | Record pharmacy dispensation |
| GET | `/api/prescriptions/:id/dispensations` | List dispensations |
| GET | `/api/prescriptions/:id/lab-reports` | Linked lab reports |
| POST | `/api/prescriptions/:id/invoice` | Generate billing invoice |

## Search & analytics

| Method | Path | Description |
|---|---|---|
| GET | `/api/search?q=...` | Cross-entity advanced search |
| GET | `/api/analytics/dashboard` | Aggregate metrics for dashboards |

## Patients

| Method | Path | Description |
|---|---|---|
| POST | `/api/patients` | Create |
| GET | `/api/patients` | Paginated list |
| GET | `/api/patients/:id` | Detail |
| PATCH | `/api/patients/:id` | Update |
| GET | `/api/patients/:patientId/lab-reports` | Patient-scoped lab reports |
| GET | `/api/patients/:patientId/invoices` | Patient-scoped invoices |
| GET | `/api/patients/:patientId/timeline` | Unified clinical timeline |

## Pharmacy, lab, billing

| Method | Path | Description |
|---|---|---|
| GET | `/api/pharmacy` | List pharmacies |
| PATCH | `/api/pharmacy/dispensations/:dispensationId` | Update dispensation status |
| POST | `/api/lab-reports` | Create lab report |
| GET | `/api/lab-reports/:id` | Detail |
| GET | `/api/invoices/:invoiceId` | Detail |
| PATCH | `/api/invoices/:invoiceId/status` | Update status (void/refund flow through the approval engine, see below) |

## Identity & RBAC 🔒

| Method | Path | Description |
|---|---|---|
| POST | `/api/rbac/dev-token` | Issue a dev-mode token (disable in production; use Keycloak) |
| GET | `/api/rbac/me` | Current identity + roles/permissions |
| GET | `/api/rbac/roles` | List roles (admin) |
| GET | `/api/rbac/users/:userId/roles` | List a user's roles (admin) |
| POST | `/api/rbac/users/:userId/roles` | Assign role (admin) |
| DELETE | `/api/rbac/users/:userId/roles/:roleName` | Revoke role (admin) |

## Biometric (WebAuthn)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/biometric/register/options` | 🔒 | Get registration challenge |
| POST | `/api/biometric/register/verify` | 🔒 | Complete credential registration |
| POST | `/api/biometric/auth/options` | 🔒 | Get auth challenge |
| POST | `/api/biometric/auth/verify` | — | Verify assertion — **this is the login step itself** |
| GET | `/api/biometric/credentials` | 🔒 | List registered credentials |
| DELETE | `/api/biometric/credentials/:credentialId` | 🔒 | Revoke a credential |

## Approvals 🔒

Second-person-sign-off workflow used for sensitive actions (e.g. voiding an
invoice, releasing an over-threshold dispensation). Handlers registered in
`backend/src/workflowBootstrap.js`.

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/approvals` | — | Submit a request (`entityType`, `action`, `payload`) |
| GET | `/api/approvals` | `approval:decide` | Pending queue |
| GET | `/api/approvals/:id` | — | Detail |
| POST | `/api/approvals/:id/decide` | `approval:decide` | Approve/reject |
| POST | `/api/approvals/:id/escalate` | `approval:decide` | Escalate |

## Notifications 🔒

| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications` | Paginated list for the current user |
| PATCH | `/api/notifications/:id/read` | Mark one read |
| POST | `/api/notifications/read-all` | Mark all read |
| GET/PUT | `/api/notifications/preferences` | Per-channel (email/SMS/push/in-app) preferences |

## Entity versioning / audit 🔒

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/versions/:entityType/:entityId` | `version_history:read` | Version history |
| GET | `/api/versions/:entityType/:entityId/diff` | `version_history:read` | Diff between versions |
| GET | `/api/versions/:entityType/:entityId/:versionNumber` | `version_history:read` | Specific version |
| POST | `/api/versions/:entityType/:entityId/:versionNumber/restore` | `version_history:restore` | Restore |

## Clinical assistant 🔒

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/clinical-assistant/query` | `clinical_assistant:use` | Ask a question, gets a session-scoped answer |
| GET | `/api/clinical-assistant/sessions/:sessionId` | `clinical_assistant:use` | Session history |
| GET | `/api/clinical-assistant/prescriptions/:id` | `clinical_assistant:use` | History for a prescription |

## Scanner (barcode/QR) 🔒

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/scanner/barcode/lookup` | — | Look up a medicine by barcode |
| POST | `/api/scanner/barcode/register` | `pharmacy:dispense` | Register a new barcode |
| POST | `/api/scanner/qr/lookup` | — | Resolve a QR payload |
| POST | `/api/scanner/qr/patients/:patientId` | `patient:write` | Generate a patient QR |
| POST | `/api/scanner/qr/prescriptions/:id` | `prescription:write` | Generate a prescription QR |

## Error format

Centralized in `backend/src/middleware/errorHandler.js`:

```json
{ "error": { "message": "string", "code": "OPTIONAL_MACHINE_CODE" } }
```
