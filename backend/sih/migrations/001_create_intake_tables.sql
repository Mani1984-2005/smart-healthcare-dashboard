-- backend/migrations/001_create_intake_tables.sql
--
-- Team 1 — AI Clinical Intake Engine — additive schema.
--
-- STATUS: NOT EXECUTED. This file has been written but deliberately NOT
-- run against any database, because:
--   1. DATABASE_URL is not set in this environment and no local
--      Postgres instance is reachable (verified: connection refused on
--      127.0.0.1:5432), so there is no live database to run it against.
--   2. The real `patients.id` column type/name could not be found
--      anywhere in the source repository (no CREATE TABLE for
--      `patients` exists in the codebase) and therefore could not be
--      verified, per the explicit instruction not to guess it.
--
-- RESOLUTION APPLIED (documented, not silent): `patient_id` below is
-- stored as TEXT with NO foreign-key constraint to `patients(id)`.
-- This lets the column hold an integer-serial ID, a UUID, or a text ID
-- equally well without asserting a type match that hasn't been
-- verified. Referential integrity to `patients` is therefore enforced
-- at the APPLICATION layer (intakeService.js checks the patient exists
-- via the existing patients query before creating a session), not at
-- the database layer, until `patients.id`'s real type is confirmed —
-- at which point this migration should be revised to add a proper
-- FOREIGN KEY constraint and, ideally, a matching column type.
--
-- Everything else is additive only: no existing table (including
-- `patients`) is modified, altered, or dropped by this file.

CREATE TABLE IF NOT EXISTS intake_sessions (
  id                    UUID PRIMARY KEY,                 -- generated application-side via crypto.randomUUID()
  patient_id            TEXT NOT NULL,                    -- NOT a verified FK — see note above
  encounter_id          TEXT NULL,                        -- reserved for future Team 5/6 integration; unused by Team 1
  status                TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED','IN_PROGRESS','PAUSED','COMPLETED')),
  language              TEXT NULL,
  interaction_mode      TEXT NULL CHECK (interaction_mode IS NULL OR interaction_mode IN ('TEXT','TOUCH','VOICE')),
  intake_mode           TEXT NOT NULL DEFAULT 'STANDARD' CHECK (intake_mode IN ('STANDARD','AYUSH')),
  consent_given         BOOLEAN NOT NULL DEFAULT FALSE,
  consent_captured_at   TIMESTAMPTZ NULL,
  session_token_hash    TEXT NULL,                        -- SHA-256 hash only; raw token is never stored
  created_by_staff_uid  TEXT NULL,                         -- Firebase UID of the staff member who created the session
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_intake_sessions_patient_id ON intake_sessions (patient_id);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_status ON intake_sessions (status);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id            UUID PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES intake_sessions(id),
  role          TEXT NOT NULL CHECK (role IN ('SYSTEM','ASSISTANT','PATIENT')),
  content       TEXT NOT NULL,
  input_mode    TEXT NULL CHECK (input_mode IS NULL OR input_mode IN ('TEXT','TOUCH','VOICE')),
  language      TEXT NULL,
  question_id   TEXT NULL,                                -- refers to the in-code question registry, not a DB table
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id ON conversation_messages (session_id);

CREATE TABLE IF NOT EXISTS intake_answers (
  id                  UUID PRIMARY KEY,
  session_id          UUID NOT NULL REFERENCES intake_sessions(id),
  question_id         TEXT NOT NULL,
  section             TEXT NOT NULL,
  answer_type         TEXT NOT NULL,
  raw_value           JSONB NOT NULL,
  certainty           TEXT NOT NULL CHECK (certainty IN ('CONFIRMED','UNCERTAIN','UNKNOWN','DENIED')),
  source              TEXT NOT NULL CHECK (source IN ('PATIENT_TEXT','PATIENT_VOICE','OCR_DOCUMENT','CLINICIAN_ENTERED','SYSTEM_STRUCTURED','AI_DERIVED')),
  source_message_id   UUID NULL REFERENCES conversation_messages(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id),
  -- Application-enforced too (clinicalHistoryService.assertSafeFact), but
  -- defense-in-depth at the DB layer costs nothing here:
  CHECK (NOT (source = 'AI_DERIVED' AND certainty = 'CONFIRMED'))
);

CREATE INDEX IF NOT EXISTS idx_intake_answers_session_id ON intake_answers (session_id);

CREATE TABLE IF NOT EXISTS clinical_histories (
  id                  UUID PRIMARY KEY,
  session_id          UUID NOT NULL UNIQUE REFERENCES intake_sessions(id),
  patient_id          TEXT NOT NULL,                      -- denormalized, same caveat as intake_sessions.patient_id
  history_json        JSONB NOT NULL,
  completion_status    TEXT NOT NULL DEFAULT 'INCOMPLETE' CHECK (completion_status IN ('INCOMPLETE','COMPLETE')),
  version             INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_clinical_histories_patient_id ON clinical_histories (patient_id);

-- ROLLBACK (down-migration) — additive-only tables, safe to drop without
-- touching any pre-existing MediCare Pro table:
--
-- DROP TABLE IF EXISTS clinical_histories;
-- DROP TABLE IF EXISTS intake_answers;
-- DROP TABLE IF EXISTS conversation_messages;
-- DROP TABLE IF EXISTS intake_sessions;
