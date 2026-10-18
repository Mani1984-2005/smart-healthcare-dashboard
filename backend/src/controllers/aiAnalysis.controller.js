import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import { runAiAnalysis } from '../services/aiAnalysis.service.js';

/**
 * POST /api/prescriptions/:id/analyze
 * Runs the offline AI Clinical Engine against a prescription's OCR text
 * and persists the structured result. Re-running replaces the previous
 * analysis for that prescription (one analysis per prescription).
 */
export const analyzePrescription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { knownAllergies = [] } = req.body || {};
  const auditCtx = auditContextFromRequest(req);

  const rxResult = await pool.query(`SELECT * FROM prescriptions WHERE id = $1`, [id]);
  if (rxResult.rows.length === 0) {
    throw AppError.notFound('Prescription not found');
  }
  const prescription = rxResult.rows[0];

  if (prescription.status !== 'ocr_complete') {
    throw AppError.conflict(
      `Cannot analyze this prescription yet — OCR status is "${prescription.status}". Wait for OCR to complete first.`
    );
  }
  if (!prescription.raw_ocr_text || !prescription.raw_ocr_text.trim()) {
    throw AppError.conflict('OCR completed but no text was extracted, so there is nothing to analyze.');
  }

  await recordAudit({ prescriptionId: id, action: 'AI_ANALYSIS_STARTED', ...auditCtx });

  let analysis;
  const client = await pool.connect();
  try {
    analysis = runAiAnalysis({ rawOcrText: prescription.raw_ocr_text, patientAllergies: knownAllergies });

    await client.query('BEGIN');

    // One analysis per prescription — replace any previous run.
    const upsert = await client.query(
      `INSERT INTO ai_analyses (
         prescription_id, patient_name, patient_name_confidence, doctor_name, doctor_name_confidence,
         diagnosis, diagnosis_confidence, summary, overall_confidence, risk_level,
         medicines_count, interactions_count, duplicates_count, allergy_warnings_count,
         contraindications_count, high_risk_count, analysis_version, known_allergies_input
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (prescription_id) DO UPDATE SET
         patient_name = EXCLUDED.patient_name,
         patient_name_confidence = EXCLUDED.patient_name_confidence,
         doctor_name = EXCLUDED.doctor_name,
         doctor_name_confidence = EXCLUDED.doctor_name_confidence,
         diagnosis = EXCLUDED.diagnosis,
         diagnosis_confidence = EXCLUDED.diagnosis_confidence,
         summary = EXCLUDED.summary,
         overall_confidence = EXCLUDED.overall_confidence,
         risk_level = EXCLUDED.risk_level,
         medicines_count = EXCLUDED.medicines_count,
         interactions_count = EXCLUDED.interactions_count,
         duplicates_count = EXCLUDED.duplicates_count,
         allergy_warnings_count = EXCLUDED.allergy_warnings_count,
         contraindications_count = EXCLUDED.contraindications_count,
         high_risk_count = EXCLUDED.high_risk_count,
         analysis_version = EXCLUDED.analysis_version,
         known_allergies_input = EXCLUDED.known_allergies_input,
         updated_at = now()
       RETURNING *`,
      [
        id,
        analysis.patientName,
        analysis.patientNameConfidence,
        analysis.doctorName,
        analysis.doctorNameConfidence,
        analysis.diagnosis,
        analysis.diagnosisConfidence,
        analysis.summary,
        analysis.overallConfidence,
        analysis.riskLevel,
        analysis.medicines.length,
        analysis.interactions.length,
        analysis.duplicates.length,
        analysis.allergyWarnings.length,
        analysis.contraindications.length,
        analysis.highRiskMedicines.length,
        analysis.version,
        knownAllergies,
      ]
    );
    const analysisRow = upsert.rows[0];
    const analysisId = analysisRow.id;

    // Clear previous child rows for a clean re-analysis
    await client.query(`DELETE FROM extracted_medicines WHERE analysis_id = $1`, [analysisId]);
    await client.query(`DELETE FROM drug_interactions_detected WHERE analysis_id = $1`, [analysisId]);
    await client.query(`DELETE FROM duplicate_medicine_flags WHERE analysis_id = $1`, [analysisId]);
    await client.query(`DELETE FROM allergy_warnings WHERE analysis_id = $1`, [analysisId]);
    await client.query(`DELETE FROM contraindication_flags WHERE analysis_id = $1`, [analysisId]);

    for (const med of analysis.medicines) {
      await client.query(
        `INSERT INTO extracted_medicines (
           analysis_id, raw_text, medicine_key, generic_name, matched_as, match_kind, category,
           dosage, dosage_amount, dosage_unit, frequency, frequency_code, duration, duration_days,
           route, is_high_risk, is_controlled, allergy_class, confidence
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
          analysisId, med.rawText, med.medicineId, med.genericName, med.matchedAs, med.matchKind, med.category,
          med.dosage, med.dosageAmount, med.dosageUnit, med.frequency, med.frequencyCode, med.duration, med.durationDays,
          med.route, med.isHighRisk, med.isControlled, med.allergyClass, med.confidence,
        ]
      );
    }

    for (const inter of analysis.interactions) {
      await client.query(
        `INSERT INTO drug_interactions_detected (analysis_id, medicine_a, medicine_b, severity, description)
         VALUES ($1,$2,$3,$4,$5)`,
        [analysisId, inter.medicineA, inter.medicineB, inter.severity, inter.description]
      );
    }

    for (const dup of analysis.duplicates) {
      await client.query(
        `INSERT INTO duplicate_medicine_flags (analysis_id, medicine_name, occurrence_count)
         VALUES ($1,$2,$3)`,
        [analysisId, dup.medicineName, dup.occurrenceCount]
      );
    }

    for (const warn of analysis.allergyWarnings) {
      await client.query(
        `INSERT INTO allergy_warnings (analysis_id, medicine_name, allergy_class, matched_allergy, severity, description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [analysisId, warn.medicineName, warn.allergyClass, warn.matchedAllergy, warn.severity, warn.description]
      );
    }

    for (const flag of analysis.contraindications) {
      await client.query(
        `INSERT INTO contraindication_flags (analysis_id, medicine_name, condition, severity, description)
         VALUES ($1,$2,$3,$4,$5)`,
        [analysisId, flag.medicineName, flag.condition, flag.severity, flag.description]
      );
    }

    await client.query('COMMIT');

    await recordAudit({
      prescriptionId: id,
      action: 'AI_ANALYSIS_COMPLETED',
      details: {
        medicinesFound: analysis.medicines.length,
        riskLevel: analysis.riskLevel,
        interactions: analysis.interactions.length,
        allergyWarnings: analysis.allergyWarnings.length,
      },
      ...auditCtx,
    });

    res.status(201).json({ success: true, data: await serializeFullAnalysis(analysisId) });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('AI analysis failed', { prescriptionId: id, error: err.message });
    await recordAudit({ prescriptionId: id, action: 'AI_ANALYSIS_FAILED', details: { error: err.message }, ...auditCtx });
    throw err;
  } finally {
    client.release();
  }
});

