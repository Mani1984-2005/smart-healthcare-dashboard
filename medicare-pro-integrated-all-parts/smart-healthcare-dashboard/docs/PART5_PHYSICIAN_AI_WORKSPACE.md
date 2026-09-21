# Part 5 — Physician AI Workspace

SIH26047 · MediCare Pro · Standalone Module 5 of 6

## 1. Overview

The Physician AI Workspace lets a physician open a case, review the
structured clinical information on file, generate an **AI-assisted draft
summary**, edit it, and then **approve or reject** it. The physician is
always the decision-maker — the AI never diagnoses, prescribes, orders
tests, or produces a final clinical artifact on its own.

## 2. Problem solved

Physicians spend significant time re-reading and mentally organising
scattered clinical notes before every review. This module turns already-
available structured fields (complaint, history, medications, allergies,
vitals, labs) into one organised draft the physician can scan, correct, and
sign off on — with every step captured in an audit trail.

## 3. Architecture

```
Frontend (src/)                      Backend (backend/)
─────────────────────                ─────────────────────
pages/PhysicianWorkspace.tsx    ───▶  routes/physicianWorkspaceRoutes.js
stores/physicianWorkspaceStore  ───▶  controllers/physicianWorkspaceController.js
services/physicianWorkspace/*        middleware/physicianWorkspaceAuth.js (demo)
  ├─ physicianWorkspaceService        validations/physicianWorkspace.validation.js
  ├─ localDemoEngine  (offline AI)    services/physicianWorkspace/
  ├─ localDemoStore   (offline flow)    ├─ aiSummaryGenerator.js (demo AI)
  └─ localDemoData                      ├─ store.js (in-memory workflow)
types/physicianWorkspace.ts              └─ demoData.js
```

Both the frontend and backend are self-contained: no file inside this
module imports anything that belongs to another SIH part, and the module
runs correctly even if Parts 1–4 and 6 do not exist.

### Data flow

```
Clinical case (demo data)
        ↓
GET /physician-workspace/cases/:id
        ↓
POST /physician-workspace/summaries/generate
        ↓  (deterministic rule-based "Demo / Simulated AI")
AI-generated draft (status: AI_GENERATED)
        ↓
Physician reviews in the UI
        ↓
PUT .../summaries/:id            → PHYSICIAN_EDITED (new version)
        ↓
POST .../approve  or  .../reject → APPROVED / REJECTED (new version)
        ↓
Every step recorded in version history + audit trail
```

## 4. Why an in-memory store, not a database

The rest of the repository mixes Postgres, MongoDB and Firebase Admin
inconsistently, and `backend/middleware/authMiddleware.js` **throws at
import time** if Firebase environment variables are absent (they are, in
this environment — the existing login screen is a local, unauthenticated
role-selection demo and never issues a Firebase token). Depending on any of
that would make Part 5 fail to start in exactly the environment it needs to
run in. Instead:

- The backend uses a self-contained **in-memory store**
  (`backend/services/physicianWorkspace/store.js`) seeded with three
  synthetic demo cases. It resets on restart — this is a demo store, not
  production persistence, and is documented as such.
- Authorization is enforced by a small **demo auth adapter**
  (`backend/middleware/physicianWorkspaceAuth.js`) that reads
  `x-demo-user-id` / `x-demo-user-name` / `x-demo-user-role` headers (the
  identity already tracked by the existing frontend demo login) rather than
  depending on the non-functional Firebase path. Swapping in real auth
  later only requires replacing this one file.
- The frontend additionally ships an **offline fallback** (`localDemoEngine`
  / `localDemoStore`) so the workspace still works end-to-end even if the
  Express backend isn't running at all. A small "Offline demo mode" badge
  is shown whenever this path is active.

## 5. AI implementation — be precise

**This is a deterministic, rule-based demo generator. It is not a real
medical AI model and makes no network call to any AI provider.**

- Backend: `backend/services/physicianWorkspace/aiSummaryGenerator.js`
- Frontend fallback: `src/services/physicianWorkspace/localDemoEngine.ts`

It restructures fields already present on the case into a physician-
readable draft, explicitly writes "Not available" for anything missing, and
flags a small set of urgent keywords (e.g. "chest pain", "breathless") as
prompts for physician attention — never as a diagnosis. Every summary
carries `aiMeta.disclaimer`: *"AI-GENERATED DRAFT (Demo / Simulated AI). Not
a diagnosis. Requires physician review before any clinical use."*

## 6. API (mounted at `/physician-workspace`, proxied by the frontend at `/api/physician-workspace`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/cases` | DOCTOR, ADMIN, NURSE | List demo cases |
| GET | `/cases/:caseId` | DOCTOR, ADMIN, NURSE | Case detail |
| POST | `/summaries/generate` `{caseId}` | DOCTOR, ADMIN | Generate a new AI draft |
| GET | `/summaries/:summaryId` | DOCTOR, ADMIN, NURSE | Fetch a summary |
| PUT | `/summaries/:summaryId` `{sections}` | DOCTOR, ADMIN | Physician edit |
| POST | `/summaries/:summaryId/approve` | DOCTOR, ADMIN | Approve |
| POST | `/summaries/:summaryId/reject` `{reason}` | DOCTOR, ADMIN | Reject (reason required) |
| POST | `/summaries/:summaryId/revise` `{note?}` | DOCTOR, ADMIN | Regenerate draft |
| GET | `/summaries/:summaryId/versions` | DOCTOR, ADMIN, NURSE | Version history |
| GET | `/summaries/:summaryId/audit` | DOCTOR, ADMIN, NURSE | Audit trail |

