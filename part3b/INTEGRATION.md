# Part 3B Integration Notes

New files only — nothing from Part 1/2/3A was modified. Three small,
additive edits are required to wire this in:

## 1. `backend/package.json` — add dependencies
```
npm install jsonwebtoken jose qrcode --save
```

## 2. `backend/src/db/migrate.js` — register the new schema file
Add `'schema_workflow.sql'` as the last entry in `schemaFiles`:
```js
const schemaFiles = ['schema.sql', 'schema_ai.sql', 'schema_enterprise.sql', 'schema_workflow.sql'];
```

## 3. `backend/src/server.js` — mount routes + bootstrap approval handlers
```js
import rbacRoutes from './routes/rbac.routes.js';
import scannerRoutes from './routes/scanner.routes.js';
import biometricRoutes from './routes/biometric.routes.js';
import clinicalAssistantRoutes from './routes/clinicalAssistant.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import versioningRoutes from './routes/versioning.routes.js';
import { bootstrapWorkflow } from './workflowBootstrap.js';

app.use('/api/auth', rbacRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/clinical-assistant', clinicalAssistantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/versions', versioningRoutes);

bootstrapWorkflow(); // registers approval handlers (see workflowBootstrap.js)
```

## Environment variables (`.env`)
```
AUTH_ENABLED=false          # flip to true once Keycloak is provisioned
KEYCLOAK_ISSUER=
KEYCLOAK_AUDIENCE=medicare-pro-api
KEYCLOAK_JWKS_URI=
DEV_JWT_SECRET=dev-only-insecure-secret-change-me
CLINICAL_ASSISTANT_PROVIDER=rule-based
```

## How each module behaves before Keycloak exists
`AUTH_ENABLED=false` (default) — every request is treated as the system
user with full permissions, so all Part 1–3A routes and the new Part 3B
routes work with zero config. `middleware/authorize.js` guards become
no-ops in this mode too. Use `POST /api/auth/dev-token` to mint a
role-bearing JWT for manual testing of RBAC-gated routes once
`AUTH_ENABLED=true` but before a real Keycloak realm is stood up.

## What's ready to swap in later (Part 3C or ops work)
- `services/keycloakAdapter.service.js` — point `KEYCLOAK_JWKS_URI` at a
  real realm; RS256 verification via `jose` is already implemented.
- `services/notificationChannels/*` — replace the email/SMS/push stubs
  with real SMTP/Twilio/FCM clients; the `NotificationChannel` interface
  doesn't change.
- `services/clinicalAssistant.service.js` — call
  `registerClinicalAssistantProvider('vendor-x', {...})` and set
  `CLINICAL_ASSISTANT_PROVIDER=vendor-x`.
- `services/biometric.service.js` — swap the raw `crypto.verify` PEM flow
  for `@simplewebauthn/server` if full WebAuthn attestation is needed;
  the challenge/credential DB shape already matches.
- `services/approval.service.js` — call `registerApprovalHandler(...)`
  from any domain module to wire new reviewable actions.
