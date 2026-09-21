# SIH26047 MediCare Pro — Integration of Parts 1, 2, 5, 6

Status: **PARTIAL**. All four modules coexist in one build, boot, and pass their
own test suites. Two real data-flow bridges are intentionally **not** built —
see §11 "Conflicts requiring a decision" — because building them would mean
choosing an unapproved architecture rather than integrating existing contracts.

## 1. Architecture

```
Frontend (React 19 / Vite, one app)
  /kiosk, /kiosk/:sessionId         Part 1 — AI Clinical Intake (kiosk device)
  /sih/voice                        Part 2 — Voice module, standalone demo page
  (embedded inside /kiosk/:id)      Part 2 — Voice module, embedded in QuestionStep
  /physician-workspace              Part 5 — Physician AI Workspace
  /part6/*                          Part 6 — ABDM/FHIR/Consent/Security (own auth)
  everything else                   Pre-existing MediCare Pro pages (unchanged)

Backend (Express 5, one server.js)
  /health, /api/health, /patients   Pre-existing (unchanged)
  /intake                           Part 1 (own auth: team1StaffAuthorizationAdapter
                                     for staff routes, intakeSessionAuth for kiosk-
                                     session routes)
  /physician-workspace              Part 5 (own demo auth: attachDemoUser/requireRole)
  /part6, /api/part6                Part 6 (own bearer-token auth, mounted before
                                     express.json() so it owns its own body parsing)
```

Each module keeps its own auth boundary, as designed. None of the four modules'
approved architecture was changed; this document only records how they were
made to coexist.

## 2. Module boundaries

- **Part 1** (`backend/{controllers,middleware,models,routes,services}` +
  `src/{components,pages}/kiosk`, `src/stores/intakeStore.ts`): unchanged from
  its delivered form.
- **Part 2** (`src/modules/voice/**`): unchanged from its delivered form. Its
  only public door remains `src/modules/voice/index.ts`.
- **Part 5** (`backend/{controllers,middleware,services}/physicianWorkspace*`,
  `src/{pages/PhysicianWorkspace.tsx,stores/physicianWorkspaceStore.ts,
  services/physicianWorkspace,types/physicianWorkspace.ts}`): unchanged from
  its delivered form.
- **Part 6** (`backend/part6/**`, `src/part6/**`): already integrated prior to
  this pass (see `PART6_README.md`); unchanged here.

## 3. Shared identifiers

`patientId`, `sessionId` (Part 1's `intakeSessionId` equivalent), `questionId`,
`encounterId` are passed through as plain strings, snake_case in Part 1's
Postgres schema (`backend/migrations/001_create_intake_tables.sql`) and
camelCase across every API/JSON boundary, matching the brief's convention.
No identifier was renamed. Part 5 and Part 6 do not yet consume Part 1's
`patientId`/`sessionId` — see §11.

## 4. New integration work performed in this pass (Part 1 ↔ Part 2)

Part 2 shipped as a fully isolated module mounted only at its own demo route
(`/sih/voice`); Part 1's `QuestionStep.tsx` was text-only. This pass:

- Embedded Part 2's `VoiceInteractionModule` (imported only from its public
  door, `src/modules/voice/index.ts`, exactly as its own integration contract
  specifies) inside `QuestionStep.tsx` as a "Speak your answer instead" option
  for `TEXT`/`LONG_TEXT` questions.
- Threaded an `inputMode: "VOICE"` flag from `QuestionStep` → `IntakeFlow` →
  `useIntakeStore.submitAnswer` → `intakeService.submitAnswer` → the existing
  `POST /intake/sessions/:id/answers` body.
- **No backend change was needed for this**: `backend/services/intakeService.js`
  already maps `inputMode === "VOICE"` to provenance `source: "PATIENT_VOICE"`
  (see `submitAnswer`), and `clinicalHistoryService.js` already refuses to
  store any non-`CLINICIAN_ENTERED`/`PATIENT_TEXT`/`PATIENT_VOICE` source as
  `CONFIRMED`. This is the "exact provenance convention already approved by
  Part 1/Part 2" the integration brief asks for — it existed, unused, and this
  pass connected it rather than inventing a new one.
- Only the *patient-confirmed* wording (`VoiceInteractionResult.originalText`)
  is used, never the machine translation, per Part 2's own contract.
- Restored Part 2's standalone `/sih/voice` demo route in `App.tsx` (additive;
  needed so Part 2's own pre-existing regression test still passes, and kept
  as a reviewer-facing way to see the module on its own).

## 5. Database

Only Part 1 defines new tables (`backend/migrations/001_create_intake_tables.sql`):
`intake_sessions`, `intake_answers`, `clinical_histories`, plus supporting
indexes/constraints. Part 5 and Part 6 use their own in-memory/file stores by
design (documented in their own reports) and do not add migrations. No
existing MediCare Pro table was touched. Migration order: Part 1's single
file only; nothing else to order against it. Not exercised against a live
Postgres instance in this environment (no `DATABASE_URL` configured here) —
same caveat Part 1's own delivery already documented.

