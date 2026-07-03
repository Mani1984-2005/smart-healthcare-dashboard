# Medicare Pro — AI Prescription Analyzer
### Part 1: Foundation & OCR Module

Enterprise foundation for a prescription-capture and OCR pipeline. This part covers upload (drag & drop, file picker, camera), image preprocessing, OCR text extraction, PostgreSQL persistence, REST APIs, validation, audit logging, and a responsive dark-mode UI.

**No AI medical analysis is implemented yet** — that's a later phase. This phase only extracts raw text from the prescription image/PDF.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Router, Framer Motion |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL (only — no MongoDB) |
| OCR | tesseract.js (images) + pdf-parse (PDFs with a text layer) |
| Image preprocessing | sharp (grayscale, contrast normalize, upscale, sharpen, threshold) |

---

## Project structure

```
medicare-pro/
├── backend/
│   ├── src/
│   │   ├── config/         # env + PostgreSQL pool
│   │   ├── db/              # schema.sql + migration runner
│   │   ├── middleware/      # upload (multer), validation, error handler
│   │   ├── controllers/     # prescriptions controller (upload → OCR pipeline)
│   │   ├── routes/          # REST route definitions
│   │   ├── services/        # OCR, image preprocessing, storage, audit log
│   │   ├── utils/            # logger, AppError, asyncHandler
│   │   └── server.js         # Express app entry point
│   ├── uploads/               # stored prescription files (gitignored)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/               # axios client + prescriptions API calls
    │   ├── components/
    │   │   ├── layout/        # Navbar, Footer
    │   │   ├── upload/         # DropzoneUpload, CameraCapture, UploadProgress
    │   │   ├── prescriptions/  # PrescriptionCard, PrescriptionList, OcrTextViewer
    │   │   └── common/         # DarkModeToggle, Spinner, Toast
    │   ├── context/            # ThemeContext (dark mode)
    │   ├── pages/               # UploadPage, PrescriptionsPage, PrescriptionDetailPage
    │   └── hooks/                # useToast
    └── package.json
```

---

## Setup

### 1. Database

Create a PostgreSQL database, then set your connection details in `backend/.env` (copy from `.env.example`):

```bash
cd backend
cp .env.example .env
# edit .env with your PGUSER / PGPASSWORD / PGDATABASE etc.
```

Run the migration to create all tables:

```bash
npm install
npm run migrate
```

This creates `users`, `prescriptions`, and `audit_logs` tables (see `src/db/schema.sql`).

### 2. Backend

