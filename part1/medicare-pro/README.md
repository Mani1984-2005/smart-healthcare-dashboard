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