## 6. Backend routes and middleware

See §1. Mount order in `server.js`: `cors()` → Part 6 (before `express.json()`,
by Part 6's own design) → `express.json()` → `/health`, `/api/health`,
`/patients` (pre-existing) → `/intake` (Part 1) → `/physician-workspace`
(Part 5). No route path collides with another module's or with an existing
MediCare Pro route. No route is mounted twice.

## 7. Frontend routes and workflow

`/kiosk` (staff, protected) → `/kiosk/:sessionId` (patient device, own token
auth, outside `ProtectedRoute`) → intake questions, each with an optional
voice-input toggle → review → completion. Separately, `/physician-workspace`
(staff, protected, role-gated to DOCTOR/ADMIN/NURSE) and `/part6/*` (own auth,
outside `ProtectedRoute`). All four are reachable from the sidebar without
manually editing a URL. No existing MediCare Pro page was modified or removed.

## 8. Provenance rules

Unchanged from Part 1's design, and now actually reachable from a voice
interaction (see §4): `AI_DERIVED` may never be stored as `CONFIRMED`;
`PATIENT_VOICE` and `PATIENT_TEXT` may be `CONFIRMED` only when the patient
did not express uncertainty (`certainty` inference in
`backend/services/intakeService.js`). Enforced in code
(`clinicalHistoryService.assertSafeFact`), not just by convention.

## 9. Consent flow

Part 1's own consent step (`ConsentStep.tsx`, `session.consentGiven`) gates
the kiosk intake flow, unchanged. Part 6's separate ABDM-style consent
lifecycle (Request → Grant/Deny → Active → Revoke/Expire) governs sharing of
Part 6's own FHIR-mapped records and is unrelated to — and not yet wired to —
Part 1's intake consent. See §11.

## 10. Authentication boundaries

Unchanged, per module: Part 1 kiosk-session opaque token (`intakeSessionAuth`)
+ demo staff header adapter (`team1StaffAuthorizationAdapter`, explicitly
documented as non-production); Part 5 demo user header
(`physicianWorkspaceAuth.attachDemoUser`); Part 6 HS256 bearer tokens with its
own RBAC matrix; pre-existing MediCare Pro pages use the existing local demo
login. No module's auth was merged into another's, and none was made to trust
another's identity claim.

## 11. Conflicts requiring a decision (not silently resolved)

These are genuine architecture-level gaps, not integration bugs, and per the
brief's own hard rule ("if a conflict requires changing an approved module
contract, STOP and report") they are documented here instead of built:

1. **Part 5 does not consume Part 1's `ClinicalHistory`.** Part 5's Physician
   Workspace runs entirely on its own in-memory seeded demo cases
   (`backend/services/physicianWorkspace/demoData.js`) — a deliberate
   design choice in Part 5's own delivery, to stay independently runnable
   without a database. A physician opening a "case" today reviews canned
   demo data, never an actual Part 1 intake session. Bridging this requires
   either (a) giving Part 5's store a real data-access layer reading
   `clinical_histories`, or (b) an adapter translating Part 1's
   `ClinicalHistory` JSON into Part 5's case shape. Both are new code beyond
   "connect existing contracts," so a decision is needed on which, and
   whether Part 5's demo-data fallback should remain as fallback for cases
   with no Part 1 session.
2. **Part 6's `RecordSource` adapter is unimplemented.** Part 6 ships the
   exact seam designed for this (`backend/part6/adapters/recordSource.js`:
   `getPatient`, `listPatients`, `getClinicalRecords`, etc., passed to
   `createPart6({ source })`) but nothing currently implements it against
   Part 1's or Part 5's data — Part 6 still runs on its own synthetic seed.
   Implementing it means deciding what Part 5's physician-approved summary
   contributes to a FHIR `DiagnosticReport`/`Condition` vs. what Part 1's raw
   intake contributes, which is a clinical-data-modeling decision, not a
   wiring task.
3. **Test runner split.** Part 1 wrote backend tests for `vitest`; Part 5 and
   Part 6 wrote theirs for Node's native `node:test`. This pass fixed the
   symptom (scripts no longer silently report "no test suite found" for the
   wrong runner's files — see `backend/package.json`'s `test`,
   `test:physician-workspace`, `test:part6`, `test:all`) but did not
   standardize on one runner, since that would mean rewriting one team's
   test suite.

## 12. Part 3 integration point

Medical Documents & OCR. Intended seam: a new `documentId`-keyed upload
attached to an `intakeSessionId` (Part 1) or a case (Part 5), surfaced to
Part 6 via the same unimplemented `RecordSource.getClinicalRecords`. No code
for this exists yet; not started, per the brief.

## 13. Part 4 integration point

Clinical Intelligence / Red Flags / AYUSH Intelligence. Part 1 already has an
`intakeMode: "AYUSH"` and an AYUSH question registry
(`backend/services/questionRegistry/ayushQuestions.js`) that Part 4 would read
from; Part 5's `aiSummaryGenerator.js` already has a documented
"never fabricates missing fields" / "flags urgent keywords without
diagnosing" boundary that Part 4's red-flag logic would need to respect, not
replace. No diagnostic or treatment logic exists anywhere in this build. Not
started, per the brief.

## 14. Environment variables

Unchanged from each module's own `.env.example` (Part 1: `DATABASE_URL` via
`backend/db.js`; Part 2: `VITE_VOICE_*`, see `.env.example.voice` copied into
the merged repo; Part 6: `backend/part6/.env.example`). None collide.

