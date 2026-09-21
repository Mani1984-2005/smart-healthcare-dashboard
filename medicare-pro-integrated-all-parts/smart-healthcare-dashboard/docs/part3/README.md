# Part 3 — Medical Documents & OCR

**Status: implementation complete.** 186 automated tests pass (119 backend + 67 frontend).

> **Current OCR limitation (read first)**
> * The **bundled synthetic documents** (6 demo files) are read using **deterministic demo transcripts** recorded with them.
> * **Arbitrary uploaded files do not receive real image OCR.** They upload and are stored, but OCR reports that the file cannot be read; no text is ever guessed or invented.
> * A **real OCR provider can be connected** through the documented integration point (section 7) without changing any other code.

**Pipeline:** Document upload / scan → OCR → medical entity extraction → structured data → chronological patient timeline,
with abnormal-lab highlighting **using only the reference range printed in the same document**.

This is a *documentation and information-structuring* tool. It does **not** diagnose, recommend treatment, triage, or run any AI conversation.
Out of scope by design: AI intake, voice/touch case-taking, red-flag engine, physician review workflow, appointments, pharmacy, billing,
notifications, inventory, hospital management.

---

## 1. Run Part 3 independently (needs nothing from the other parts)

Part 3 runs on its own: no database, no Firebase, no other MediCare Pro backend module, and no other SIH part. The only requirement is Node and this repo's installed packages (`npm install`).

```bash
npm install                  # once (adds vitest/testing-library dev deps)
npm run part3:api            # Part 3 API on :5000 (the port the Vite dev proxy already targets)
npm run dev                  # frontend on :5173
```

Open http://localhost:5173, sign in with **any name/email and role ADMIN, DOCTOR or NURSE** (the existing demo login), then
**Clinical → Medical Documents**.

**Demo walk-through (≈ 2 minutes):**
1. *Add a document* → **Use this document** on *Laboratory report – biochemistry & haematology*.
2. **Run all remaining steps** → OCR, extraction, timeline.
3. *Lab results* tab: 4 results are **outside** the range printed in the document, 2 are within, 2 are **unable to determine** (no range printed / non-numeric).
4. **Show in text** on any row jumps to the exact source line in the OCR text.
5. Add the other synthetic documents (prescription, discharge summary, follow-up labs), then *Timeline* → a dated, chronological record with a source link on every entry.
6. *Prescription – no legible date* → its entries appear under **Undated** (never dated by upload time). *Blank scan* → "No text was found".
7. Upload the **Download sample** PNG through *Upload a scan* to try the upload path. Any *other* image is uploaded but OCR reports it cannot read it (see limitations).

Other run modes:

| Need | How |
|---|---|
| Main backend also running on :5000 | `PART3_PORT=5001 npm run part3:api` and `VITE_PART3_API_BASE_URL=http://localhost:5001/part3 npm run dev` |
| Mount inside the main Express app (optional) | `import { createPart3Router } from "./part3/index.js"; app.use("/part3", createPart3Router().router);` — **not applied**; `backend/server.js` is untouched |
| Reset demo data | `npm run part3:reset`, or *Reset demo data* (ADMIN) in the UI |
| Nothing written to disk | `PART3_DATA_DIR=memory npm run part3:api` |
| Tests | `npm run test:part3` |

Configuration: see `backend/part3/.env.example`.

## 2. Architecture

```
 Browser (React, src/part3/)                          Part 3 API (Express, backend/part3/)
 ┌──────────────────────────────┐   /api/part3/*     ┌─────────────────────────────────────────────┐
 │ pages/  components/  hooks/  │ ───────────────►   │ routes → auth (demo session, RBAC) → rate   │
 │ services/client.ts           │  Bearer demo token │ limit → validators → controllers            │
 │ (own session, own client)    │ ◄───────────────   │  services/documentService (orchestration)   │
 └──────────────────────────────┘                    │   ├ ocr/        provider boundary           │
   shared, read-only:                                │   ├ extraction/ rule-based + grounding      │
   ui/* primitives, useAuthStore (user), roles       │   ├ lab/        document-range comparison   │
                                                     │   └ timeline/   dated events + provenance   │
                                                     │  models/store  (memory or JSON+files)       │
                                                     │  services/auditService (no PHI)             │
                                                     └─────────────────────────────────────────────┘
```

