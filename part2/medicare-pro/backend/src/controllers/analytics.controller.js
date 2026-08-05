import pool from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';

/**
 * GET /api/analytics/dashboard
 * Aggregated statistics across all AI-analyzed prescriptions, for the
 * enterprise analytics dashboard.
 */
export const getAnalyticsDashboard = asyncHandler(async (req, res) => {
  const [
    totals,
    riskDistribution,
    topMedicines,
    topInteractions,
    trend,
    recentHighRisk,
  ] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM prescriptions) AS total_prescriptions,
        (SELECT COUNT(*)::int FROM ai_analyses) AS total_analyses,
        (SELECT COALESCE(ROUND(AVG(overall_confidence)::numeric, 2), 0) FROM ai_analyses) AS avg_confidence,
        (SELECT COUNT(*)::int FROM allergy_warnings) AS total_allergy_warnings,
        (SELECT COUNT(*)::int FROM drug_interactions_detected) AS total_interactions,
        (SELECT COUNT(*)::int FROM duplicate_medicine_flags) AS total_duplicates,
        (SELECT COUNT(*)::int FROM extracted_medicines WHERE is_high_risk = true) AS total_high_risk_medicines
    `),
    pool.query(`
      SELECT risk_level, COUNT(*)::int AS count
      FROM ai_analyses
      GROUP BY risk_level
    `),
    pool.query(`
      SELECT generic_name, COUNT(*)::int AS count
      FROM extracted_medicines
      GROUP BY generic_name
      ORDER BY count DESC
      LIMIT 10
    `),
    pool.query(`
      SELECT medicine_a, medicine_b, severity, COUNT(*)::int AS count
      FROM drug_interactions_detected
      GROUP BY medicine_a, medicine_b, severity
      ORDER BY count DESC
      LIMIT 10
    `),
    pool.query(`
      SELECT DATE(created_at) AS day, COUNT(*)::int AS count
      FROM ai_analyses
      WHERE created_at >= now() - interval '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `),
    pool.query(`
      SELECT a.id, a.prescription_id, a.patient_name, a.risk_level, a.created_at, p.original_filename
      FROM ai_analyses a
      JOIN prescriptions p ON p.id = a.prescription_id
      WHERE a.risk_level IN ('high', 'critical')
      ORDER BY a.created_at DESC
      LIMIT 10
    `),
  ]);

  await recordAudit({ action: 'ANALYTICS_VIEWED', ...auditContextFromRequest(req) });

  const t = totals.rows[0];

  const riskMap = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const row of riskDistribution.rows) riskMap[row.risk_level] = row.count;

  res.json({
    success: true,
    data: {
      totals: {
        totalPrescriptions: t.total_prescriptions,
        totalAnalyses: t.total_analyses,
        avgConfidence: Number(t.avg_confidence),
        totalAllergyWarnings: t.total_allergy_warnings,
        totalInteractions: t.total_interactions,
        totalDuplicates: t.total_duplicates,
        totalHighRiskMedicines: t.total_high_risk_medicines,
      },
      riskDistribution: riskMap,
      topMedicines: topMedicines.rows.map((r) => ({ name: r.generic_name, count: r.count })),
      topInteractions: topInteractions.rows.map((r) => ({
        medicineA: r.medicine_a,
        medicineB: r.medicine_b,
        severity: r.severity,
        count: r.count,
      })),
      analysesOverTime: trend.rows.map((r) => ({ date: r.day, count: r.count })),
      recentHighRiskAnalyses: recentHighRisk.rows.map((r) => ({
        analysisId: r.id,
        prescriptionId: r.prescription_id,
        patientName: r.patient_name,
        riskLevel: r.risk_level,
        originalFilename: r.original_filename,
        createdAt: r.created_at,
      })),
    },
  });
});
