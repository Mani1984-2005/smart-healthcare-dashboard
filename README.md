# Medicare Pro — Enterprise AI Prescription Analyzer

A full-stack system for digitizing, OCR-scanning, and AI-assisted analysis of
prescriptions, with enterprise workflow features: RBAC, approvals, biometric
auth, notifications, and full audit/versioning history.

## Architecture

```
medicare-pro/
├── backend/     Node.js 20 + Express 5 API, PostgreSQL 16, Tesseract OCR
├── frontend/    React 19 + Vite SPA, Tailwind CSS
├── deploy/
│   ├── k8s/     Kubernetes manifests (namespace, Postgres, backend,
│   │            frontend, ingress, migration job, network policy)
│   └── nginx/   (frontend/nginx.conf) — SPA + reverse proxy config
├── docker-compose.yml   Single-host / staging deployment
└── .github/workflows/   CI: lint, test, build, push, deploy
```

Backend follows a layered, dependency-inverted structure:
`routes → controllers → services → repositories → db`, with cross-cutting
concerns (auth, RBAC, approvals, notifications) wired in via
`workflowBootstrap.js` rather than imported directly into domain services —
this keeps Part 1/2 domain code (OCR, AI analysis) free of a hard dependency
on Part 3B's enterprise workflow layer (Dependency Inversion / Open-Closed).

## Component inventory

| Layer | Capability |
|---|---|
| Foundation (Part 1) | Prescription upload, OCR (Tesseract), PDF parsing, image preprocessing |
| Intelligence (Part 2) | AI-assisted medicine identification, interaction/severity/risk flags, summaries |
| Core Enterprise (Part 3A) | Patient records, pharmacy dispensation, lab reports, billing, search, analytics |
| Workflow & Security (Part 3B) | RBAC, Keycloak-backed auth, biometric (WebAuthn) login, approval workflows, multi-channel notifications, entity versioning/audit |
| Production Readiness (Part 3C) | Containerization, Kubernetes manifests, CI/CD, this documentation set |

## Quick start (local development)

```bash
cp .env.production.example .env       # then edit values
docker compose --profile migrate run --rm migrate
docker compose up -d --build
```

Frontend: http://localhost:8080 · Backend health check: `GET /api/health`

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for staging/production
deployment, [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for
monitoring/runbooks, and [`docs/API.md`](docs/API.md) for the REST surface.

## Regulatory & compliance note

This codebase provides technical building blocks (OCR, workflow, audit
trail) for a clinical-adjacent system. It is **not**, by itself, a validated
medical device or a HIPAA-compliant deployment. Before any use with real
patient data, an organization deploying this must independently handle:
data-processing agreements and encryption-at-rest/in-transit configuration,
access logging/retention policy, a security risk assessment, and — if the AI
analysis output is used to inform clinical decisions — the applicable
regulatory pathway in its jurisdiction (e.g., FDA clearance in the US for
clinical decision support software that meets the relevant criteria). See
`docs/DEPLOYMENT.md` → "Compliance checklist" for a starting list of items
to route to your compliance/legal/security teams.
