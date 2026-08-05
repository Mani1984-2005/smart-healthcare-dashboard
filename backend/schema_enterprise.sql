-- =========================================================
-- MEDICARE PRO — PostgreSQL Schema (Part 3A: Core Enterprise Integration)
-- Extends schema.sql + schema_ai.sql — run after both. Never redefines
-- Part 1 / Part 2 tables; only adds new tables and additive columns.
-- =========================================================

-- ---------------------------------------------------------
-- Extend audit_action with Part 3A event types
-- ---------------------------------------------------------
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PATIENT_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PATIENT_UPDATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PATIENT_VIEWED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PATIENT_LINKED_TO_PRESCRIPTION';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'DISPENSATION_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'DISPENSATION_UPDATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'LAB_REPORT_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'LAB_REPORT_VIEWED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'INVOICE_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'INVOICE_STATUS_CHANGED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'INVOICE_VIEWED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TIMELINE_VIEWED';

-- ---------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'unspecified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dispensation_status AS ENUM ('pending', 'partially_dispensed', 'dispensed', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lab_abnormal_flag AS ENUM ('normal', 'low', 'high', 'critical_low', 'critical_high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'partially_paid', 'void', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_line_item_type AS ENUM ('medicine', 'lab_test', 'consultation', 'service', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------
-- PATIENTS (Patient Management)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn                 VARCHAR(32) NOT NULL UNIQUE, -- Medical Record Number, e.g. MRN-000123
  full_name           VARCHAR(150) NOT NULL,
  date_of_birth       DATE,
  gender              gender_type NOT NULL DEFAULT 'unspecified',
  phone               VARCHAR(30),
  email               VARCHAR(255),
  address             TEXT,
  blood_type          VARCHAR(5),
  known_allergies     TEXT[] NOT NULL DEFAULT '{}',
  chronic_conditions  TEXT[] NOT NULL DEFAULT '{}',
  primary_physician   VARCHAR(150),
  emergency_contact_name  VARCHAR(150),
  emergency_contact_phone VARCHAR(30),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_full_name ON patients (LOWER(full_name));
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients (mrn);
CREATE INDEX IF NOT EXISTS idx_patients_is_active ON patients (is_active);

DROP TRIGGER IF EXISTS trg_patients_updated_at ON patients;
CREATE TRIGGER trg_patients_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Link prescriptions to a patient record (nullable — OCR-only flows still work)
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);

-- ---------------------------------------------------------
-- PHARMACIES + DISPENSATIONS (Pharmacy Integration)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pharmacies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(150) NOT NULL,
  license_number  VARCHAR(64) UNIQUE,
  phone           VARCHAR(30),
  email           VARCHAR(255),
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO pharmacies (id, name, license_number, phone, email, address)
VALUES ('00000000-0000-0000-0000-0000000000f1', 'Medicare Pro In-House Pharmacy', 'INHOUSE-0001', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS dispensations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id     UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  extracted_medicine_id UUID REFERENCES extracted_medicines(id) ON DELETE SET NULL,
  pharmacy_id         UUID NOT NULL REFERENCES pharmacies(id),
  medicine_name       VARCHAR(150) NOT NULL,
  quantity_prescribed NUMERIC(10,2),
  quantity_dispensed  NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit                VARCHAR(20),
  status              dispensation_status NOT NULL DEFAULT 'pending',
  dispensed_by        VARCHAR(150),
  dispensed_at        TIMESTAMPTZ,
  substitution_of     VARCHAR(150), -- generic/brand substitution note
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispensations_prescription_id ON dispensations(prescription_id);
CREATE INDEX IF NOT EXISTS idx_dispensations_pharmacy_id ON dispensations(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_dispensations_status ON dispensations(status);

DROP TRIGGER IF EXISTS trg_dispensations_updated_at ON dispensations;
CREATE TRIGGER trg_dispensations_updated_at
BEFORE UPDATE ON dispensations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------
-- LAB REPORTS (Lab Reports Integration)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescription_id   UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  test_name         VARCHAR(150) NOT NULL,
  test_code         VARCHAR(50),
  panel_name        VARCHAR(150),
  result_value      VARCHAR(50) NOT NULL,
  unit              VARCHAR(30),
  reference_range   VARCHAR(50),
  abnormal_flag     lab_abnormal_flag NOT NULL DEFAULT 'normal',
  ordered_by        VARCHAR(150),
  performed_by_lab  VARCHAR(150),
  report_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  file_path         TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_id ON lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_prescription_id ON lab_reports(prescription_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_test_code ON lab_reports(test_code);
CREATE INDEX IF NOT EXISTS idx_lab_reports_report_date ON lab_reports(report_date DESC);

-- Cross-checks a prescribed medicine against an abnormal lab result
-- (e.g. nephrotoxic drug + abnormal creatinine). Populated by the
-- lab-safety correlation service when a new report or analysis lands.
CREATE TABLE IF NOT EXISTS lab_medicine_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_report_id   UUID NOT NULL REFERENCES lab_reports(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name   VARCHAR(150) NOT NULL,
  severity        interaction_severity NOT NULL DEFAULT 'moderate',
  description     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_medicine_flags_lab_report_id ON lab_medicine_flags(lab_report_id);
CREATE INDEX IF NOT EXISTS idx_lab_medicine_flags_prescription_id ON lab_medicine_flags(prescription_id);

-- ---------------------------------------------------------
-- BILLING (Billing Integration)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(32) NOT NULL UNIQUE, -- e.g. INV-2026-000123
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  status          invoice_status NOT NULL DEFAULT 'draft',
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,4) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date        DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_prescription_id ON invoices(prescription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type       invoice_line_item_type NOT NULL DEFAULT 'other',
  reference_id    UUID, -- e.g. extracted_medicines.id or lab_reports.id, not FK-enforced (polymorphic)
  description     VARCHAR(300) NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Simple, extensible price list used by the billing engine to price
-- extracted medicines. Real deployments would replace this with a
-- pharmacy formulary / ERP price feed behind the same repository interface.
CREATE TABLE IF NOT EXISTS price_list (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type       invoice_line_item_type NOT NULL,
  item_key        VARCHAR(100) NOT NULL, -- e.g. medicine_key 'metformin', or 'consultation_standard'
  display_name    VARCHAR(150) NOT NULL,
  unit_price      NUMERIC(12,2) NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_type, item_key)
);

CREATE INDEX IF NOT EXISTS idx_price_list_item_key ON price_list(item_key);

-- Seed a minimal, editable price list so billing works out of the box.
-- Real deployments overwrite/extend this via the formulary import job.
INSERT INTO price_list (item_type, item_key, display_name, unit_price, currency) VALUES
  ('service', 'consultation_standard', 'Standard Consultation Fee', 25.00, 'USD'),
  ('lab_test', 'lab_test_default', 'Laboratory Test (default)', 15.00, 'USD'),
  ('medicine', 'medicine_default', 'Prescribed Medicine (default unit price)', 5.00, 'USD'),
  ('medicine', 'paracetamol', 'Paracetamol', 2.00, 'USD'),
  ('medicine', 'ibuprofen', 'Ibuprofen', 3.00, 'USD'),
  ('medicine', 'metformin', 'Metformin', 4.50, 'USD'),
  ('medicine', 'amoxicillin', 'Amoxicillin', 6.00, 'USD')
ON CONFLICT (item_type, item_key) DO NOTHING;
