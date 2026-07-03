-- =========================================================
-- MEDICARE PRO — PostgreSQL Schema (Part 3B: Enterprise Workflow & Security)
-- Extends schema.sql + schema_ai.sql + schema_enterprise.sql. Run last.
-- Never redefines earlier tables; only adds new tables/columns.
-- =========================================================

-- ---------------------------------------------------------
-- Extend audit_action with Part 3B event types
-- ---------------------------------------------------------
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ROLE_ASSIGNED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ROLE_REVOKED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'QR_CODE_GENERATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'BIOMETRIC_CREDENTIAL_REGISTERED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'BIOMETRIC_AUTH_SUCCEEDED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'BIOMETRIC_CREDENTIAL_REVOKED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'CLINICAL_ASSISTANT_QUERIED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'APPROVAL_REQUESTED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'APPROVAL_GRANTED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'APPROVAL_REJECTED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'APPROVAL_ESCALATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ENTITY_VERSION_RESTORED';

-- ---------------------------------------------------------
-- USERS — additive columns for Keycloak-backed identity
-- ---------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS keycloak_subject_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------
-- RBAC — roles, permissions, and their many-to-many wiring.
-- `role` VARCHAR on users (Part 1) is kept for backward compatibility;
-- user_roles is the source of truth going forward and supports multiple
-- roles per user, matching how Keycloak realm roles work.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('doctor', 'Prescribing clinician'),
  ('nurse', 'Clinical support staff'),
  ('pharmacist', 'Dispensing and pharmacy operations'),
  ('lab_technician', 'Lab result entry'),
  ('billing_clerk', 'Billing and invoicing'),
  ('receptionist', 'Front-desk / patient intake'),
  ('auditor', 'Read-only compliance access'),
  ('patient', 'Patient portal access'),
  ('system', 'Internal service account')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (key, description) VALUES
  ('prescription:read', 'View prescriptions'),
  ('prescription:write', 'Create/edit prescriptions'),
  ('prescription:approve', 'Approve prescription-related workflow steps'),
  ('patient:read', 'View patient records'),
  ('patient:write', 'Create/edit patient records'),
  ('billing:read', 'View invoices'),
  ('billing:write', 'Create/edit invoices'),
  ('billing:approve', 'Approve billing actions (e.g. void/refund)'),
  ('pharmacy:dispense', 'Dispense medicines, manage barcode catalog'),
  ('lab:write', 'Enter lab reports'),
  ('clinical_assistant:use', 'Query the AI clinical assistant'),
  ('notification:manage', 'Manage notification templates/preferences'),
  ('approval:decide', 'Approve/reject/escalate review requests'),
  ('version_history:read', 'View entity version history'),
  ('version_history:restore', 'Restore an entity to a prior version'),
  ('rbac:manage', 'Manage roles and role assignments'),
  ('biometric:manage', 'Manage biometric credential enrollment')
ON CONFLICT (key) DO NOTHING;

-- admin: every permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name IN ('admin', 'system')
ON CONFLICT DO NOTHING;

-- doctor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'prescription:read','prescription:write','prescription:approve','patient:read','patient:write',
  'lab:write','clinical_assistant:use','approval:decide','version_history:read'
) WHERE r.name = 'doctor' ON CONFLICT DO NOTHING;

-- nurse
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'prescription:read','patient:read','patient:write','clinical_assistant:use','version_history:read'
) WHERE r.name = 'nurse' ON CONFLICT DO NOTHING;

-- pharmacist
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'prescription:read','pharmacy:dispense','approval:decide','version_history:read'
) WHERE r.name = 'pharmacist' ON CONFLICT DO NOTHING;

-- lab_technician
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'lab:write','patient:read','version_history:read'
) WHERE r.name = 'lab_technician' ON CONFLICT DO NOTHING;

-- billing_clerk
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'billing:read','billing:write','patient:read','version_history:read'
) WHERE r.name = 'billing_clerk' ON CONFLICT DO NOTHING;