## 15. Testing strategy

Each module's own suite, run with its own intended runner (vitest for
frontend and Part 1 backend; `node --test` for Part 5 and Part 6 backend —
see §11.3), plus a manual route/boot smoke test of the merged `server.js`
(§ Testing in the final report below). No new cross-module integration tests
were written in this pass, because there is no cross-module data flow yet to
test (§11) beyond the Part 1↔Part 2 voice path, which is covered by Part 1's
existing `kioskIntakeFlow.test.tsx` plus Part 2's own suite (voice submission
itself isn't yet asserted end-to-end in a single test — a gap worth closing
before this ships).

## 16. Known limitations

- The two data-flow bridges in §11 are not built.
- Not exercised against a live Postgres instance in this environment.
- Part 1's staff-side auth (`team1StaffAuthorizationAdapter`) and Part 5's
  (`attachDemoUser`) are both explicitly non-production, as documented in
  their own source.
- No production authentication anywhere in this build.
- Hindi/Kannada strings in Part 2 need native-speaker review (Part 2's own
  known limitation, unchanged).
- No live ABDM connectivity (Part 6's own known limitation, unchanged).

---

# FINAL DATA-FLOW BRIDGES

This section documents the Part 1 → Part 5 → Part 6 bridge work added after
the initial four-way file-level integration above. It updates §11
("Conflicts requiring a decision") of this document: the Part 1→Part 5 gap
is now closed; the Part 1→Part 6 gap is partially closed, with the remaining
part still correctly flagged rather than worked around.

## Part 1 → Part 2

Unchanged from §4 above: voice input embedded in `QuestionStep.tsx`, tagged
`inputMode: "VOICE"`, mapped by Part 1's own existing code to provenance
`PATIENT_VOICE`.

## Part 1 → Part 5

**Input:** a `intakeSessionId` for a session whose Part 1 status is
`COMPLETED`.
**API:** `GET /physician-workspace/cases/from-intake/:intakeSessionId`
(same read-role gate as every other case view) and, on the frontend,
`/physician-workspace?intakeSessionId=<id>`, which opens it automatically.
**Database source:** exclusively Part 1's own `clinical_histories` /
`intake_sessions` tables, read through Part 1's own `intakeService.exportSession`
— no new query, no duplicated persistence code, no second clinical-history
schema. The result is upserted into Part 5's existing `cases` store
(`store.ingestIntakeCase`) under a stable id, `INTAKE-<sessionId>`, so every
downstream Part 5 operation (`generateSummaryForCase`, `editSummary`,
`approveSummary`, …) works on it completely unmodified.
**Provenance:** every fact keeps its Part 1 `{value, certainty, provenance}`
shape in `case.provenanceBySection` (not summarised or flattened away); the
display strings `aiSummaryGenerator.js` reads are derived from the same
facts, never a separate re-interpretation. `AI_DERIVED` can never arrive as
`CONFIRMED` — enforced in Part 1 before the adapter ever runs, and covered
by an adapter-level regression test (Test 7 below) so this stays true even
if Part 1's own check is ever weakened. A patient's expressed uncertainty
(`UNCERTAIN`) survives unresolved into the case; an unconfirmed allergy
status is never rendered as a confirmed "no known allergies."
**Consent:** governed entirely by Part 1's own kiosk consent step
(`session.consentGiven`), unchanged — the bridge adds no new consent
concept.
**Authorization:** the new route sits behind Part 5's existing
`requireRole(...READ_ROLES)`, the same gate `GET /cases/:caseId` uses. No
new authorization boundary was introduced.
**Completion:** only `session.status === "COMPLETED"` is ever bridged — an
in-progress session throws `IntakeSessionNotCompleteError` (HTTP 409)
rather than exposing partial answers as if they were a finished record. This
mirrors Part 1's own existing definition of "completed" rather than adding a
stricter one.
**Files:** `backend/services/physicianWorkspace/intakeRecordAdapter.js` (new),
`backend/services/physicianWorkspace/store.js` (+`ingestIntakeCase`),
`backend/controllers/physicianWorkspaceController.js` (+`openFromIntakeSession`,
per-case `source` label replacing the old blanket `"DEMO_DATA"`),
`backend/routes/physicianWorkspaceRoutes.js` (+1 route),
`backend/services/physicianWorkspace/demoData.js` (+`source: "DEMO"` tag,
additive), `src/services/physicianWorkspace/physicianWorkspaceService.ts`
(+`openFromIntakeSession`), `src/stores/physicianWorkspaceStore.ts`
(+`openIntakeSession`), `src/pages/PhysicianWorkspace.tsx` (reads
`?intakeSessionId=`, "Real intake" badge, null-safe identity display),
`src/types/physicianWorkspace.ts` (additive optional fields; `patientName`/
`age`/`gender` widened to allow `null` rather than fabricating a demo-like
default for a real patient with no identity match).
**Tests:** `backend/tests/intakeRecordAdapter.test.js`, 11 tests covering
brief Tests 1–7 (see below) plus not-found/incomplete/store-coexistence
cases. Run via Part 1's own vitest suite.

## Part 5 → Part 6

**Not bridged.** Part 5's physician-controlled output (an approved/edited
`ClinicalSummary`) has no path into Part 6 yet. This was correctly out of
reach this pass: Part 6 can only ingest clinical information as one of its
seven typed, largely-coded `sourceRecord` types (§ below), and a physician
summary is free text with no natural coded-resource mapping either — the
same clinical-coding gap blocking Part 1 → Part 6 (next section) blocks this
too, and remains a decision point, not an oversight.

