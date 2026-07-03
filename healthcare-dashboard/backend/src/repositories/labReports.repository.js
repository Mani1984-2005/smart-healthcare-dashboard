import pool from '../config/db.js';

export async function insertLabReport(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO lab_reports (
       patient_id, prescription_id, test_name, test_code, panel_name, result_value,
       unit, reference_range, abnormal_flag, ordered_by, performed_by_lab,
       report_date, file_path, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      data.patientId, data.prescriptionId, data.testName, data.testCode, data.panelName,
      data.resultValue, data.unit, data.referenceRange, data.abnormalFlag, data.orderedBy,
      data.performedByLab, data.reportDate, data.filePath, data.notes,
    ]
  );
  return rows[0];
}

export async function findLabReportById(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM lab_reports WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function listLabReportsByPatient(patientId, { limit = 50, offset = 0 } = {}, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM lab_reports WHERE patient_id = $1 ORDER BY report_date DESC, created_at DESC LIMIT $2 OFFSET $3`,
    [patientId, limit, offset]
  );
  return rows;
}

export async function listLabReportsByPrescription(prescriptionId, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM lab_reports WHERE prescription_id = $1 ORDER BY report_date DESC`,
    [prescriptionId]
  );
  return rows;
}

export async function insertLabMedicineFlag(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO lab_medicine_flags (lab_report_id, prescription_id, medicine_name, severity, description)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [data.labReportId, data.prescriptionId, data.medicineName, data.severity, data.description]
  );
  return rows[0];
}

export async function listLabMedicineFlagsForReport(labReportId, client = pool) {
  const { rows } = await client.query(`SELECT * FROM lab_medicine_flags WHERE lab_report_id = $1`, [labReportId]);
  return rows;
}

export async function findLatestExtractedMedicinesForPrescription(prescriptionId, client = pool) {
  const { rows } = await client.query(
    `SELECT em.generic_name, em.medicine_key, em.is_high_risk FROM extracted_medicines em
     JOIN ai_analyses a ON a.id = em.analysis_id
     WHERE a.prescription_id = $1`,
    [prescriptionId]
  );
  return rows;
}