All requests require `x-demo-user-id` and `x-demo-user-role` headers (401 if
missing/unknown role, 403 if the role is not permitted for that action).
Every mutating endpoint validates its body server-side (never trusts the
frontend) and rejects invalid state transitions with `409 Conflict`.

## 7. Status model

`AI_GENERATED → PHYSICIAN_EDITED → APPROVED`
`AI_GENERATED/PHYSICIAN_EDITED → REJECTED` (reason required)
`REJECTED/AI_GENERATED/PHYSICIAN_EDITED → AI_GENERATED` (via regenerate)

Every transition appends a new **version** (so the original AI draft is
never silently lost) and a new **audit** entry (`SUMMARY_GENERATED`,
`SUMMARY_EDITED`, `SUMMARY_APPROVED`, `SUMMARY_REJECTED`,
`SUMMARY_REGENERATED`, `SUMMARY_VIEWED`), also written through to the
existing shared logger (`backend/utils/logger.js`).

## 8. Setup — running Part 5 independently

```bash
# Backend
cd backend
npm install
npm run dev          # http://localhost:5000

# Frontend (separate terminal)
npm install
npm run dev           # http://localhost:5173, proxies /api → :5000
```

No environment variables, database, or other SIH part is required. If the
backend isn't running at all, the frontend still works via its offline
fallback (an "Offline demo mode" badge appears).

## 9. Demo flow

1. Log in with the existing demo login screen, selecting the **Doctor**
   role.
2. Open **Physician AI Workspace** from the sidebar (Clinical group).
3. Select a case (try "Sanjay Kapoor" for a case with an urgent flag, or
   "Rahul Mehra" for a case with deliberately sparse data).
4. Review the clinical information panel.
5. Click **Generate summary** — an AI-labelled draft appears.
6. Edit a section, click **Save edits** (status becomes
   "Physician-edited").
7. Click **Approve**, or click **Reject** and provide a reason.
8. Click **History** to see the full version and audit trail.

## 10. Testing

```bash
# Backend — Node's built-in test runner, zero new dependencies
cd backend && npm test          # 12 tests: unit + HTTP API tests

# Frontend — vitest (the only new dependency added for Part 5)
npm test                        # 13 tests: pure logic, no DOM
```

Actual results at time of writing: **12/12 backend tests pass**, **13/13
frontend tests pass**, `npm run lint` is clean, `npm run build` succeeds.

Covered: AI generator never fabricates missing fields; full
generate→edit→approve workflow; rejection requires a reason; invalid state
transitions are blocked; unknown case/summary IDs return 404; malformed IDs
return 400; unauthenticated requests return 401; under-privileged roles
(NURSE) are blocked from mutating actions with 403; version and audit
counts are correct after a full workflow.

**Limitation:** no rendered-component (React Testing Library) tests were
added, to avoid pulling in `jsdom`/`@testing-library/*` as additional
dependencies beyond `vitest`. All business logic (AI generation, state
machine, store actions) is covered at the unit level instead. This is
recorded as a known gap, not glossed over.

## 11. Security

- Every mutating endpoint checks role via `requireRole(...)` server-side —
  the frontend hides buttons for UX only, never as the actual gate.
- All input is validated server-side (`physicianWorkspace.validation.js`):
  ID format, section keys/lengths, required rejection reason.
- No secrets, API keys, or credentials are used or stored anywhere in this
  module (the "AI" is fully local/rule-based).
- Internal errors are never leaked to the client; unexpected failures log
  server-side and return a generic 500 message.

## 12. Known limitations

- In-memory store: data resets on backend restart (by design, for
  independent demoability — swappable for a real DB later without touching
  routes/controllers).
- Demo auth adapter reads trusted headers rather than verifying a real
  session token, because the rest of the repo's auth isn't functionally
  wired up yet; this is clearly documented as a placeholder.
- The AI is a deterministic rule-based composer, not a real LLM/ML model —
  explicitly labelled everywhere it appears.
- No component-level (RTL) UI tests, as noted above.
- Case-to-physician assignment is not enforced (any DOCTOR/ADMIN sees all
  demo cases) — acceptable for a demo queue, would need real
  assignment logic in production.

## 13. Independence confirmation

Part 5 has been grepped for references to `part1`–`part4`, `part6`, and to
the pre-existing (unused, broken-if-imported) `mlEngineStub.js`; no such
dependency exists anywhere in this module's code. It runs, builds, lints
and passes its full test suite with zero other SIH parts present.
