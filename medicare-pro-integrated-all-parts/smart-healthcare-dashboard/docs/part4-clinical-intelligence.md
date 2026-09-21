# SIH 2026 — MediCare Pro · Part 4: Clinical Intelligence

> **Status:** implemented as an independent vertical slice. Decision support for clinicians only — not a diagnostic device, not clinically validated.

## 1. Part 4 overview

Turns a clinical record into a **structured, explainable, reviewable** view for clinicians: summary, timeline, red-flag alerts, possible considerations, investigation and medication/allergy checks, with a clinician review workflow.

Design principles: deterministic rules for anything safety-critical · AI is optional, untrusted and gated · missing data is stated, never guessed · nothing is "approved" without an authenticated doctor.

### Existing MediCare Pro vs SIH Part 4

| | Component |
|---|---|
| **Existing (unchanged)** | Vite/React/TS frontend, design-system primitives (`Badge`, `Button`, `Section`, `Dialog`, …), `authStore` role picker, `PermissionGuard`, Express 5 backend, `/patients` + `/health` routes, audit logger (optionally reused) |
| **Existing (modified, additive only)** | `backend/server.js` (+1 import, +1 mount) · `src/app/routes.tsx` (+1 route) · `src/layouts/Sidebar.tsx` (+1 icon/group entry) · `package.json` ×2 (test scripts, `zod`, test tooling) |
| **New — Part 4** | `backend/clinical-intelligence/**` · `src/features/clinical-intelligence/**` · `src/pages/ClinicalIntelligence.tsx` · `src/test/**` · `vitest.config.js` · this document |
| **Demo-only** | The six synthetic patients · demo session minting (`POST /session`) · the mock AI provider |
| **Optional integrations** | Anthropic provider (`CLINICAL_AI_PROVIDER=anthropic`) · Firebase auth mode · forwarding audit metadata to the existing logger |

### Not reused, deliberately
* `backend/utils/mlEngineStub.js` — emits keyword→"diagnosis" with invented confidence (contradicts the safety requirements) and is a CommonJS file in an ESM package.
* The inline interaction table in `pharmacyController.js` — unmounted, imports DB pools at load time, and its model import is broken. Part 4 carries its own small rule table (`data/referenceData.js`).
* Existing Firebase middleware — reused, but lazily; a missing Firebase config fails **closed** (503) instead of crashing.

## 2. Architecture

```
React page (/clinical-intelligence)          Express (server.js mounts the module twice: /clinical-intelligence and /api/clinical-intelligence)
 └ zustand store (memory only)                └ http/routes.js  ── auth (server-side) ── RBAC ── validation (zod, strict)
    └ api.ts (fetch, Bearer token)               └ service/clinicalIntelligenceService
                                                     ├ ContextProvider  (interface; DemoContextProvider built in)
                                                     ├ engine/  normalize → redFlags · investigations · medications · considerations · summary/gaps · timeline
                                                     ├ AIProvider adapter (none | mock | anthropic)  → safety/aiValidation (gate)
                                                     ├ AnalysisStore (immutable snapshots)  + review event log (append-only)
                                                     └ AuditSink (metadata only)
```

## 3. Data flow

1. Client obtains a session (demo: `POST /session`; firebase mode: existing ID token).
2. `POST /analyze {patientId | context, options.useAI}` → validate → resolve context → normalise (every fact gets a source ref) → run engines → *(optional)* AI → gate → immutable analysis, `reviewStatus = needs_review`.
3. Client renders tabs from the analysis. `POST /analyses/:id/review` (doctor only) appends a review event; the analysis snapshot is never edited.

## 4. API

Base path: `/api/clinical-intelligence` (also mounted at `/clinical-intelligence`). All bodies JSON. Errors: `{ success:false, error:{ code, message, details?, requestId } }` — no stacks, no echoed input.