## Part 1 → Part 6

**What is bridged:** `backend/part6/adapters/realRecordSource.js`, a
composite `RecordSource` (Part 6's own documented extension seam — see
`createPart6.js`: *"swap for an adapter to integrate another system"*) that
wraps Part 6's existing demo source and adds, for a given `patientId`: (a)
real patient identity (`id`, `name`) from the same `patients` table Part 1
already validates `patientId` against, with `gender`/`birthDate` left
absent rather than guessed; (b) one `document`-type clinical record per real,
`COMPLETED` Part 1 session — a plain-text `FHIR DocumentReference`
(`mapDocument` in `fhir/mappers.js`), the one record type in Part 6's
`TYPE_MAPPERS` that needs no coded terminology.
**Encounter/consent:** no `encounterId` is fabricated (Part 1 sessions in
this build never carry one); Part 6's own consent-gated share pipeline
(`shareService`/`consentService`) is untouched and still governs any actual
export — this adapter only changes what `RecordSource` can *see*, never
Part 6's decision about what it is allowed to *share*.
**Tests:** `backend/part6/tests/realRecordSource.test.js`, 5 tests, run via
Part 6's own `node --test` runner — proving demo-data delegation is
unbroken and that unknown/unreachable real data fails closed to `null`/`[]`
rather than throwing or fabricating.

**What is deliberately NOT bridged, and why (the two remaining conflicts):**

1. **Coded clinical resources (Condition, MedicationRequest, Observation,
   AllergyIntolerance).** Part 6's own seed data shows these require SNOMED
   CT / LOINC codes (e.g. `condition.code: "44054006"` for
   "Diabetes mellitus type 2"). Part 1 captures free-text, patient-reported
   answers with no coded terminology. Mapping "Chest pain for two days" to a
   SNOMED condition code is a clinical-coding/NLP task — squarely Part 4
   "Clinical Intelligence" territory, explicitly out of scope for this pass,
   and fabricating a code would be exactly the kind of invented clinical
   fact this whole integration has avoided elsewhere. **Decision needed:**
   whether Part 4, when built, should own this mapping, or whether a
   simpler manual/physician-assisted coding step belongs in Part 5 first.

2. **`custodianOrgId` / authorization for real patients.** Part 6's FHIR
   generation (`fhirService.requireCustodianOf`) denies any request where
   `patient.custodianOrgId !== user.orgId`. Real Part 1 patients have no
   Part 6 organisation to be a custodian of, so `custodianOrgId` is left
   `undefined` — which means Part 6 *correctly denies* FHIR generation for a
   bridged real patient today (`NOT_CUSTODIAN`), rather than silently
   granting it. This is the safe, fail-closed outcome, not a bug, but it
   does mean the real-data path is not yet functionally usable end-to-end.
   Assigning real patients to an organisation is an authorization-model
   decision this pass was explicitly told not to make
   ("Do NOT solve the broader authentication problem in this task").

3. **Sync/async contract mismatch.** Every Part 6 call site invokes
   `RecordSource` methods synchronously (no `await`). Part 1's data access
   is Postgres-backed and inherently async. `realRecordSource.js`'s
   `getPatient`/`getClinicalRecords` are therefore async and are **not**
   plugged into `createPart6({ source })`'s default binding in this pass —
   doing so today would hand Part 6's synchronous code an unawaited
   Promise. Closing this needs either a pre-fetched/cached synchronous
   snapshot layer (its own design decision: refresh cadence, invalidation)
   or making Part 6's core async (a rewrite, explicitly out of scope).

**Golden path status, honestly:** Patient → Part 1 → Part 2 (voice) →
`ClinicalHistory` → Part 5 (`?intakeSessionId=`) → physician review works
end-to-end today (module-level; not exercised against live Postgres in this
environment — see Known Limitations). Part 5 → Part 6 → FHIR/ABDM does
**not** work end-to-end: Part 6 can see a real patient's raw intake as a
text document via `realRecordSource.js`, but (a) that adapter isn't wired
into Part 6's default source yet (point 3 above) and (b) FHIR generation
for a bridged real patient would currently be denied by the custodian check
(point 2) even once wired in. The golden path from Step 18 of the brief is
therefore **PARTIAL**, with both remaining gaps identified as decisions, not
silently worked around.