* **No runtime dependency on any other part.** Backend imports only Node built-ins, `express`, `cors` and its own files; frontend imports only its own files, npm packages and the shared UI primitives / read-only auth user. Enforced by `independence.test.js`, which also boots the API from a copy containing *only* `backend/part3/` (no database, no Firebase env).
* **Exact shared-file changes** — 4 existing files differ from the original upload (no other existing file was modified; `backend/server.js` and all other backend files are untouched). The literal diffs are in `SHARED_FILE_CHANGES.diff` in the ZIP.
  1. `package.json` — added 3 scripts (`test:part3`, `part3:api`, `part3:reset`) and 5 devDependencies (`vitest ^5.0.1`, `jsdom ^30.1.0`, `@testing-library/react ^16.3.3`, `@testing-library/jest-dom ^7.0.1`, `@testing-library/user-event ^14.6.7`). No existing script or runtime dependency changed.
  2. `package-lock.json` — regenerated by npm for those dev dependencies: 74 packages added; 3 transitive dev packages moved by patch/minor version (`picomatch` 4.0.4→4.0.7, `tinyglobby` 0.2.16→0.2.17, `@jridgewell/sourcemap-codec` 1.5.5→1.6.0); 24 entries have metadata-only changes; nothing removed. `npm audit` is identical before and after (9 findings, none newly flagged).
  3. `src/app/routes.tsx` — added `import { part3Routes } from "../part3";` and `...part3Routes,` at the end of `ROUTES`. No existing route entry changed.
  4. `src/layouts/Sidebar.tsx` — added the `ScanText` icon import and one entry in each of `groupByPath` (`"/medical-documents": "Clinical"`) and `iconByPath` (`"/medical-documents": ScanText`). No existing entry changed.
  * New files/folders (not shared): `backend/part3/`, `src/part3/`, `docs/part3/`, `vitest.part3.config.mjs`.

## 3. Medical-safety boundaries (enforced in code, covered by tests)

| Rule | Where |
|---|---|
| Never fabricate OCR text | The demo provider returns text only for the 6 bundled synthetic files (matched by SHA-256) and **rejects everything else** (`UNSUPPORTED_DOCUMENT`); it never invents text. |
| Never fabricate extracted values | Every extracted field must be a literal substring of its source span or the whole entity is **dropped** and reported (`services/extraction/grounding.js`). Unknown fields stay `null` and are shown as “Not stated”. |
| Never invent a reference range | There is **no built-in table of normal values anywhere**. Ranges are parsed only from the document text; no range → `UNABLE_TO_DETERMINE`. |
| Three lab states only | `WITHIN_RANGE`, `OUTSIDE_RANGE` (with `ABOVE`/`BELOW`), `UNABLE_TO_DETERMINE` (no range, unparseable range, non-numeric or qualified value, unit mismatch). Units are never converted. Shown as text + icon, never colour alone. |
| Never guess dates | Numeric dates are day-first; 2-digit years and impossible dates keep the raw text with `isoDate: null`. Events with no date go to **Undated**, never the upload time. |
| Everything is labelled | All extracted data carries `verificationStatus: "EXTRACTED_UNVERIFIED"`; a safety notice is on every screen and API response that carries extracted data; the demo OCR provider is labelled “recorded transcript”; synthetic documents carry a watermark and a “Synthetic demo data” badge. |
| Provenance | Every entity and timeline event carries `documentId`, `ocrResultId` and the exact character span in the OCR text. |

## 4. API (`/part3` and `/api/part3`)

All routes except `health` and `auth/demo-session` require `Authorization: Bearer <token>`. Errors: `{ "error": { "code", "message", "requestId", "details?" } }` (never stack traces).

| Method & path | Permission | Purpose |
|---|---|---|
| `GET /health` | public | Status; states `standalone` and `syntheticDataOnly`; lists OCR providers |
| `POST /auth/demo-session` `{role,name}` | public, rate-limited | Issue a signed demo session |
| `GET /me`, `GET /patients` | clinical | Current user; the 2 synthetic patients |
| `GET /demo/fixtures` · `GET …/:id/file` · `POST …/:id/ingest` | clinical | Synthetic library: list / download / add to the record |
| `POST /documents?patientId&docType&filename` (raw body, `image/png` `image/jpeg` `application/pdf`) | upload | Upload; magic-number check; de-duplicated per patient by SHA-256 |
| `GET /documents` (`patientId,status,page,limit`) · `GET /documents/:id` · `GET /documents/:id/file` | read | List / bundle (document+OCR+extraction) / original |
| `POST /documents/:id/ocr` `{providerId?,languageHints?}` | process | Run OCR (idempotent; 409 while running; 422/502/503/504 on failure) |
| `POST /documents/:id/extract` | process | Extract entities (requires OCR done) |
| `POST /documents/:id/timeline` | timeline:write | Add to timeline (requires extraction) |
| `GET /patients/:id/timeline` (`order,types,from,to`) | timeline:read | Dated events + separate `undated` list |
| `GET /audit` · `POST /demo/reset` | **ADMIN** | Audit trail · clear demo data |

Roles: **ADMIN, DOCTOR, NURSE** may use the module; every other role gets `403` on every route (deny-by-default map in `middleware/auth.js`).

Document states: `UPLOADED → OCR_IN_PROGRESS → OCR_COMPLETED | OCR_EMPTY | OCR_FAILED → EXTRACTED → ON_TIMELINE` (a failed/empty OCR can be retried).

## 5. Data model (`models/store.js`)

