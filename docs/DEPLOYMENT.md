# Deployment Guide

## 1. Environments

| Environment | Target | Manifests |
|---|---|---|
| Local dev | `docker compose` on a workstation | `docker-compose.yml` |
| Staging / single-site | one VM or small cluster | `docker-compose.yml` |
| Production / hospital-scale | multi-node Kubernetes cluster | `deploy/k8s/*.yaml` |

## 2. Prerequisites

- Container registry access (the CI pipeline pushes to GHCR by default).
- PostgreSQL 16 (self-hosted via the provided StatefulSet, or a managed
  instance — recommended at scale).
- A `ReadWriteMany` storage class (NFS/EFS/Azure Files) if running the
  backend as multiple replicas on Kubernetes with local-disk uploads, **or**
  migrate `UPLOAD_DIR` handling to object storage (S3/GCS/Azure Blob) — the
  cleaner path for true multi-node scale, since it removes the RWX
  dependency entirely. `backend/src/middleware/upload.js` is the single
  integration point to swap.
- TLS termination: cert-manager + an Ingress controller (manifests assume
  `ingress-nginx` and `cert-manager` `ClusterIssuer`), or your cloud LB's
  managed certificates.
- Secrets manager (Vault, AWS/GCP/Azure Secrets Manager, or Sealed Secrets)
  for `PGPASSWORD`, `JWT_SECRET`, and Keycloak client credentials — do not
  commit filled `.env` files or `Secret` manifests.

## 3. Docker Compose deployment

```bash
cp .env.production.example .env.production   # fill in real secrets
docker compose --env-file .env.production --profile migrate run --rm migrate
docker compose --env-file .env.production up -d --build
docker compose ps
curl -f http://localhost:${HTTP_PORT:-8080}/healthz
```

Rolling update: `docker compose --env-file .env.production up -d --build --no-deps backend frontend`.

## 4. Kubernetes deployment

```bash
kubectl apply -f deploy/k8s/00-namespace-config.yaml   # edit the Secret first, or apply a real one out-of-band
kubectl apply -f deploy/k8s/10-postgres.yaml
kubectl apply -f deploy/k8s/20-backend.yaml   # replace REGISTRY/__TAG__ first (CI does this automatically)
kubectl apply -f deploy/k8s/30-frontend.yaml
kubectl apply -f deploy/k8s/40-migrate-job.yaml
kubectl wait --for=condition=complete job/db-migrate -n medicare-pro --timeout=180s
kubectl -n medicare-pro get pods,svc,ingress
```

The CI/CD workflow (`.github/workflows/ci-cd.yml`) automates image
build/push and does the `sed` substitution + rollout on merge to `main`,
gated behind a `production` GitHub Environment (supports required
reviewers).

### Scaling

- `backend` ships with an HPA (2–10 replicas, target 70% CPU). OCR requests
  (Tesseract) are CPU-bound — watch CPU, not memory, as the primary scaling
  signal, and consider a dedicated node pool with higher CPU-to-memory ratio
  for OCR-heavy workloads.
- `postgres` is a single-instance StatefulSet in the baseline manifest. For
  hospital-scale HA, move to a managed database or an operator
  (CloudNativePG / Zalando postgres-operator) with streaming replication.
- `frontend` is stateless nginx — scale horizontally freely.

### Rollback

```bash
kubectl rollout undo deployment/backend -n medicare-pro
kubectl rollout undo deployment/frontend -n medicare-pro
```

Database migrations in `backend/src/db/` are additive-only by convention
(see `schema_workflow.sql` header comments) specifically so that a backend
rollback doesn't require an accompanying destructive down-migration.

## 5. Configuration reference

All runtime config is environment variables — see `.env.production.example`
for the full list. Key ones:

| Variable | Purpose |
|---|---|
| `CLIENT_ORIGIN` | Allowed CORS origin for the API |
| `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` | Postgres connection |
| `JWT_SECRET` | Signs session tokens issued by `rbac.controller.js` |
| `KEYCLOAK_*` | Optional — enables Keycloak-backed identity (`keycloakAdapter.service.js`) instead of local dev tokens |
| `UPLOAD_DIR` | Where prescription originals/preprocessed images are stored |
| `MAX_FILE_SIZE_MB` | Multer upload limit |
| `OCR_LANG` | Tesseract language pack |

## 6. Compliance checklist (route to security/compliance/legal)

- [ ] Encryption at rest for the Postgres volume and the uploads store
- [ ] TLS everywhere (browser↔ingress, and ideally ingress↔backend, backend↔db)
- [ ] Access logging + retention policy for `audit_action` events already captured in schema
- [ ] Data processing / business associate agreement with hosting provider, if applicable
- [ ] Backup + restore drill for Postgres and the uploads volume/bucket
- [ ] Least-privilege RBAC role review (`backend/src/config/roles.js`) against real job functions
- [ ] Penetration test / security review before handling real patient data
- [ ] Regulatory assessment of the AI analysis feature in your jurisdiction