| Method & path | Roles | Purpose |
|---|---|---|
| `GET /status` | public | mode, auth mode, AI provider name (no secrets) |
| `POST /session` | public, **demo auth mode only** | `{role, displayName?, hospitalId?}` → signed short-lived token |
| `GET /demo/patients` | DOCTOR, NURSE | list synthetic patients |
| `GET /patients/:id/context` | DOCTOR, NURSE | validated clinical record |
| `POST /analyze` | DOCTOR, NURSE | `{patientId}` **or** `{context}` (+ `options.useAI`, default `false`) → analysis |
| `GET /analyses/:id` | DOCTOR, NURSE | analysis + current review state |
| `GET /timeline/:patientId` | DOCTOR, NURSE | timeline only |
| `POST /analyses/:id/review` | **DOCTOR** | `{itemId, decision: accepted|rejected|modified, note?, modifiedText?}` |
| `GET /analyses/:id/audit` | DOCTOR, ADMIN | audit metadata (no clinical content) |

Status codes: 400 invalid JSON · 401 unauthenticated · 403 role · 404 not found / other hospital · 413 too large · 422 validation · 429 rate limit · 502 provider returned invalid data · 503 provider/auth unavailable · 500 generic.

## 5. Data models (`contracts/schemas.js`)

`ClinicalPatientContext` = `patient` · `encounters[]` (`ClinicalEncounter` with `ClinicalSymptom[]`, vitals, `ClinicalObservation[]`, notes, follow-up) · `allergies` · `medications` · `history` · `investigations[]` (`ClinicalInvestigation`).

* Allergies / medications / history are **record lists**: `{status: documented | none_known | not_provided, items[]}`. "Not provided" is structurally different from "none known", and status/items must agree.
* Symptoms need an explicit `present: true | false | "unknown"`.
* Reference ranges must be `source: "lab_reported"` — the engine never invents ranges. Units are preserved verbatim.
* All objects are `.strict()`: unknown keys (e.g. `reviewStatus`, `approvedBy`) are rejected.

Output: `ClinicalAnalysis` → `summary` (record-derived) · `findings[]` (`ClinicalInsight`/`ClinicalAlert`, one shape) · `investigations` · `medicationChecks` · `timeline` (`ClinicalTimelineEvent[]`) · `ai` metadata (`ClinicalAIResponse` status) · review state (`ClinicalReview`).

Every finding: `origin` (`rules`|`ai`), `severity`, optional `urgency`, `statement`, `explanation{what, why, sources[], missing[], action}`, resolved `evidence[]`, `reviewRequired`. `assertExplained()` refuses to emit a finding lacking any part.

## 6. AI architecture

`ClinicalIntelligenceService → AIProvider adapter → provider` (`providers/aiAdapter.js`). Providers: **none**, **mock** (fixed template, *not* a language model), **anthropic** (optional). AI is never called unless `options.useAI` is true.

Safety gate (`safety/aiValidation.js`) — model output is untrusted and accepted only if it: parses as JSON · matches a strict schema (no review/approval fields) · cites only refs that exist in the record · contains no definitive-diagnosis, prescriptive or "approved" language · introduces no number absent from the record. Otherwise it is **rejected with a reason code and nothing replaces it**. Requests are de-identified first (name removed, id pseudonymised).

## 7. Safety model

Never fabricates data · deterministic red-flag rules (structured fields only; free text is not keyword-scanned, avoiding negation errors) · unknown/contradicted/negated entries never fire rules · adult vital thresholds only when age ≥ 16 is known · checks that cannot run are reported as **not performed** · considerations use "may be consistent with", show evidence coverage (not probability) and what is missing · medication output is "Review required" and never a prescription · reviewer identity/time come from the verified session, only DOCTOR may review, output is never edited (modifications stored alongside) · AI output is visually (dashed violet frame, "AI-generated" tag) and structurally (`origin:"ai"`) distinct.

## 8. RBAC

