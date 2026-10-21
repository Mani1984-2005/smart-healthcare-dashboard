# Local Development Authentication (Phase 2D)

> **Scope: local development and demonstration only.**
> This document describes a *development* sign-in bridge. It is **not**
> production authentication and must never be used for real patient operations.

## What this actually is

The React frontend obtains a token from the backend's own
`POST /api/auth/dev-token` endpoint, then asks the backend who it is with
`GET /api/auth/me`. There is no separate identity provider, no password flow,
and no client-side role selection that grants anything.

```
portal card click
  └─ POST /api/auth/dev-token { subject, email, fullName, roles:[backendRole] }
       ├─ refused unless ALLOW_DEV_TOKENS=true
       ├─ refused whenever KEYCLOAK_JWKS_URI is configured
       ├─ refused in production/staging
       └─ refused for privileged roles (admin, system)
  └─ token stored under `medicare_auth_token`
  └─ GET /api/auth/me  (Authorization: Bearer <token>)
       └─ { user, roles, permissions, authMode } → stored as the session identity
  └─ every later API call attaches `Authorization: Bearer <token>`
```

Identity, roles and permissions always come from the backend. The portal card
only chooses *which backend role to request*; it is never proof of permission.

## Required local configuration

Set these in `backend/.env` (never commit this file, never paste its contents
into a chat, issue, or log):

```dotenv
# a long random string; the dev-token endpoint refuses to sign with the
# built-in KNOWN_INSECURE_DEV_SECRET (see keycloakAdapter.service.js)
JWT_SECRET=<generate a long random value>

# explicitly opts this backend into development-token issuance
ALLOW_DEV_TOKENS=true
```

Then start PostgreSQL, the backend, and the frontend as usual. **The sign-in
flow needs a working database**, because `/api/auth/me` provisions the local
user row through `rbac.service.getOrProvisionUser`.

Frontend-side, no environment variable is required: the client calls the same
origin the Vite dev server proxies (`/api` → `http://localhost:5000`,
`vite.config.js`).

## Which portal cards can sign in

| Portal card     | Backend role     | Result |
| --------------- | ---------------- | ------ |
| Patient         | `patient`        | ✅ issues a token |
| Doctor          | `doctor`         | ✅ issues a token |
| Receptionist    | `receptionist`   | ✅ issues a token |
| **Admin**       | `admin`          | ❌ **blocked** — privileged role, refused by the dev-token endpoint on purpose |
| **Hospital**    | *(none)*         | ❌ **blocked** — the backend defines no such role |

The Admin and Hospital cards stay visible, are labelled as having no backend
identity, and produce a clear "sign-in failed" error. **This is a deliberate
limitation, not a bug to work around**: bypassing it would mean minting an
admin token from a development endpoint.

`nurse`, `pharmacist`, `lab_technician`, `billing_clerk` and `auditor` are also
issuable by the endpoint, but the current UI has no portal card for them.

## Navigation and routes

`src/services/navigationPolicy.js` maps each route to a **backend** permission
key copied verbatim from `backend/src/config/roles.js`:

| Route(s) | Required permission |
| --- | --- |
| `/patients` | `patient:read` |
| `/laboratory`, `/x-ray`, `/specimens`, `/specimen-intake`, … | `lab:write` |
| `/pharmacy`, `/medicines`, `/inventory`, `/dispensing`, `/prescriptions`, … | `prescription:read` |
| `/billing` | `billing:read` |
| `/staff` | `rbac:manage` |
| `/dashboard`, `/doctors`, `/emergency`, `/patient-relations`, `/settings`, … | *(any authenticated session)* |

The sidebar hides entries the session lacks, and direct navigation to a gated
URL renders "Access denied". **Both are cosmetic.** Every backend route runs
`authenticate` + `requirePermission` (or `requireRole`), so a user who bypasses
the UI still receives 401/403.

Consequences of following the backend's real permission set:

* `doctor` has **no** `billing:read`, so the Invoicing module is hidden.
* `patient` inherits `billing:read` and `prescription:read` from the backend's
  default role map, so those two modules appear — the server still applies
  record-level ownership checks.
* `/staff` requires `rbac:manage`, which only `admin`/`system` hold, so it is
  unreachable with development tokens. Correct, not broken.

## What was removed and why

* **Fabricated guest login** (`loginAsGuest`) — it invented an identity and
  reported "logged in" with no token at all.
* **The Google/Firebase sign-in path** — the backend verifies Keycloak RS256
  (JWKS) or local HS256 JWTs only. A Firebase ID token can never authenticate
  an API call here, so keeping the button would advertise an authentication
  path that does not work. `src/firebase.js` and `src/pages/LoginPage.jsx` are
  left untouched but are no longer in the module graph.
* **Self-selected role in `localStorage.role`** — role is backend-issued now.
* **`medicare_auth_user`** — superseded by `medicare_auth_identity`, which is
  validated against `/api/auth/me` on every page load.

## Session lifecycle

| Event | Behaviour |
| --- | --- |
| Page load | stored token re-validated against `/api/auth/me`; failure deletes it and you stay on `/login` (no redirect loop — with no token, no request is made) |
| Any request returns **401** | token + identity cleared, React Query cache dropped, app returns to `/login` |
| Any request returns **403** | session kept; error surfaced with "access denied", never a silent demo-data success |
| Logout | token, identity, React Query cache **and** session-scoped clinical storage cleared |

Clinical storage cleared on logout (each key cited in
`src/services/authToken.js`): `patients`, `prescriptions`, `billing_invoices`,
`medicare_reports`, `xray_images`, `lab_tests`, `medicare_lab_orders`,
`medicare_lab_results`, `medicare_lab_tests`, `medicare_lab_specimens`.
Preferences and shared app content are **not** touched: `theme`,
`medicare_lang`, `hospital_achievements`, `pharmacy_medicines`,
`inventory_qa_checklist`.

## Known limitations

1. Development tokens are bearer tokens signed with `JWT_SECRET` and are valid
   for 8 hours; anyone with the secret can mint any non-privileged role.
2. There is no password, no MFA, no revocation list, and no audit of who
   requested a token.
3. `/api/auth/dev-token` provisions user rows by `subject`, so repeated use
   creates deterministic local accounts (`dev-portal-doctor`, …). Dev tokens
   carry no `email_verified` claim, so they can never take over an existing
   account by email.
4. Real authentication requires either a provisioned Keycloak realm (already
   supported by the verifier) or a deliberate decision to add a Firebase
   verifier — an architectural change that needs approval.