/**
 * GET /api/prescriptions/:id/analysis
 * Fetches the most recent stored AI analysis for a prescription.
 */
export const getPrescriptionAnalysis = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const analysisResult = await pool.query(`SELECT id FROM ai_analyses WHERE prescription_id = $1`, [id]);
  if (analysisResult.rows.length === 0) {
    throw AppError.notFound('No AI analysis found for this prescription yet. Run analysis first.');
  }

  await recordAudit({ prescriptionId: id, action: 'ANALYSIS_VIEWED', ...auditContextFromRequest(req) });

  res.json({ success: true, data: await serializeFullAnalysis(analysisResult.rows[0].id) });
});

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

async function serializeFullAnalysis(analysisId) {
  const [analysisRes, medsRes, interRes, dupRes, allergyRes, contraRes] = await Promise.all([
    pool.query(`SELECT * FROM ai_analyses WHERE id = $1`, [analysisId]),
    pool.query(`SELECT * FROM extracted_medicines WHERE analysis_id = $1 ORDER BY confidence DESC`, [analysisId]),
    pool.query(`SELECT * FROM drug_interactions_detected WHERE analysis_id = $1`, [analysisId]),
    pool.query(`SELECT * FROM duplicate_medicine_flags WHERE analysis_id = $1`, [analysisId]),
    pool.query(`SELECT * FROM allergy_warnings WHERE analysis_id = $1`, [analysisId]),
    pool.query(`SELECT * FROM contraindication_flags WHERE analysis_id = $1`, [analysisId]),
  ]);

  const a = analysisRes.rows[0];

  return {
    id: a.id,
    prescriptionId: a.prescription_id,
    patientName: a.patient_name,
    patientNameConfidence: numOrNull(a.patient_name_confidence),
    doctorName: a.doctor_name,
    doctorNameConfidence: numOrNull(a.doctor_name_confidence),
    diagnosis: a.diagnosis,
    diagnosisConfidence: numOrNull(a.diagnosis_confidence),
    summary: a.summary,
    overallConfidence: numOrNull(a.overall_confidence),
    riskLevel: a.risk_level,
    analysisVersion: a.analysis_version,
    knownAllergiesInput: a.known_allergies_input || [],
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    medicines: medsRes.rows.map(serializeMedicine),
    interactions: interRes.rows.map(serializeInteraction),
    duplicates: dupRes.rows.map((r) => ({
      medicineName: r.medicine_name,
      occurrenceCount: r.occurrence_count,
    })),
    allergyWarnings: allergyRes.rows.map((r) => ({
      medicineName: r.medicine_name,
      allergyClass: r.allergy_class,
      matchedAllergy: r.matched_allergy,
      severity: r.severity,
      description: r.description,
    })),
    contraindications: contraRes.rows.map((r) => ({
      medicineName: r.medicine_name,
      condition: r.condition,
      severity: r.severity,
      description: r.description,
    })),
  };
}

function serializeMedicine(r) {
  return {
    id: r.id,
    rawText: r.raw_text,
    medicineKey: r.medicine_key,
    genericName: r.generic_name,
    matchedAs: r.matched_as,
    matchKind: r.match_kind,
    category: r.category,
    dosage: r.dosage,
    dosageAmount: numOrNull(r.dosage_amount),
    dosageUnit: r.dosage_unit,
    frequency: r.frequency,
    frequencyCode: r.frequency_code,
    duration: r.duration,
    durationDays: r.duration_days,
    route: r.route,
    isHighRisk: r.is_high_risk,
    isControlled: r.is_controlled,
    allergyClass: r.allergy_class,
    confidence: numOrNull(r.confidence),
  };
}

function serializeInteraction(r) {
  return {
    medicineA: r.medicine_a,
    medicineB: r.medicine_b,
    severity: r.severity,
    description: r.description,
  };
}

function numOrNull(v) {
  return v === null || v === undefined ? null : Number(v);
}

export { serializeFullAnalysis, serializeMedicine };