Enforced server-side on every route. DOCTOR: all incl. review · NURSE: view + analyse · ADMIN: audit metadata only · all others: none. Analyses are scoped by `hospitalId` (other hospital → 404). *Demo auth*: HMAC-signed 1 h session; role in the token is verified on each request (forged/edited/expired → 401). *Firebase mode*: existing middleware; requires `role` and `hospitalId` claims.

## 9. Environment variables

See `backend/clinical-intelligence/.env.example`. All optional. Key ones: `CLINICAL_DEMO_MODE`, `CLINICAL_AUTH_MODE`, `CLINICAL_SESSION_SECRET`, `CLINICAL_AI_PROVIDER`, `ANTHROPIC_API_KEY`, `CLINICAL_AI_MODEL`, `CLINICAL_RATE_LIMIT_PER_MIN`. Frontend: existing `VITE_API_BASE_URL`.

## 10. Demo mode

Six synthetic patients (`CI-DEMO-001…006`): normal · abnormal investigations · medication/allergy conflict · incomplete record · multiple encounters · red flags. Run:

```bash
# terminal 1
cd backend && npm install && npm start          # http://localhost:5000  (no .env, DB, Firebase or AI key needed)
# terminal 2
npm install && npm run dev                       # http://localhost:5173
```
Sign in with role **Doctor** (or Nurse) → sidebar **Clinical Intelligence** → pick a patient → **Run clinical intelligence**. Tick "Include an AI-drafted narrative" to see the mock provider's clearly-labelled output.

## 11. Testing

```bash
cd backend && npm test               # unit + integration + safety (node:test, no extra deps)
cd backend && npm run test:unit | test:integration | test:safety
npm test                             # frontend UI tests (vitest + Testing Library, jsdom)
node backend/clinical-intelligence/scripts/exportUiFixtures.js   # regenerate UI fixtures from the real engine
```

## 12. Known limitations

* **Demo auth is not identity proofing.** In demo mode anyone who can reach the API can mint any role. It mirrors the existing role-picker login but is verified per request. Never expose demo mode publicly; it is off by default when `NODE_ENV=production`.
* **In-memory storage.** Analyses, reviews and audit events vanish on restart; single-process only (set `CLINICAL_SESSION_SECRET` if you ever run more than one).
* **Rule sets are small, hand-curated demo sets, not clinically validated** (vital thresholds, ~17 interaction rules, class tables, 5 consideration patterns). Not a licensed drug database.
* **Structured input only.** Free-text is displayed but not parsed by rules. There is no record-entry form in the UI (the API accepts an ad-hoc `context`), and no document-upload/OCR path.
* **Anthropic provider is untested against the live API** (tested with a stubbed `fetch`). De-identification cannot remove identifiers typed into free text, so external AI is opt-in and off by default.
* **Firebase mode is untested against real Firebase** (tested with a fake middleware and with the real middleware without config → fails closed).
* **No real-browser QA.** UI verified with jsdom tests, lint, type-check of the new files and a production build; responsive layout and dark mode were not visually inspected.
* Pre-existing problems outside Part 4 are untouched: unauthenticated `/patients` routes, open `cors()`, unmounted/broken pharmacy, billing and hospital code, client-only role selection.

## 13. Future integration points

* `ClinicalContextProvider` (`providers/contextProvider.js`): implement `{name, list(), get(patientId)}` returning a `ClinicalPatientContext`; pass via `createClinicalIntelligenceModule({ contextProvider })`.
* `AIProvider` adapter: implement `generate({context, sources, allowedRefs}) → {raw, model}`.
* Storage: `AnalysisStore`/`createAuditSink` are small interfaces — swap for a database adapter.
* Auth: `createAuthenticator` accepts a `firebaseLoader`; map any identity provider to `{id, role, name, hospitalId}`.
* Rules: `data/referenceData.js` is the single place to extend or replace the rule tables.