`document` (id `doc_<10 hex>` derived from patient+content, patientId, docType, filename (sanitised, display only), mimeType, sha256, status, origin `SYNTHETIC_FIXTURE|USER_UPLOAD`, synthetic) ·
`ocrResult` (provider `{id,label,kind,version}`, status, text, duration, `providerConfidence` or null, error code/message) ·
`extraction` (`entities[]` of kind medication / diagnosis / procedure / investigation / date, `documentDate`, `warnings[]`, `stats`) ·
`timelineEvent` (eventType, `eventDate|null`, `dateBasis`, `dateSource`, title, details, source span, interpretation status) ·
`auditEvent` (actor id+role, action, resource, outcome, requestId — **no document text, values or file names**).
Persistence: in-memory maps with optional write-through `store.json` + blob files (atomic writes, corrupt-file recovery, crash recovery of half-finished OCR). No database is created or modified.

## 6. Security assumptions

* Authentication is a **demo**: the role is self-declared and signed (HMAC-SHA256, random per-process secret unless `PART3_DEMO_SECRET`). The server **refuses to start with `NODE_ENV=production`** unless `PART3_ALLOW_DEMO_AUTH=true`. Authorization is enforced server-side; the frontend gate is only convenience. To go live, replace `middleware/auth.js` `authenticate` with your real identity provider.
* Uploads: type allow-list + magic-number verification, size limit, sanitised names, storage by generated id (no path traversal), files served with `nosniff`, `Content-Security-Policy: sandbox`, `no-store`.
* Standalone server CORS allows only `PART3_ALLOWED_ORIGINS`. In-memory rate limits on session, upload and processing.
* Not provided: encryption at rest, retention/deletion policy, real user accounts, multi-instance rate limiting.

## 7. Real OCR later

Implement the provider contract in `backend/part3/services/ocr/OcrError.js` (`recognize({buffer,mimeType,languageHints}) → {text,pageCount,detectedLanguages,providerConfidence}`; throw `OcrError` instead of returning guesses), pass it via `createPart3Router({ ocrProviders:[provider] })` and add its id to `PART3_OCR_PROVIDERS`. Nothing else changes; the UI already labels demo vs real providers and shows provider-reported confidence only when provided.

## 8. Tests — `npm run test:part3` (186 tests)

* **Backend (119):** reference-range parsing and lab interpretation (boundaries, one-sided, Indian digit grouping, unit mismatch, qualified/non-numeric); extraction per entity type and every fabrication safeguard; OCR success / empty / unreadable / crash / timeout / unavailable / concurrent / oversized; timeline ordering, dating rules, undated, provenance, isolation between patients; API authentication, role matrix, upload validation, workflow conflicts and idempotency, error shape, audit privacy, rate limiting, reset, config safety; persistence and crash/corruption recovery; independence (import boundary + isolated boot + CORS).
* **Frontend (67):** API client (session reuse, 401 recovery, error mapping, timeout, encoding), badges and the three lab states, lab table highlighting, extracted-data “Not stated” handling, OCR pane states and source highlighting, stepper, timeline (loading / error+retry / empty / undated / filters / no cross-patient flash) and **full-stack UI tests** that drive the real pages against the real backend (complete journey, failure paths, forbidden role, service down, admin tools).
* Safety-critical tests were **mutation-checked**: disabling range flagging, the grounding check, undated handling or the flag wording each makes tests fail.
* A manual real-browser (Chromium) run of the whole journey was also done; it is not part of the automated suite.

## 9. Known limitations (exact)

1. **OCR limitation.** (a) The 6 bundled synthetic documents have deterministic demo transcripts, so they process end to end. (b) Arbitrary uploaded files do **not** receive real image OCR: they are stored, and OCR returns a clear “cannot be read” error with no text produced. (c) A real OCR provider can be connected through the documented integration point (section 7). No real OCR engine is bundled, so handwriting, other scripts/languages and photographed documents are not supported until a provider is connected.
2. Extraction is rule-based for printed English layouts. Unusual layouts produce fewer entities plus visible warnings, not guesses. It does not understand negation or context (“no diabetes”), keeps comma-separated diagnoses as one entry, and does not interpret age/sex-specific ranges (they become “Unable to determine”).
3. Numeric dates are assumed day-first; two-digit years are not resolved.
4. Only 2 built-in synthetic patients; there is no link to any real patient registry.
5. PDFs can be uploaded and stored but the demo OCR cannot read them; PDFs open in a new tab rather than inline.
6. No editing/correction or clinician sign-off workflow (out of scope), so nothing ever becomes “verified”.
7. Single-process storage (JSON/memory), no encryption at rest; audit history is capped at 5,000 events; rate limits are per process.
8. **Existing app shell issue (not changed):** `MainLayout`’s header is built from the URL path at `text-3xl` and `<main>` has no `min-w-0`, so on ≤ ~400 px wide phones the list/timeline views scroll sideways by ~10 px (the workspace page fits). A two-class fix (`min-w-0` on `<main>`, `break-words` on the `<h1>`) resolves it for every page; by decision it was **left unchanged**; the existing shell is not modified by Part 3.
9. Verified in Chromium only. `tsc --noEmit` still reports the 37 pre-existing errors (0 in Part 3).
