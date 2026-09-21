-- REFERENCE ONLY. Part 6 currently persists to an in-memory / JSON-file repository (store/repository.js).
-- This is the intended PostgreSQL shape for the same collections, for when a database-backed
-- repository is wired in. It is NOT executed by the prototype, and it touches no existing table.

CREATE TABLE part6_consents (
  id                       text PRIMARY KEY,               -- CONS-DEMO-001
  patient_id               text        NOT NULL,
  origin                   text        NOT NULL CHECK (origin IN ('provider-request','patient-initiated')),
  requester                jsonb       NOT NULL,           -- {orgId, orgName, userId, userName}
  recipient_org_id         text        NOT NULL,
  purpose                  text        NOT NULL,
  requested_categories     text[]      NOT NULL,
  granted_categories       text[]      NOT NULL DEFAULT '{}',
  requested_duration_days  integer     NOT NULL CHECK (requested_duration_days > 0),
  duration_days            integer,
  status                   text        NOT NULL CHECK (status IN ('Pending','Granted','Denied','Revoked','Expired')),
  created_at               timestamptz NOT NULL,
  decided_at               timestamptz,
  granted_at               timestamptz,
  expires_at               timestamptz,
  revoked_at               timestamptz,
  revoked_by               text,
  revocation_reason        text,
  history                  jsonb       NOT NULL DEFAULT '[]'
);
CREATE INDEX part6_consents_patient_idx ON part6_consents (patient_id, status);

CREATE TABLE part6_data_shares (
  id            text PRIMARY KEY,                          -- SHR-DEMO-001
  consent_id    text        NOT NULL REFERENCES part6_consents(id),
  patient_id    text        NOT NULL,
  shared_at     timestamptz NOT NULL,
  shared_by     jsonb       NOT NULL,
  side          text        NOT NULL,
  categories    text[]      NOT NULL,
  bundle_id     text        NOT NULL,
  resource_ids  text[]      NOT NULL,
  checksum      text        NOT NULL                       -- SHA-256 of the released bundle; payload is NOT stored
);

CREATE TABLE part6_fhir_resources (
  key          text PRIMARY KEY,                           -- 'Observation/OBS-DEMO-001'
  resource     jsonb       NOT NULL,
  patient_id   text        NOT NULL,
  category     text,
  generated_at timestamptz NOT NULL,
  validation   jsonb       NOT NULL
);

CREATE TABLE part6_identity_links (
  id                   text PRIMARY KEY,
  internal_patient_id  text NOT NULL UNIQUE,               -- MediCare Pro id
  abha_address         text,                               -- SEPARATE identifier; never assumed equal to the internal id
  status               text NOT NULL DEFAULT 'DEMO_NOT_CONNECTED',
  verification         text NOT NULL DEFAULT 'PROTOTYPE',
  verified_at          timestamptz
);

-- Append-only, hash-chained. Grant INSERT/SELECT only to the application role; no UPDATE/DELETE.
CREATE TABLE part6_audit_logs (
  seq        bigint PRIMARY KEY,
  id         text UNIQUE NOT NULL,
  ts         timestamptz NOT NULL,
  actor      jsonb  NOT NULL,
  action     text   NOT NULL,
  resource   jsonb,
  patient_id text,
  consent_id text,
  status     text   NOT NULL,
  reason     text,
  metadata   jsonb  NOT NULL DEFAULT '{}',
  prev_hash  text   NOT NULL,
  hash       text   NOT NULL
);
