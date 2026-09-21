# Part 6 — ABDM / FHIR / Consent / Security (SIH26047, MediCare Pro)

**Status: DEMO / MOCK / PROTOTYPE.** An *ABDM-ready* interoperability prototype. It is **not** connected to live ABDM,
performs **no** ABHA verification, is **not** FHIR-certified and makes no compliance claims (see [Limitations](#limitations)).
All patients, identifiers and records are synthetic.

Part 6 is a self-contained module. It does not import, call or require any other MediCare Pro module.

```text
HEALTH DATA -> FHIR STANDARDISATION -> PATIENT CONSENT -> AUTHORIZATION -> SECURE SHARING -> AUDIT TRAIL
```

## 1. Run it

Requirements: Node 21+ (the test script uses `node --test` glob support; developed on Node 22, and the repo's own audit used Node 24).

```bash
npm install                      # frontend deps (repo root)
npm --prefix backend install     # backend deps

# Option A: Part 6 ALONE (no Postgres, no Firebase, no other module) on port 5000
npm run part6:start

# Option B: the existing backend with Part 6 mounted (same port, same routes)
cd backend && npm run dev        # (needs the repo's own env if you use its other routes)

npm run dev                      # frontend on :5173 (its /api proxy already points at :5000)
```

Open **http://localhost:5173/part6** (also linked from the login page and the main sidebar).
Run either A **or** B, not both, since both use port 5000. To use another port set `PART6_PORT` (or `PORT`) and start Vite with
`VITE_API_PROXY_TARGET=http://localhost:<port>`.

Configuration: copy `backend/part6/.env.example` to `backend/.env`. Nothing secret is committed and nothing secret is in the
frontend. If `PART6_TOKEN_SECRET` is not set an ephemeral per-process secret is generated (sessions end on restart).

```bash
npm run test:part6               # 57 backend tests (node:test, no extra dependencies)
npm run lint && npm run build    # frontend
```

## 2. Five-minute demo

**Easiest:** sign in as any persona -> **Guided Demo** -> *Run full scenario*. It executes the 15-step story below with real API
calls under four personas and shows each server response (including the ones that are *supposed* to be blocked).

**By hand** (use the persona drop-down in the header to switch):

| # | Persona | Where | Action |
|---|---------|-------|--------|
| 1-2 | Dr. Demo User (Hospital) | Patient Identity | Select *Demo Patient*: internal ID `MCP-DEMO-001` vs ABHA placeholder `DEMO-ABHA-001` (unverified) |
| 3-5 | Dr. Demo User | FHIR Resources | Generate Patient, then Encounter/Observation/Condition/DiagnosticReport; inspect JSON + validation |
| 6-7 | Dr. Demo User | FHIR Bundles | Generate the Bundle, **Validate** (16 entries, references resolve) |
| 8 | Dr. Demo Two (Clinic) | Consent | *Request patient records*: status **Pending** |
| — | Dr. Demo Two | Data Sharing | Try to access now: **blocked** (`CONSENT_PENDING`) |
| 9 | Demo Patient | Consent | *Review request*, untick Lab Reports (data minimisation), **Grant** |
| 10-11 | Dr. Demo Two | Data Sharing | *Access / share records*: only consented categories are released |
| 12 | Demo Patient | Consent | **Revoke** |
| 13 | Dr. Demo Two | Data Sharing | Try again: **ACCESS BLOCKED — Consent is no longer active.** |
| — | Demo Patient | Security | *Live self-test*: 5 real attacks, all blocked and logged |
| 14 | Demo System Admin | Audit Logs | Whole sequence; **Verify integrity** |

To show **expiry**: System Admin -> Settings -> *Advance clock* (demo-only control), then try sharing under a consent that has now expired.

## 3. Architecture

```text
Frontend (src/part6)          React pages, own session, own API client. No business rules trusted.
      |  HTTPS/JSON  /api/part6/*   (Vite strips /api; also mounted at /part6)
      v
API layer (routes/index.js)   secure headers -> rate limit -> body limit -> authenticate -> requirePermission(RBAC)
      v
Services                      Part6SecurityService   auth boundary, RBAC decisions, posture
                              Part6ConsentService    lifecycle Request -> Grant/Deny -> Active -> Revoke/Expire
                              Part6FHIRService       generate / store / validate FHIR (mappers + validator)
                              Part6DataSharing       consent check -> scope check -> map -> minimise -> validate -> release
                              Part6AuditService      append-only, hash-chained log
                              Part6InteroperabilityService  facade over the above (single entry point)
      v
RecordSource adapter          the ONLY seam to patient data (demo implementation ships; see Integration)
      v
Repository                    part6_* collections: in-memory or atomic JSON file (Postgres reference: schema.sql)
```

**Integration contract** (Part 6 needs none of the other modules to run, but is ready to be fed by them):

```text
Patient ID -> FHIR Mapping Layer -> FHIR Resource -> Consent Check -> Authorization Check -> Secure Exchange -> Audit Log
```

To connect other MediCare Pro modules later, implement `RecordSource` (`backend/part6/adapters/recordSource.js`: `getPatient`,
`listPatients`, `getOrganization`, `getPractitioner`, `getIdentityLink`, `getClinicalRecords`) and pass it to
`createPart6({ source })`. The mappers, consent rules, validator and audit are reused unchanged.

### Where it lives

| Area | Path | Notes |
|------|------|-------|
| Backend module | `backend/part6/**` | config, services, routes, tests, seed, `server.js` (standalone), `schema.sql` (reference only) |
| Frontend module | `src/part6/**` | own store/API client/layout/pages; reuses the repo's UI primitives (`src/components/ui`) and Tailwind theme |
| Existing files touched | see [Changes to existing files](#changes-to-existing-files) | all additive |

## 4. FHIR

FHIR **R4 (4.0.1)**. Resources generated from the synthetic source records:

`Patient`, `Practitioner`, `Organization` (supporting), `Encounter`, `Condition`, `Observation` (vital signs incl. a Blood-pressure
panel with components, and laboratory), `MedicationRequest`, `DiagnosticReport`, `AllergyIntolerance`, `DocumentReference`, plus a
`Bundle` (type `collection`). Every generated resource carries `meta.tag` `DEMO-DATA` and the UI labels it **FHIR DEMO RESOURCE**.

* Identifiers use reserved `https://medicare-pro.example/...` systems. The ABHA entry is a *separate* `identifier` in its own
  demo system, marked `use: temp` and `assigner: "DEMO placeholder - not issued or verified by ABDM"`.
* Codes (LOINC, SNOMED CT, HL7 code systems, UCUM units) are illustrative for synthetic data and are **not** checked against a
  terminology server. They are not clinical advice.
* No ABDM/NRCeS `meta.profile` is asserted, because conformance to those profiles is not validated here.

### Validator (`backend/part6/fhir/validator.js`)

Structural validation only: valid JSON; supported `resourceType`; permitted element names per resource (R4); required fields;
identifier presence; enumerated status codes (e.g. Observation.status); date/dateTime/instant formats; datatype shape
(CodeableConcept, Quantity, Period, HumanName, ...); reference well-formedness **and allowed target types**; Bundle rules
(type, `fullUrl` present/unique, `total` matches, no `request` in a collection, **every reference resolves to an entry**).
Result: per-check pass/fail, issues with FHIRPath-style locations, `VALID`/`INVALID`. **It is not the official HL7 validator**,
does no profile or terminology validation, and a `VALID` result is never presented as certification.

## 5. ABDM

| | This prototype | Live ABDM |
|---|---|---|
| Mode | `ABDM_MODE=demo` (the only mode; any other value makes the service refuse to start) | sandbox/production credentials, registered HIP/HIU |
| ABHA | placeholder identifier + masked number, `verification: PROTOTYPE`, `verifiedAt: null`; **no "verify" action exists** | ABDM-run create/verify flows |
| Consent | prototype lifecycle (Pending/Granted/Denied/Revoked/Expired) in Part 6 | ABDM consent-manager artefacts |
| Records | FHIR R4 bundles from a synthetic dataset | HIP -> HIU exchange via ABDM gateway |

The internal MediCare Pro patient ID (`MCP-DEMO-001`) and the ABHA identity (`DEMO-ABHA-001`) are two different identifiers, in
different `identifier.system` values, and are never treated as equivalent.

## 6. Security

**Authentication.** Every data endpoint requires `Authorization: Bearer <token>`. Tokens are HS256-signed (Node `crypto`, no
library), carry issuer/audience/expiry/`jti`, reject `alg:none`, are verified with a constant-time compare, and can be revoked
(logout). Role and organisation are re-read from the store on every request, so a token cannot carry or forge privileges.
*Demo sign-in* (persona picker, no passwords) is enabled only when `PART6_DEMO_AUTH=true` and the service **refuses to start** if
it is enabled with `NODE_ENV=production`. Production would use the hospital IdP / ABDM sign-in.

**Authorization (RBAC + object-level).** One deny-by-default table (`security/permissions.js`) is both enforced by the routes and
rendered as the matrix in the UI, so the UI cannot claim a permission that is not enforced. Beyond role checks, services enforce:
patients only touch their own consents/records; only the **custodian** organisation may generate FHIR for a patient; only a
**party** to a consent (recipient or custodian) may use it; the System Admin sees masked identity and no clinical content.

| Feature | Patient | Doctor | Hospital Admin | System Admin |
|---|---|---|---|---|
| View consents | own | own org | own org | metadata |
| Grant / deny consent | own | — | — | — |
| Revoke consent | own | — | org, reason required | reason required |
| Request records | — | yes (non-custodian org) | yes | — |
| Generate FHIR / bundles | — | custodian org | custodian org | — |
| Validate FHIR JSON | — | yes | yes | yes (pasted JSON only) |
| Share / export (consent-gated) | — | under consent | under consent | — |
| View audit logs | limited (own record) | limited (own actions) | org | all |
| Security posture / events | — | — | org | all |
| Settings, demo clock, reset | — | — | — | yes |

(The authoritative table is `GET /part6/security/matrix`.)

**Consent enforcement** (`share/shareService.js`). Enforced on the server for every call, never only in the UI:
consent exists -> caller's organisation is a party -> status is Granted and **not expired** (expiry applied lazily on every read, audited once)
-> requested categories are within the granted scope -> map -> minimise -> validate -> release. Failures return
`CONSENT_REQUIRED`, `CONSENT_PENDING`, `CONSENT_DENIED`, `CONSENT_REVOKED` ("Consent is no longer active."), `CONSENT_EXPIRED`,
`CONSENT_NOT_FOR_CALLER` or `SCOPE_EXCEEDED`, and are audited (violations are flagged as security events). The UI's Export button is
deliberately **not** disabled when consent is missing; the request goes to the server, which refuses.

**Data minimisation.** Six independently grantable categories (Clinical History, Lab Reports, Medications, Allergies, Diagnostic Reports,
Documents). A patient can narrow a request (never widen it or extend its duration). Billing/administrative data is **not shareable**
in this prototype. The shared Bundle contains the Patient (needed as subject; name/gender/birth date/identifiers only, no contact
details), only the consented resources, only the Practitioner/Organization still referenced, and **references to withheld records
are stripped** so the shared bundle stays valid and does not reveal the existence of withheld data.
Limitation: free-text fields are shared as written; the synthetic `DiagnosticReport.conclusion` is deliberately generic.

**Audit** (`audit/auditService.js`). Append-only, each entry stores `SHA-256(previousHash | entry)`, so edits, deletions and tail
truncation are detected by `GET /audit/verify` (UI: *Verify integrity*). This is tamper-*evident*, not tamper-proof: someone with full
write access to the store could rebuild the chain (production: WORM storage / SIEM). Logged: authentication success/failure/
rejection, permission denied, rate limiting, FHIR generation/validation, record access, consent request/grant/deny/revoke/expiry,
share success/blocked, consent violation attempts, settings and demo controls. **Never logged:** tokens, secrets, passwords,
clinical values (metadata is allow-listed/sanitised; a test scans the log for clinical strings and the signing secret). IPs are
truncated. Demo reset **preserves** the audit trail. Visibility is role-scoped.

**API hardening.** Secure headers (`nosniff`, frame denial, `no-store`, `no-referrer`, CSP `default-src 'none'`, HSTS in production),
256 kB body limit, strict JSON, schema/param validation, per-client rate limit (600/min, login 20/min; audited once per window),
generic error bodies with a request id and **no stack traces**, restrictive CORS in standalone mode (allow-list).

## 7. API

Base: `/api/part6` (also `/part6`). All except the first three require a bearer token; `perm` is the RBAC permission.

| Method & path | perm | Purpose |
|---|---|---|
| `GET /meta` | public | mode + honesty statements |
| `GET /auth/demo-users`, `POST /auth/demo-login` | public (demo auth only) | persona sign-in |
| `GET /auth/me`, `POST /auth/logout` | authed | session |
| `GET /catalog` | authed | categories, purposes, limits, recipients |
| `GET /overview` | overview.view | dashboard data (role-scoped) |
| `GET /patients`, `GET /patients/:id/identity` | patients.list / identity.view | selector; ABHA-demo identity |
| `POST /fhir/generate`, `POST /fhir/bundle` | fhir.generate | generate resources / bundle |
| `GET /fhir/resources[/:type/:id]`, `GET /fhir/bundles[/:id]` | fhir.read | stored (in-house) resources |
| `POST /fhir/validate` | fhir.validate | body: `{raw}` \| `{resource}` \| `{bundleId}` \| `{resourceType,id}` |
| `GET /consent[/:id]` | consent.view | |
| `POST /consent` | consent.request / consent.patient_share | provider request (Pending) or patient-initiated share (Granted) |
| `POST /consent/:id/grant` \| `deny` | consent.decide | patient only; grant may narrow scope/duration |
| `POST /consent/:id/revoke` | consent.revoke | |
| `POST /share`, `GET /share` | record.share / share.view | consent-gated exchange; share history |
| `GET /audit`, `GET /audit/verify` | audit.view / audit.verify | |
| `GET /security/matrix`, `/security/posture`, `/security/events` | authed / security.view | |
| `GET`/`PUT /settings`, `POST /demo/clock/advance`, `POST /demo/reset` | security.view / security.manage | |

Errors: `{ "error": { "code", "message", "details"? }, "requestId" }` with codes `UNAUTHENTICATED` (401), `FORBIDDEN` / `NOT_CUSTODIAN` /
`CONSENT_*` / `SCOPE_EXCEEDED` (403), `NOT_FOUND` (404), `VALIDATION_FAILED` / `INVALID_JSON` (400), `INVALID_STATE` (409),
`PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429). The UI maps these to explicit states: Unauthorized, Access Denied, Export Blocked,
Access Blocked, Consent Expired, Validation Failed, Loading, Empty, Success.

## 8. Testing

`npm run test:part6` — 57 tests against the real services and a real in-process HTTP server (no mocks of the code under test):
FHIR generation/validation (12), consent lifecycle (11), data sharing (11), security/audit/RBAC/config (21), and the complete
demo scenario end to end (2). Selected guarantees under test: forged/`alg:none`/expired/revoked tokens are rejected; every
protected endpoint 401s anonymously; role × endpoint denials; custodian and patient isolation; scope narrowing never widens;
revoked/expired/pending consent blocks sharing and writes nothing to the share store; withheld records do not appear (or get
referenced) in shared bundles; audit tamper (edit and tail-delete) detection; no secret/token/clinical value in the audit log;
`ABDM_MODE=live` and demo-auth-in-production are refused; settings are enforced. Consent and scope checks were
mutation-tested (disabling the check makes the relevant tests fail).

The frontend was additionally exercised in a real Chromium: 5 personas × 11 pages with no console errors, the Guided Demo,
a manual request -> narrowed grant -> share -> scope-exceeded block -> revoke -> blocked flow, consent-less export, the validation UI,
the security self-test and audit integrity verification. There is no committed browser-test suite; the repo has no frontend test runner.

## Limitations

* **No live ABDM.** No ABDM gateway, HIP/HIU registration, consent-manager artefacts, or ABHA create/verify. ABHA values are placeholders.
* **Structural FHIR validation only**; no profile/terminology validation; codes are illustrative; not FHIR-certified.
* **No compliance claims** (not HIPAA-, GDPR- or DPDP-certified/audited; no formal DPIA, penetration test or third-party review).
* **Demo authentication** (persona picker) must be replaced by a real IdP before any real use; the session token is in `sessionStorage`
  (production: httpOnly SameSite cookie). No MFA, no account lifecycle.
* **Storage** is an in-memory / local JSON file with synthetic data; no encryption at rest, backups or DB-level access control. `schema.sql` is reference only.
* **Rate limiting and token revocation** are per-process (single instance).
* **Audit chain** is tamper-evident, not tamper-proof (see above). The demo clock / reset controls exist for demonstration only.
* **Minimisation** scope: category-level, not field-level, and free text is shared verbatim.
* **Only two organisations** exist in the seed, so "a party to the consent" is tested with an injected third organisation in the test suite.
* The Part 6 UI reuses the existing `src/components/ui` primitives and Tailwind theme; that is a design-system dependency, not a dependency on any SIH part.
* Express `req.socket.remoteAddress` is used for rate limiting; behind a reverse proxy configure `trust proxy` and adjust.

## Changes to existing files

All additive; no existing route, model, page or behaviour was removed or altered.

| File | Change |
|---|---|
| `backend/server.js` | +2 imports and a `try/catch` that mounts Part 6 (a Part 6 startup failure cannot stop the rest of the backend). Mounted *before* the global JSON parser so Part 6 owns its own body-parse errors. |
| `backend/package.json` | +scripts `part6:start`, `test:part6` (no new dependencies) |
| `package.json` | +scripts `part6:start`, `test:part6` |
| `src/App.tsx` | +lazy import and one route `/part6/*` **outside** `ProtectedRoute` (Part 6 has its own auth boundary) |
| `src/layouts/Sidebar.tsx` | +one link to `/part6` |
| `src/pages/Login.tsx` | +one link to `/part6` |
| `vite.config.js` | proxy target now `process.env.VITE_API_PROXY_TARGET \|\| "http://localhost:5000"` (default unchanged) |
| `.gitignore` | +`backend/part6/.data/` |
