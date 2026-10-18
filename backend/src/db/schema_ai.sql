-- =========================================================
-- MEDICARE PRO — PostgreSQL Schema (Part 2: AI Intelligence)
-- Extends schema.sql — run after it. Never redefines Part 1 tables.
-- =========================================================

-- ---------------------------------------------------------
-- Extend the audit_action enum with Part 2 event types
-- ---------------------------------------------------------
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'AI_ANALYSIS_STARTED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'AI_ANALYSIS_COMPLETED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'AI_ANALYSIS_FAILED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ANALYSIS_VIEWED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ANALYTICS_VIEWED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'SEARCH_PERFORMED';

-- ---------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE interaction_severity AS ENUM ('minor', 'moderate', 'major', 'contraindicated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------
-- AI_ANALYSES — one row per prescription analysis run
-- (re-running analysis overwrites the previous row for that prescription)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_analyses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id       UUID NOT NULL UNIQUE REFERENCES prescriptions(id) ON DELETE CASCADE,

  patient_name          VARCHAR(150),
  patient_name_confidence NUMERIC(4,2),
  doctor_name           VARCHAR(150),
  doctor_name_confidence NUMERIC(4,2),
  diagnosis             VARCHAR(300),
  diagnosis_confidence  NUMERIC(4,2),

  summary               TEXT,
  overall_confidence    NUMERIC(4,2) NOT NULL DEFAULT 0,
  risk_level            risk_level NOT NULL DEFAULT 'low',

  medicines_count           INTEGER NOT NULL DEFAULT 0,
  interactions_count        INTEGER NOT NULL DEFAULT 0,
  duplicates_count           INTEGER NOT NULL DEFAULT 0,
  allergy_warnings_count    INTEGER NOT NULL DEFAULT 0,
  contraindications_count  INTEGER NOT NULL DEFAULT 0,
  high_risk_count            INTEGER NOT NULL DEFAULT 0,

  analysis_version      VARCHAR(50) NOT NULL DEFAULT 'part2-rule-engine-v1',
  known_allergies_input TEXT[],

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_prescription_id ON ai_analyses(prescription_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_risk_level ON ai_analyses(risk_level);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_patient_name ON ai_analyses (LOWER(patient_name));
CREATE INDEX IF NOT EXISTS idx_ai_analyses_doctor_name ON ai_analyses (LOWER(doctor_name));

-- ---------------------------------------------------------
-- EXTRACTED_MEDICINES — every medicine line recognized in an analysis
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS extracted_medicines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id       UUID NOT NULL REFERENCES ai_analyses(id) ON DELETE CASCADE,

  raw_text          TEXT NOT NULL,
  medicine_key      VARCHAR(100) NOT NULL,       -- KB slug, e.g. 'metformin'
  generic_name      VARCHAR(150) NOT NULL,
  matched_as        VARCHAR(150),
  match_kind        VARCHAR(20),                  -- 'generic' | 'brand'
  category          VARCHAR(150),

  dosage            VARCHAR(50),
  dosage_amount     NUMERIC(10,2),
  dosage_unit       VARCHAR(20),
  frequency         VARCHAR(80),
  frequency_code    VARCHAR(20),
  duration          VARCHAR(50),
  duration_days     INTEGER,
  route             VARCHAR(30),

  is_high_risk      BOOLEAN NOT NULL DEFAULT false,
  is_controlled     BOOLEAN NOT NULL DEFAULT false,
  allergy_class     VARCHAR(50),
  confidence        NUMERIC(4,2) NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extracted_medicines_analysis_id ON extracted_medicines(analysis_id);
CREATE INDEX IF NOT EXISTS idx_extracted_medicines_medicine_key ON extracted_medicines(medicine_key);
CREATE INDEX IF NOT EXISTS idx_extracted_medicines_generic_name ON extracted_medicines (LOWER(generic_name));

-- ---------------------------------------------------------
-- DRUG_INTERACTIONS_DETECTED — pairwise interactions found per analysis
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS drug_interactions_detected (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id     UUID NOT NULL REFERENCES ai_analyses(id) ON DELETE CASCADE,
  medicine_a      VARCHAR(150) NOT NULL,
  medicine_b      VARCHAR(150) NOT NULL,
  severity        interaction_severity NOT NULL,
  description     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drug_interactions_analysis_id ON drug_interactions_detected(analysis_id);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_severity ON drug_interactions_detected(severity);

-- ---------------------------------------------------------
-- DUPLICATE_MEDICINE_FLAGS — repeated-drug prescribing errors per analysis
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS duplicate_medicine_flags (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id       UUID NOT NULL REFERENCES ai_analyses(id) ON DELETE CASCADE,
  medicine_name     VARCHAR(150) NOT NULL,
  occurrence_count  INTEGER NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duplicate_flags_analysis_id ON duplicate_medicine_flags(analysis_id);

-- ---------------------------------------------------------
-- ALLERGY_WARNINGS — allergy conflicts found per analysis
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS allergy_warnings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id       UUID NOT NULL REFERENCES ai_analyses(id) ON DELETE CASCADE,
  medicine_name     VARCHAR(150) NOT NULL,
  allergy_class     VARCHAR(100),
  matched_allergy   VARCHAR(150),
  severity          interaction_severity NOT NULL DEFAULT 'contraindicated',
  description       TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allergy_warnings_analysis_id ON allergy_warnings(analysis_id);

-- ---------------------------------------------------------
-- CONTRAINDICATION_FLAGS — diagnosis-vs-medicine conflicts per analysis
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS contraindication_flags (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id       UUID NOT NULL REFERENCES ai_analyses(id) ON DELETE CASCADE,
  medicine_name     VARCHAR(150) NOT NULL,
  condition         VARCHAR(150) NOT NULL,
  severity          interaction_severity NOT NULL DEFAULT 'major',
  description       TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contraindication_flags_analysis_id ON contraindication_flags(analysis_id);

-- ---------------------------------------------------------
-- updated_at auto-touch trigger (reuses Part 1's set_updated_at())
-- ---------------------------------------------------------
DROP TRIGGER IF EXISTS trg_ai_analyses_updated_at ON ai_analyses;
CREATE TRIGGER trg_ai_analyses_updated_at
BEFORE UPDATE ON ai_analyses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