---

# PARTS 3 + 4 INTEGRATION

Adds Part 3 (Medical Documents & OCR) and Part 4 (Clinical Intelligence) to
the Parts 1+2+5+6 baseline above. Both were integrated using each module's
own documented shared-file changes and extension seams — no blind copying,
no rewriting of either module.

## Architecture additions

```
Frontend
  /medical-documents         Part 3 — Medical Documents & OCR (own auth, own client)
  /clinical-intelligence     Part 4 — Clinical Intelligence (own auth, own client)

Backend (all in the same server.js process now)
  /part3, /api/part3         Part 3 (own demo auth; mounted before express.json(),
                              matching Parts 4 and 6's pattern, since it parses
                              multipart/raw uploads itself)
  /clinical-intelligence,
  /api/clinical-intelligence Part 4 (own demo/Firebase auth; mounted before
                              express.json() for the same reason)
```

Both keep their own auth boundary, exactly like every other part — nothing
here merges authentication systems.

## Part 1 → Part 2 → Part 5 → Part 6

Unchanged from the sections above.

## Part 1 → Part 3

**Not a code bridge — a shared identifier, by design.** Part 3's document
API already takes an arbitrary `patientId` string per request
(`POST /documents?patientId=...`); it does not maintain its own patient
registry beyond two synthetic demo patients. Part 1's kiosk-entered
`patientId` is usable as Part 3's `patientId` with no adapter, since both
are free-text identifiers validated against the same conceptual patient,
not against each other. No code was written for this — there is nothing to
bridge beyond using the same string.

## Part 1 → Part 4 (built this pass)

