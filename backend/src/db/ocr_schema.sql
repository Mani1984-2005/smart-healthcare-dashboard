
BEGIN;

-- =====================================================
-- MEDICARE PRO: ISOLATED PRESCRIPTION OCR STORAGE
-- Compatible with existing INTEGER patient/doctor IDs
-- Does not modify existing prescription tables
-- =====================================================

-- 1. Prescription uploads and OCR results
CREATE TABLE IF NOT EXISTS public.prescription_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    patient_id INTEGER
        REFERENCES public.patients(id) ON DELETE SET NULL,

    doctor_id INTEGER
        REFERENCES public.doctors(id) ON DELETE SET NULL,

    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,

    file_size_bytes BIGINT NOT NULL
        CHECK (file_size_bytes > 0),

    mime_type VARCHAR(100) NOT NULL,

    upload_source VARCHAR(20) NOT NULL
        CHECK (upload_source IN ('image', 'pdf', 'camera')),

    checksum_sha256 CHAR(64),

    preprocessed_path TEXT,

    image_width INTEGER CHECK (image_width IS NULL OR image_width > 0),
    image_height INTEGER CHECK (image_height IS NULL OR image_height > 0),

    raw_ocr_text TEXT,

    ocr_confidence NUMERIC(5,2)
        CHECK (
            ocr_confidence IS NULL
            OR ocr_confidence BETWEEN 0 AND 100
        ),

    ocr_duration_ms INTEGER
        CHECK (ocr_duration_ms IS NULL OR ocr_duration_ms >= 0),

    ocr_language VARCHAR(20),
    ocr_engine VARCHAR(50),

    status VARCHAR(30) NOT NULL DEFAULT 'uploaded'
        CHECK (
            status IN (
                'uploaded',
                'preprocessing',
                'ocr_running',
                'ocr_complete',
                'ocr_failed'
            )
        ),

    error_message TEXT,

    -- Soft deletion: preserve record and audit history
    deleted_at TIMESTAMP WITHOUT TIME ZONE,

    created_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- 2. Independent audit history
CREATE TABLE IF NOT EXISTS public.prescription_upload_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    upload_id UUID NOT NULL
        REFERENCES public.prescription_uploads(id)
        ON DELETE RESTRICT,

    action VARCHAR(50) NOT NULL,

    details JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Text attribution avoids assuming a users table exists
    actor_label TEXT,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_prescription_uploads_patient
    ON public.prescription_uploads(patient_id);

CREATE INDEX IF NOT EXISTS idx_prescription_uploads_doctor
    ON public.prescription_uploads(doctor_id);

CREATE INDEX IF NOT EXISTS idx_prescription_uploads_status
    ON public.prescription_uploads(status);

CREATE INDEX IF NOT EXISTS idx_prescription_uploads_created
    ON public.prescription_uploads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prescription_uploads_active
    ON public.prescription_uploads(created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prescription_upload_audit_upload
    ON public.prescription_upload_audit(upload_id, created_at DESC);


-- 4. Automatic updated_at handling
CREATE OR REPLACE FUNCTION public.touch_prescription_upload_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prescription_upload_updated_at
    ON public.prescription_uploads;

CREATE TRIGGER trg_prescription_upload_updated_at
BEFORE UPDATE ON public.prescription_uploads
FOR EACH ROW
EXECUTE FUNCTION public.touch_prescription_upload_updated_at();

COMMIT;
