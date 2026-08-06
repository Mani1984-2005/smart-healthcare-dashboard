# MediCare Pro Runtime Audit

Audit date: 2026-08-06

## Current status

- Frontend: **Running**. Vite served the login route successfully on `http://127.0.0.1:5173/login`.
- Backend: **Running**. Express started successfully and its health endpoint returned HTTP 200 on an isolated local port (`5001`).
- Production build: **Passing**. `npm run lint` and `npm run build` both completed with exit code 0.

## Repository audit

| Area | Finding |
| --- | --- |
| Frontend entry point | `src/main.tsx` -> `src/App.tsx` |
| Backend entry point | `backend/server.js` |
| Package managers | npm lockfiles at root and in `backend/` |
| Environment files | No committed `.env` or `.env.example` files found |
| Database | PostgreSQL via `pg`; both `DATABASE_URL` and `PG_*` configuration styles exist |
| Prisma | Not used or configured |
| API | Axios defaults to `/api`; Express exposes a health endpoint and a separate, currently incomplete patient route |

## Fixes applied

1. Added the Vite development proxy from `/api/*` to `http://localhost:5000/*`, matching the Axios base URL.
2. Mounted `GET /health` and `GET /api/health` in the active Express server.

## Validation results

| Check | Result |
| --- | --- |
| Root `npm install` | Passed; 6 dependency vulnerabilities reported (1 moderate, 5 high) |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| Frontend HTTP smoke test | Passed (`/login` returned HTTP 200) |
| Backend `npm install` | Passed; 9 dependency vulnerabilities reported (7 moderate, 2 high) |
| Backend startup | Passed with Node `v24.17.0` |
| Backend health check | Passed (`GET /health` returned HTTP 200) |
| Browser interaction test | Not completed: the local browser runtime could not initialize because host filesystem access to `AppData` was denied |

## Errors found

- Initial dependency installation failed certificate verification; using Node's system certificate store resolved it.
- The Vite server had no proxy for the frontend's default `/api` base URL.
- The active backend server did not expose its existing health route.
- A previously started listener on port `5000` prevented validation of the changed server on that port, so the corrected backend was verified on port `5001`.

## Remaining blockers

- Authentication is a local, role-selection demo persisted in browser storage. It is not connected to Firebase or the backend authentication endpoint.
- The patient UI uses `src/stores/patientStore.ts` rather than the Axios patient service. It therefore does not exercise API CRUD.
- The active backend mounts `backend/routes/patients.js`, which only returns a status payload. The database-backed CRUD implementation is in a different, unmounted route module and lacks migration/schema validation and error handling.
- No environment template defines production values for PostgreSQL, Firebase Admin, CORS origins, or `VITE_API_BASE_URL`.
- `npm audit` reports unresolved dependency vulnerabilities; `recharts` 2.x is deprecated.
- Full interactive verification of dashboard modules (patients, doctors, appointments, laboratory, pharmacy, billing, and reports) requires browser access and a real authentication/API environment.

## Production readiness score

| Area | Score |
| --- | --- |
| Frontend | **78/100** |
| Backend | **35/100** |
| Overall | **58/100** |

The frontend is buildable and structurally sound, but the application is not ready for production until real authentication, a single integrated API surface, database migrations, environment documentation, and vulnerability remediation are completed.