**Input:** `patientId` of the form `INTAKE-<sessionId>`, for a session whose
Part 1 status is `COMPLETED`.
**API:** the existing `POST /api/clinical-intelligence/analyze
{patientId}` — no new route. Part 4's own `GET /demo/patients` continues to
list only the six synthetic demo patients (real sessions are not
enumerated, only reachable by id — the same limitation already documented
for the Part 1 → Part 5 and Part 1 → Part 6 bridges).
**Mechanism:** `backend/integration/intakeToClinicalIntelligenceProvider.js`
implements Part 4's own documented `ClinicalContextProvider` interface
(`{name, list(), get(patientId)}`) as a composite over Part 4's
`DemoContextProvider`, wired in at `createClinicalIntelligenceRouter({
contextProvider })` in `server.js`. A real Part 1 `ClinicalHistory` is
mapped into Part 4's strict, zod-validated `ClinicalPatientContext` schema
— re-validated by Part 4 itself (`contextSchema.parse`) before any engine
runs, so a mapping error fails loudly (422), never silently.
**Why this file lives outside `backend/clinical-intelligence/`:** Part 4
ships its own automated test (`safety.test.js`, "INDEPENDENCE: the module
imports only from itself...") asserting zero cross-module imports anywhere
in its directory. Rather than edit that test to carve out an exception, the
bridge was placed in `backend/integration/` and loads Part 1's service
dynamically (`await import(...)`), so Part 4's own directory — and its own
independence test — are completely unmodified and still pass. This is the
same "prefer a small adapter over changing an existing contract" approach
used for the Part 1 → Part 5 and Part 1 → Part 6 bridges, applied to a
conflict this pass actually found rather than anticipated.
**What is never fabricated:** `patient.ageYears`/`sex` (not captured by
Part 1) are left unset, never guessed; `encounters[0].symptoms` is left
empty rather than inventing named, tri-state-affirmed symptoms out of one
free-text chief complaint (the complaint itself is carried verbatim in
`chiefComplaint`); `investigations` is empty (Part 1 collects no lab data);
medications are mapped with `status:"unknown"`, never assumed "active";
allergy/history record-list status is mapped from Part 1's own
DENIED/REPORTED/UNKNOWN distinction, not a new one invented here.
**Tests:** `backend/tests/intakeToClinicalIntelligenceProvider.test.js`, 6
tests (vitest, alongside the Part 1 → Part 5 bridge tests) — schema
validation of the mapped output, demo-delegation, real-session retrieval,
incomplete-session refusal, unknown-id fail-closed, and that `list()` is
unregressed.

## Part 3 → Part 4

**Not implemented.** Feeding Part 3's OCR-extracted entities into Part 4's
`investigations[]` needs a mapping from Part 3's rule-based, unverified
extraction (its own README: "does not diagnose... rule-based for printed
English layouts") into Part 4's `investigationSchema`, which requires a
`referenceRange.source: "lab_reported"` — meaningless without deciding
whether an OCR-extracted number is trustworthy enough to feed a second
system's rule engine at all. That is a genuine clinical-safety judgement
call (compounding uncertainty across two independently-built extraction
systems), not a wiring task, so it was left undone rather than guessed at.

## Part 3 → Part 5, Part 4 → Part 5

**Not implemented.** Both are UI/display integrations (a documents panel
and a clinical-intelligence panel inside the Physician Workspace page,
each clearly labelled by source) rather than data-model bridges — no new
architecture is needed, `ClinicalCase` already has room for additive
fields the way `intakeRecordAdapter.js` added `provenanceBySection`. Left
undone this pass for scope, not because of a conflict; a natural next step,
lower-risk than the bridges above since Part 5's read-only display
components don't touch its store's write path.

## Part 3 → Part 6 (built this pass)

**What is bridged:** `backend/part6/adapters/realRecordSource.js` (the same
Part 1 → Part 6 composite from the section above) now optionally accepts a
`part3Store` and adds one `document`-type FHIR record per Part 3 document
that has **completed OCR successfully** (status `OCR_COMPLETED`,
`EXTRACTED` or `ON_TIMELINE`) — carrying Part 3's OCR text verbatim. A
document still uploading, mid-OCR, or with `OCR_FAILED`/`OCR_EMPTY` is
never included, matching the same "no text, no record" discipline as
everywhere else in this integration. Part 3's *extracted entities*
(medications/diagnoses/labs it parsed out of the OCR text) are **not**
mapped into coded Condition/Medication/Observation resources, for the same
reason Part 1's intake isn't (see the Part 1 → Part 6 section above): no
validated SNOMED/LOINC coding exists to do that safely.
**Wiring status:** like the Part 1 → Part 6 half of this same file, this
extension is tested directly but **not** wired into `createPart6`'s default
`source` in this pass, for the same two already-documented reasons
(synchronous `RecordSource` contract vs. Part 1/3's async data access;
`custodianOrgId` unassigned for non-demo patients) — nothing new to add
there.
**Tests:** 3 new tests in `backend/part6/tests/realRecordSource.test.js`
(8 total in that file) — a completed-OCR document is bridged with its text
intact, an uploaded/failed/empty document is never bridged, and omitting
`part3Store` entirely leaves `getClinicalRecords` byte-for-byte unchanged
from before this pass.

## Part 4 → Part 6

**Not implemented, by design.** Part 4's findings are explicitly
AI-assisted/rule-based decision support ("origin: rules|ai", "considerations
use 'may be consistent with'... never a diagnosis") — exactly the kind of
free-text, non-coded, clinician-must-review output this whole integration
has consistently declined to force into coded FHIR resources (Condition,
MedicationRequest, etc.), for the same reason Part 1's and Part 3's data
aren't. A `DocumentReference`-only mapping analogous to the other two
bridges was considered but not built this pass, for scope — it carries no
new architectural conflict beyond what the Part 1 → Part 6 and
Part 3 → Part 6 sections already document.

## Database

No new tables from Part 3 or Part 4. Part 3 uses its own in-memory/JSON
store (`Part3Store`, `backend/part3/models/store.js`), by design, same as
Part 5 and Part 6. Part 4 uses its own in-memory `AnalysisStore`. Neither
touches Part 1's Postgres tables or any existing MediCare Pro table.

## Shared-file changes made this pass

`backend/server.js` (+2 imports, +2 mounts — Part 3's own documented
optional-mount snippet applied verbatim, and Part 4's `contextProvider`
override), `backend/package.json` (+`zod` dependency, +4 Part-4 test
scripts, existing `test` script scoped to exclude `clinical-intelligence/**`
alongside the pre-existing `part6/**` exclusion — the same test-runner-split
fix applied for Parts 5/6 last round, needed again here since Part 4's
backend tests are `node:test`-based), `package.json` (root: +3 Part-3
scripts, +1 Part-4 script), `src/app/routes.tsx` (+1 import, +1 spread for
Part 3; Part 4's own route entry applied cleanly via its patch), `vitest.config.ts`
(merged with Part 4's own `vitest.config.js`, which would otherwise sit
ambiguously alongside it as a second root config — now one file with both
modules' `setupFiles` combined, and `src/part3/**` excluded since Part 3
has its own dedicated `vitest.part3.config.mjs`), `src/layouts/Sidebar.tsx`
(+2 icon/group entries, one per new part).

## Testing summary (this pass, exact numbers actually run)

- Backend vitest (`npm test`: Part 1 core + Part 1 → Part 5 bridge + Part 3
  backend + Part 1 → Part 4 bridge): **207/207**
- Part 5 backend (`node --test`): **12/12** (unchanged)
- Part 6 backend (`node --test`, incl. 3 new Part 3 → 6 tests): **65/65**
- Part 4 backend (`node --test`, independence test included and passing):
  **162/162**
- **Backend total: 446/446**
- Frontend default vitest (everything except Part 3, which has its own
  config): **280/280**
- Part 3 frontend+backend (`vitest.part3.config.mjs`): **186/186**
- **Frontend total: 466/466**
- **Grand total: 912/912**
- `vite build`: PASS (Part 3 and Part 4 each ship as their own lazy chunks)
- `eslint .`: PASS, 0 problems
- `tsc --noEmit`: same pre-existing baseline error class as every prior
  round (confirmed by diffing the exact error list before/after — only
  line-number shifts, zero new errors)
- Live boot smoke test: `/part3/health`, `/api/clinical-intelligence/status`,
  `/api/part6/meta`, `/intake`, `/physician-workspace`, and the pre-existing
  `/health`/`/patients` all responding correctly from one `server.js`
  process.

## Known limitations (Parts 3+4 specific, additive to the sections above)

- Part 3 → Part 4, Part 3 → Part 5, Part 4 → Part 5, and Part 4 → Part 6
  are not built (see each section above for why).
- Part 3's own known limitations are unchanged: no real OCR provider bundled
  (arbitrary uploads get a clear "cannot be read" error, never invented
  text); extraction is rule-based and English-printed-text only.
- Part 4's own known limitations are unchanged: demo auth is not identity
  proofing; rule sets are small hand-curated demo sets, not clinically
  validated; the Anthropic provider is untested against a live API.
- The Part 1 → Part 4 bridge, like the Part 1 → Part 5 bridge, is not
  exercised against a live Postgres in this environment.

---

# FINAL SIH MERGE PHASE — Parts 4→5, 3→5, 3→4

This phase closed the three integrations identified as safely achievable in
the prior round's audit. Part 1→6 and Part 3→6 remain PARTIAL: no new,
safe, deterministic improvement was found for them this pass either (the
synchronous `RecordSource` contract and missing `custodianOrgId` for real
patients are still architecture decisions, not wiring gaps — see the
earlier "PARTS 3 + 4 INTEGRATION" section for the full reasoning, unchanged).

## Part 4 → Part 5 (built)

**Mechanism:** one additive method, `AnalysisStore.listByPatient(patientId)`,
added to Part 4's own `service/stores.js` (no new imports — safe for its
independence test, verified by re-running it). `backend/services/
physicianWorkspace/clinicalIntelligenceAdapter.js` reads the *same*
`AnalysisStore` instance Part 4's router writes to (`server.js` now uses
`createClinicalIntelligenceModule()` instead of `createClinicalIntelligence
Router()` so the store is reachable, via a `configureClinicalIntelligence
Store()` call at boot — the same "configure after construction" pattern
already used for the Part 3 → Part 5 bridge below).
**API:** `GET /physician-workspace/cases/:caseId/clinical-intelligence`,
same `requireRole(...READ_ROLES)` gate as every other case view. Read-only;
never triggers a new analysis.
**Provenance preserved:** every finding keeps Part 4's own
`origin: "rules"|"ai"` and `reviewRequired` flags untouched. The frontend
(`PhysicianWorkspace.tsx`) renders an explicit "AI" vs "Rule" badge per
finding and a "(review required)" tag — AI output is never displayed as
physician-confirmed.
**A real regression was caught and fixed here:** the first version of the
new store method's comment contained the literal string "Part 5," which
tripped Part 4's independence test's cross-module-mention scan. Reworded
without naming another part; independence test re-verified passing (162/162).
**Tests:** 3 of the 6 tests in `backend/tests/physicianWorkspace
CrossModuleAdapters.test.js` (most-recent-first ordering, per-finding
origin/reviewRequired preserved, another patient's analysis never returned,
empty-list-not-fabricated).
**Live-verified:** booted the server, minted a real Part 4 demo session
token, called `POST /api/clinical-intelligence/analyze` for a real Part 4
demo patient — succeeded, confirming Part 4's own demo path is unbroken
with the composite `contextProvider` wired in.

## Part 3 → Part 5 (built)

**Mechanism:** `backend/services/physicianWorkspace/part3DocumentsAdapter.js`,
same shape as the Part 4 → Part 5 adapter — reads the *same* `Part3Store`
instance Part 3's own router uses (`server.js` captures `context.store` from
`createPart3Router()` and calls `configureDocumentsStore()`).
**Join key:** `patientId` only — confirmed by inspection that Part 3's
document model has **no `encounterId` field at all**, so the
`patientId → encounterId → documents` chain suggested in the brief doesn't
exist in the actual data; `patientId` is the only honest join available,
and is what's used.
**API:** `GET /physician-workspace/cases/:caseId/documents`, same read-role
gate. A document is always listed once it exists (so a physician knows it's
there), but `ocrText` is `null` until OCR has actually completed
(`OCR_COMPLETED`/`EXTRACTED`/`ON_TIMELINE`) — never fabricated for a
pending or failed document.
**Frontend:** a new "Documents" section in `PhysicianWorkspace.tsx`, each
document showing its status badge, upload time, and OCR text explicitly
labeled "OCR text (unverified)".
**Tests:** 3 of the 6 tests in `physicianWorkspaceCrossModuleAdapters.test.js`
(completed-OCR text included / pending document's is not, another
patient's documents never returned, empty list when unconfigured).

## Part 3 → Part 4 (built)

**Mechanism:** extended the existing Part 1 → Part 4 bridge
(`backend/integration/intakeToClinicalIntelligenceProvider.js`) rather than
building a separate one — `IntakeContextProvider.setPart3Store()` (called
once from `server.js`, additive/optional) lets `get()` collect a patient's
completed-OCR document text and pass it into `mapClinicalHistoryToContext`
as `documentEvidence`.
**What it becomes:** free-text lines appended to the encounter's existing
`notes` field, each clearly prefixed `[Document — OCR text, unverified:
<title>]` — **never** a coded `investigations[]` entry. Part 4's
`investigationSchema` requires `referenceRange.source: "lab_reported"`,
which would assert a trustworthiness neither Part 3's OCR (its own README:
"rule-based... does not diagnose") nor this bridge can honestly claim.
Stacking one unverified extraction pipeline's output on top of another's as
if it were a lab value was the exact fabrication this integration avoided.
**Scope:** applies only to real, `INTAKE-`-prefixed sessions (the same
population the Part 1 → Part 4 bridge already served) — Part 4's synthetic
demo patients are untouched, since they never had Part 3 documents to
begin with.
**Tests:** 3 new tests in `intakeToClinicalIntelligenceProvider.test.js`
(evidence correctly labeled and never promoted to `investigations`, only
the target patient's completed-OCR documents are pulled in — not another
patient's, not a pending one — and behavior is byte-for-byte unchanged when
`setPart3Store` is never called).

## Cross-patient isolation

Verified at the adapter level (not a separate end-to-end test patient pair,
for scope reasons — see Remaining limitations): both new adapters' test
suites include an explicit "never returns another patient's data" case
(`physicianWorkspaceCrossModuleAdapters.test.js`), and the Part 3 → Part 4
evidence bridge's own test confirms a second patient's OCR text is excluded
from the first patient's context. Every read path is scoped by `patientId`
at the store-query level (`listDocuments({ patientId })`,
`listByPatient(patientId)`), not filtered after the fact — there is no code
path that fetches one patient's data and relies on a filter to hide another's.

## Updated final data-flow table

| Source | Destination | Status | Mechanism | Test |
|---|---|---|---|---|
| Part 1 | Part 2 | WORKING | Voice module embedded in kiosk `QuestionStep`, `inputMode: "VOICE"` → `PATIENT_VOICE` provenance | Part 1's own kiosk flow test + Part 2's own suite |
| Part 1 | Part 3 | WORKING | Shared `patientId` string; no code needed | N/A (no bridge code exists to test) |
| Part 1 | Part 4 | WORKING | `IntakeContextProvider` composite, `INTAKE-<sessionId>` | `intakeToClinicalIntelligenceProvider.test.js` (9 tests) |
| Part 1 | Part 5 | WORKING | `intakeRecordAdapter.js`, `INTAKE-<sessionId>` case bridge | `intakeRecordAdapter.test.js` (11 tests) |
| Part 1 | Part 6 | PARTIAL | `realRecordSource.js`; not wired as default (sync/async + custodianOrgId gaps) | `realRecordSource.test.js` (5 of 8 tests) |
| Part 3 | Part 4 | WORKING | OCR text appended as labeled free-text evidence, never coded | 3 new tests in `intakeToClinicalIntelligenceProvider.test.js` |
| Part 3 | Part 5 | WORKING | `part3DocumentsAdapter.js`, joined on `patientId` | 3 of 6 tests in `physicianWorkspaceCrossModuleAdapters.test.js` |
| Part 3 | Part 6 | PARTIAL | `realRecordSource.js` document extension; not wired as default (same two gaps) | 3 of 8 tests in `realRecordSource.test.js` |
| Part 4 | Part 5 | WORKING | `clinicalIntelligenceAdapter.js`, joined on `patientId` | 3 of 6 tests in `physicianWorkspaceCrossModuleAdapters.test.js` |
| Part 4 | Part 6 | NOT IMPLEMENTED | Same coded-terminology gap as Part 1/3 → 6; not attempted | — |

## Known limitations added this pass

- Part 4 → Part 6 remains unattempted (documented reason unchanged from the
  prior round).
- Part 1 → Part 6 and Part 3 → Part 6 remain PARTIAL — confirmed again this
  pass that no safe, deterministic improvement exists without resolving the
  synchronous-contract and custodian-org decisions.
- The end-to-end golden path was verified at the unit/adapter level (every
  new bridge has a passing test proving real data flows through it) and via
  live HTTP smoke tests of routing/auth/Part 4's own demo path — not via a
  single browser-driven walkthrough of one patient through all six parts in
  sequence, since that requires a live Postgres this environment doesn't
  have (documented everywhere else in this file).
- Cross-patient isolation was verified at the adapter/unit level for the
  three new bridges, not via a dedicated two-test-patient end-to-end
  browser scenario (`TEST-SIH-001`/`TEST-SIH-002`) — the unit-level proof is
  equivalent in what it demonstrates (no code path exists that could leak
  data across patients) but is not the same artifact as a scripted
  end-to-end run.