```bash
cd backend
npm install
npm run dev      # http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to the backend, so no CORS configuration is needed locally.

---

## REST API

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Service + DB health check |
| POST | `/api/prescriptions/upload` | Upload a file (`prescription` field) + run preprocessing/OCR |
| GET | `/api/prescriptions` | Paginated list (`?page=&limit=`) |
| GET | `/api/prescriptions/:id` | Single prescription record |
| GET | `/api/prescriptions/:id/audit` | Audit trail for a record |
| DELETE | `/api/prescriptions/:id` | Delete record + underlying files |

All responses use the shape `{ success, data, error? }`. Upload accepts JPG, PNG, WEBP, HEIC, and PDF up to 15MB (configurable via `MAX_FILE_SIZE_MB`).

---

## What happens on upload

1. File is validated (mime type, size) and stored in `backend/uploads/`.
2. A `prescriptions` row is created (`status: uploaded`) and a SHA-256 checksum recorded.
3. **Images** are preprocessed with `sharp` — auto-rotated, grayscaled, contrast-normalized, upscaled if small, sharpened, and thresholded — then OCR'd with `tesseract.js`.
4. **PDFs** have their embedded text layer extracted via `pdf-parse`.
5. Result (`raw_ocr_text`, confidence, duration) is saved and status becomes `ocr_complete` (or `ocr_failed` with an error message, without discarding the upload).
6. Every step (`FILE_UPLOADED`, `OCR_STARTED`, `OCR_COMPLETED`/`OCR_FAILED`, etc.) is written to `audit_logs` for traceability.

## Notes for the next phase

- OCR currently runs synchronously in the request/response cycle — fine for Part 1, but a background job queue (BullMQ, etc.) is recommended once volume grows.
- Auth is stubbed with a single system user; a real auth/session layer belongs in a later part.
- `raw_ocr_text` is intentionally unstructured — parsing it into medications/dosages/etc. is the AI analysis module that comes next.

---

# Part 2: AI Intelligence

Extends Part 1 with an **offline, rule-based AI Clinical Engine**. No external LLM/API call is made — everything runs against a curated in-repo medicine knowledge base (`backend/src/data/medicineDatabase.js`), so analysis works without network access and with predictable, auditable output.

## What's new

| Capability | Where |
|---|---|
| Medicine recognition (generic + brand, fuzzy OCR-tolerant matching) | `services/medicineLookup.service.js` |
| Dosage / frequency / duration / route extraction | `services/nlpExtraction.service.js` |
| Patient name / doctor name / diagnosis extraction | `services/nlpExtraction.service.js` |
| Per-field and per-medicine AI confidence scores | `services/nlpExtraction.service.js` |
| Drug interaction detection (pairwise, severity-ranked) | `services/drugSafety.service.js` |
| Duplicate medicine detection | `services/drugSafety.service.js` |
| Allergy warnings (against caller-supplied known allergies) | `services/drugSafety.service.js` |
| Contraindication flags (diagnosis vs. medicine) | `services/drugSafety.service.js` |
| High-risk / controlled-substance alerts | `services/drugSafety.service.js` |
| Medicine info: side effects, precautions, contraindications | `data/medicineDatabase.js` |
| AI-generated prescription summary | `services/summary.service.js` |
| Orchestration | `services/aiAnalysis.service.js` |
| Persistence into PostgreSQL | `db/schema_ai.sql`, `controllers/aiAnalysis.controller.js` |
| Advanced search | `controllers/search.controller.js` |
| Analytics dashboard | `controllers/analytics.controller.js` |

## New REST API

| Method | Route | Description |
|---|---|---|
| POST | `/api/prescriptions/:id/analyze` | Runs the AI Clinical Engine against a prescription's OCR text and persists the result. Body: `{ knownAllergies: string[] }` (optional). Requires `status: ocr_complete`. |
| GET | `/api/prescriptions/:id/analysis` | Fetches the most recent stored analysis for a prescription. |
| GET | `/api/search` | Advanced search — `?q=&medicineName=&patientName=&doctorName=&diagnosis=&riskLevel=&dateFrom=&dateTo=&page=&limit=` |
| GET | `/api/analytics/dashboard` | Aggregated stats: totals, risk distribution, top medicines/interactions, 30-day trend, recent high-risk analyses. |

## New database tables (`db/schema_ai.sql`)

`ai_analyses` (one row per prescription, upserted on re-analysis), `extracted_medicines`, `drug_interactions_detected`, `duplicate_medicine_flags`, `allergy_warnings`, `contraindication_flags`. Re-running `npm run migrate` applies both `schema.sql` and `schema_ai.sql` in order.

## New frontend

- `components/ai/` — `AiAnalysisSection`, `AiSummaryPanel`, `MedicineResultCard` (expandable, shows side effects/precautions/contraindications), `SafetyAlerts` (interactions/allergies/duplicates/contraindications), `RiskBadge`, `ConfidenceBadge`, `SeverityBadge`, `AnalyzeButton` (with known-allergy chip input), `BarList`.
- `pages/AnalyticsPage.jsx` — stat cards, risk distribution, 30-day trend, top medicines/interactions, recent high-risk list.
- `pages/SearchPage.jsx` — advanced multi-filter search over analyzed prescriptions.
- `PrescriptionDetailPage.jsx` now renders an **AI Clinical Analysis** section between the OCR text and the audit trail.

## Notes for the next phase

- The knowledge base (~45 medicines) is intentionally curated for recall on common prescriptions — expanding it is just adding entries to `medicineDatabase.js`; `frontend/src/data/medicineInfoLookup.js` mirrors the display fields and should be regenerated alongside it.
- Analysis is deterministic and offline; swapping in a real LLM/clinical NLP model later is a drop-in replacement for `nlpExtraction.service.js`, keeping the same output contract.
- One analysis is kept per prescription (upsert on re-run) — versioned analysis history is a natural Part 3 addition.