-- receptionist
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'patient:read','patient:write','prescription:read'
) WHERE r.name = 'receptionist' ON CONFLICT DO NOTHING;

-- auditor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'prescription:read','billing:read','patient:read','version_history:read'
) WHERE r.name = 'auditor' ON CONFLICT DO NOTHING;

-- patient
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN (
  'prescription:read','billing:read'
) WHERE r.name = 'patient' ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------
-- BARCODE / QR SCANNER INTEGRATION
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicine_barcodes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode      VARCHAR(64) NOT NULL UNIQUE,
  item_key     VARCHAR(100) NOT NULL, -- maps to price_list.item_key / medicineDatabase id
  display_name VARCHAR(150) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64) UNIQUE;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64) UNIQUE;

DO $$ BEGIN
  CREATE TYPE scan_type AS ENUM ('barcode', 'qr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS scan_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type            scan_type NOT NULL,
  code_value           VARCHAR(128) NOT NULL,
  resolved_entity_type VARCHAR(50),
  resolved_entity_id   UUID,
  scanned_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  device_info          JSONB DEFAULT '{}'::jsonb,
  was_successful       BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_events_code_value ON scan_events(code_value);
CREATE INDEX IF NOT EXISTS idx_scan_events_created_at ON scan_events(created_at DESC);

-- ---------------------------------------------------------
-- BIOMETRIC AUTHENTICATION READINESS (WebAuthn-shaped)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS biometric_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id VARCHAR(255) NOT NULL UNIQUE,
  public_key    TEXT NOT NULL, -- PEM-encoded
  device_label  VARCHAR(150),
  modality      VARCHAR(30) NOT NULL DEFAULT 'platform', -- platform | cross-platform | fingerprint | face
  sign_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user_id ON biometric_credentials(user_id);

CREATE TABLE IF NOT EXISTS biometric_challenges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose      VARCHAR(30) NOT NULL, -- registration | authentication
  challenge    VARCHAR(255) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biometric_challenges_user_id ON biometric_challenges(user_id);

-- ---------------------------------------------------------
-- AI CLINICAL ASSISTANT — session + message log
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_assistant_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  patient_id      UUID REFERENCES patients(id) ON DELETE SET NULL,
  started_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TYPE clinical_message_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS clinical_assistant_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES clinical_assistant_sessions(id) ON DELETE CASCADE,
  role           clinical_message_role NOT NULL,
  content        TEXT NOT NULL,
  provider       VARCHAR(50),
  grounding_refs JSONB DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_assistant_messages_session_id ON clinical_assistant_messages(session_id);

-- ---------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    VARCHAR(50) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  entity_type VARCHAR(50),
  entity_id   UUID,
  priority    VARCHAR(10) NOT NULL DEFAULT 'normal', -- low | normal | high
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  channels         JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
  categories_muted JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- REVIEW & APPROVAL WORKFLOW
-- ---------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS approval_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    VARCHAR(50) NOT NULL,
  entity_id      UUID NOT NULL,
  action         VARCHAR(100) NOT NULL,
  requested_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  required_role  VARCHAR(50),
  payload        JSONB DEFAULT '{}'::jsonb,
  reason         TEXT,
  status         approval_status NOT NULL DEFAULT 'pending',
  decided_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_note  TEXT,
  decided_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS approval_actions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id  UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  actor_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  action               VARCHAR(30) NOT NULL, -- submitted | approved | rejected | escalated
  note                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request_id ON approval_actions(approval_request_id);

-- ---------------------------------------------------------
-- VERSION HISTORY (generic, entity-agnostic snapshots)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    VARCHAR(50) NOT NULL,
  entity_id      UUID NOT NULL,
  version_number INTEGER NOT NULL,
  payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  change_reason  VARCHAR(200),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_entity_versions_entity ON entity_versions(entity_type, entity_id);
