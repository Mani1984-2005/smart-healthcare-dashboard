# Operations Runbook

## Health & readiness

- `GET /api/health` — backend liveness/readiness (used by Docker/K8s probes)
- `GET /healthz` — frontend nginx liveness

## Logs

- Backend: structured logs via `backend/src/utils/logger.js`, written to
  stdout (`morgan` in `combined` format for `NODE_ENV=production`) — collect
  via your platform's standard container log pipeline (CloudWatch, Loki,
  Stackdriver, etc.). No PHI should be logged at info level; review
  `logger.js` call sites before enabling debug-level logging in production.
- Postgres: enable `log_statement=ddl` and connection logging at minimum;
  avoid `log_statement=all` in production (would log query parameters,
  including patient data, into infrastructure logs).

## Common incidents

**Backend pod CrashLoopBackOff on startup**
1. Check `kubectl logs -n medicare-pro deploy/backend` — most common cause
   is a missing/incorrect `PGPASSWORD` or the DB not yet reachable.
2. `server.js` intentionally starts the HTTP server even if the initial DB
   check fails (see `checkDbConnection` warning log), so a crash usually
   means an uncaught exception elsewhere — check the stack trace.

**OCR requests timing out / high backend CPU**
- Tesseract.js OCR is CPU-bound and synchronous per-request. Check HPA
  status (`kubectl get hpa -n medicare-pro`) — if maxed out at 10 replicas
  under sustained load, raise `maxReplicas` and confirm node pool capacity
  before raising limits further.

**Uploads returning 404 after a backend rollout**
- Confirm the `uploads-pvc` (K8s) or `uploads` volume (compose) is actually
  shared across replicas — if a replica was run without the shared
  volume/RWX storage class, previously uploaded files won't be visible from
  it. This is the signal to migrate to object storage (see DEPLOYMENT.md §2).

**Approval workflow stuck / handler not firing**
- Handlers are registered at boot in `workflowBootstrap.js`. Confirm it's
  actually invoked from `server.js` startup — check for a
  `"✅ Workflow approval handlers registered"` log line at boot.

## Backups

- Postgres: nightly `pg_dump` (or provider-managed snapshots) plus WAL
  archiving if RPO < 24h is required. Restore drills should be scheduled,
  not assumed to work.
- Uploads: snapshot the RWX volume, or rely on object-storage versioning if
  migrated per DEPLOYMENT.md.

## Rotating secrets

```bash
kubectl create secret generic medicare-pro-secrets -n medicare-pro \
  --from-literal=PGUSER=medicare_app \
  --from-literal=PGPASSWORD="$(openssl rand -base64 32)" \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --from-literal=CLIENT_ORIGIN=https://medicare-pro.example-hospital.org \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment/backend -n medicare-pro
```

Rotating `PGPASSWORD` also requires `ALTER ROLE ... PASSWORD` on the DB
itself before the restart, or the backend will fail to reconnect.
