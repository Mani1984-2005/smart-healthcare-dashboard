-- =========================================================
-- MEDICARE PRO — PostgreSQL Schema (Part 1: Foundation & OCR)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE upload_source AS ENUM ('image', 'pdf', 'camera');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE processing_status AS ENUM ('uploaded', 'preprocessing', 'ocr_running', 'ocr_complete', 'ocr_failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'FILE_UPLOADED', 'FILE_DELETED', 'OCR_STARTED', 'OCR_COMPLETED',
    'OCR_FAILED', 'PRESCRIPTION_VIEWED', 'PRESCRIPTION_LIST_VIEWED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------
-- USERS (minimal — enough to attribute uploads/audit trail)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(150) NOT NULL DEFAULT 'Anonymous User',
  email         VARCHAR(255) UNIQUE,
  role          VARCHAR(50) NOT NULL DEFAULT 'staff',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A default system user so Part 1 works without an auth module.
INSERT INTO users (id, full_name, email, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'System User', 'system@medicare-pro.local', 'system')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------
-- PRESCRIPTIONS (uploaded document + OCR result)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,

  -- File metadata
  original_filename VARCHAR(500) NOT NULL,
  stored_filename   VARCHAR(500) NOT NULL,
  file_path         TEXT NOT NULL,
  file_size_bytes   BIGINT NOT NULL CHECK (file_size_bytes > 0),
  mime_type         VARCHAR(100) NOT NULL,
  upload_source     upload_source NOT NULL DEFAULT 'image',
  checksum_sha256   VARCHAR(64),

  -- Preprocessing metadata
  preprocessed_path TEXT,
  image_width       INTEGER,
  image_height       INTEGER,

  -- OCR results
  status            processing_status NOT NULL DEFAULT 'uploaded',
  raw_ocr_text      TEXT,
  ocr_confidence    NUMERIC(5,2),
  ocr_engine        VARCHAR(50) DEFAULT 'tesseract.js',
  ocr_language      VARCHAR(20) DEFAULT 'eng',
  ocr_duration_ms   INTEGER,
  error_message     TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_user_id ON prescriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at DESC);

-- ---------------------------------------------------------
-- AUDIT LOGS (enterprise traceability)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  action          audit_action NOT NULL,
  details         JSONB DEFAULT '{}'::jsonb,
  ip_address      VARCHAR(64),
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_prescription_id ON audit_logs(prescription_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ---------------------------------------------------------
-- updated_at auto-touch trigger
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prescriptions_updated_at ON prescriptions;
CREATE TRIGGER trg_prescriptions_updated_at
BEFORE UPDATE ON prescriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
