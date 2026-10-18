import pool from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';

const VALID_RISK_LEVELS = new Set(['low', 'medium', 'high', 'critical']);

/**
 * GET /api/search
 * Advanced search across AI-analyzed prescriptions.
 *
 * Query params (all optional, combinable):
 *   q            - free text, matched against patient/doctor/diagnosis/medicine names
 *   medicineName - filter to analyses containing this medicine (generic or brand)
 *   patientName  - filter by patient name (partial match)
 *   doctorName   - filter by doctor name (partial match)
 *   diagnosis    - filter by diagnosis text (partial match)
 *   riskLevel    - low | medium | high | critical
 *   dateFrom     - ISO date, inclusive
 *   dateTo       - ISO date, inclusive
 *   page, limit  - pagination
 */
export const advancedSearch = asyncHandler(async (req, res) => {
  const {
    q,
    medicineName,
    patientName,
    doctorName,
    diagnosis,
    riskLevel,
    dateFrom,
    dateTo,
  } = req.query;

  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  const offset = (page - 1) * limit;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (riskLevel && VALID_RISK_LEVELS.has(riskLevel)) {
    conditions.push(`a.risk_level = $${idx++}`);
    values.push(riskLevel);
  }
  if (patientName) {
    conditions.push(`a.patient_name ILIKE $${idx++}`);
    values.push(`%${patientName}%`);
  }
  if (doctorName) {
    conditions.push(`a.doctor_name ILIKE $${idx++}`);
    values.push(`%${doctorName}%`);
  }
  if (diagnosis) {
    conditions.push(`a.diagnosis ILIKE $${idx++}`);
    values.push(`%${diagnosis}%`);
  }
  if (dateFrom) {
    conditions.push(`a.created_at >= $${idx++}`);
    values.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`a.created_at <= $${idx++}`);
    values.push(dateTo);
  }
  if (medicineName) {
    conditions.push(
      `EXISTS (SELECT 1 FROM extracted_medicines em WHERE em.analysis_id = a.id AND (em.generic_name ILIKE $${idx} OR em.matched_as ILIKE $${idx}))`
    );
    values.push(`%${medicineName}%`);
    idx++;
  }
  if (q) {
    conditions.push(
      `(a.patient_name ILIKE $${idx} OR a.doctor_name ILIKE $${idx} OR a.diagnosis ILIKE $${idx}
        OR EXISTS (SELECT 1 FROM extracted_medicines em WHERE em.analysis_id = a.id AND em.generic_name ILIKE $${idx}))`
    );
    values.push(`%${q}%`);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const listQuery = `
    SELECT
      a.id, a.prescription_id, a.patient_name, a.doctor_name, a.diagnosis,
      a.risk_level, a.overall_confidence, a.medicines_count, a.interactions_count,
      a.allergy_warnings_count, a.high_risk_count, a.created_at,
      p.original_filename,
      COALESCE(
        (SELECT array_agg(DISTINCT em.generic_name) FROM extracted_medicines em WHERE em.analysis_id = a.id),
        '{}'
      ) AS medicine_names
    FROM ai_analyses a
    JOIN prescriptions p ON p.id = a.prescription_id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  const countQuery = `SELECT COUNT(*)::int AS total FROM ai_analyses a JOIN prescriptions p ON p.id = a.prescription_id ${whereClause}`;

  const [rows, count] = await Promise.all([
    pool.query(listQuery, [...values, limit, offset]),
    pool.query(countQuery, values),
  ]);

  await recordAudit({
    action: 'SEARCH_PERFORMED',
    details: { q, medicineName, patientName, doctorName, diagnosis, riskLevel, resultCount: rows.rows.length },
    ...auditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: rows.rows.map((r) => ({
      analysisId: r.id,
      prescriptionId: r.prescription_id,
      originalFilename: r.original_filename,
      patientName: r.patient_name,
      doctorName: r.doctor_name,
      diagnosis: r.diagnosis,
      riskLevel: r.risk_level,
      overallConfidence: r.overall_confidence !== null ? Number(r.overall_confidence) : null,
      medicinesCount: r.medicines_count,
      interactionsCount: r.interactions_count,
      allergyWarningsCount: r.allergy_warnings_count,
      highRiskCount: r.high_risk_count,
      medicineNames: r.medicine_names,
      createdAt: r.created_at,
    })),
    pagination: {
      page,
      limit,
      total: count.rows[0].total,
      totalPages: Math.ceil(count.rows[0].total / limit),
    },
  });
});
