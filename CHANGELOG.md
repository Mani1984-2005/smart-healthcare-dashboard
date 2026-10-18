# Changelog

## Part 3C — Production Readiness
- Multi-stage, non-root Dockerfiles for backend and frontend
- `docker-compose.yml` for single-host/staging deployment with an isolated
  DB network, healthchecks, and an on-demand `migrate` profile
- Kubernetes manifests for hospital-scale deployment: namespace/config,
  Postgres StatefulSet, backend Deployment+HPA, frontend Deployment,
  TLS Ingress, migration Job, and a default-deny `NetworkPolicy` around
  Postgres
- GitHub Actions CI/CD: lint, backend integration tests against a real
  Postgres service container, image build/push, gated production rollout
- Documentation set: README, DEPLOYMENT, OPERATIONS runbook, API reference

## Part 3B — Workflow & Security
RBAC + Keycloak-backed auth, WebAuthn biometric login, approval workflows
with pluggable handlers, multi-channel notifications, entity
versioning/audit, barcode/QR scanning.

## Part 3A — Core Enterprise Integration
Patient records, pharmacy dispensation, lab reports, billing/invoicing,
advanced search, analytics dashboard.

## Part 2 — AI Intelligence
AI-assisted medicine identification, interaction/severity/risk flags,
AI summary panel.

## Part 1 — Foundation & OCR
Prescription upload (image/PDF), Tesseract OCR, image preprocessing,
prescription list/detail views.
