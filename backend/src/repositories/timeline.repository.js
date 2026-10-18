import pool from '../config/db.js';

/**
 * Each function returns a normalized slice of events for one source
 * module. The timeline service merges and sorts these — this repository
 * never merges data itself, keeping each query independently indexable.
 */

export async function prescriptionEvents(patientId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, created_at AS event_time, status, original_filename
     FROM prescriptions WHERE patient_id = $1`,
    [patientId]
  );
  return rows.map((r) => ({
    type: 'prescription_uploaded',
    eventTime: r.event_time,
    refId: r.id,
    summary: `Prescription uploaded (${r.original_filename}) — status: ${r.status}`,
  }));
}

export async function analysisEvents(patientId, client = pool) {
  const { rows } = await client.query(
    `SELECT a.id, a.created_at AS event_time, a.risk_level, a.prescription_id, a.medicines_count
     FROM ai_analyses a
     JOIN prescriptions p ON p.id = a.prescription_id
     WHERE p.patient_id = $1`,
    [patientId]
  );
  return rows.map((r) => ({
    type: 'ai_analysis_completed',
    eventTime: r.event_time,
    refId: r.id,
    relatedId: r.prescription_id,
    summary: `AI analysis completed — risk level ${r.risk_level}, ${r.medicines_count} medicine(s) identified`,
  }));
}

export async function dispensationEvents(patientId, client = pool) {
  const { rows } = await client.query(
    `SELECT d.id, d.created_at AS event_time, d.medicine_name, d.status, d.prescription_id
     FROM dispensations d
     JOIN prescriptions p ON p.id = d.prescription_id
     WHERE p.patient_id = $1`,
    [patientId]
  );
  return rows.map((r) => ({
    type: 'pharmacy_dispensation',
    eventTime: r.event_time,
    refId: r.id,
    relatedId: r.prescription_id,
    summary: `Pharmacy: ${r.medicine_name} — ${r.status}`,
  }));
}

export async function labReportEvents(patientId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, created_at AS event_time, report_date, test_name, abnormal_flag, prescription_id
     FROM lab_reports WHERE patient_id = $1`,
    [patientId]
  );
  return rows.map((r) => ({
    type: 'lab_report',
    eventTime: r.event_time,
    refId: r.id,
    relatedId: r.prescription_id,
    summary: `Lab report: ${r.test_name} (${r.report_date.toISOString?.() ?? r.report_date}) — ${r.abnormal_flag}`,
  }));
}

export async function invoiceEvents(patientId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, created_at AS event_time, invoice_number, status, total_amount, currency, prescription_id
     FROM invoices WHERE patient_id = $1`,
    [patientId]
  );
  return rows.map((r) => ({
    type: 'billing_invoice',
    eventTime: r.event_time,
    refId: r.id,
    relatedId: r.prescription_id,
    summary: `Invoice ${r.invoice_number} — ${r.status} — ${r.total_amount} ${r.currency}`,
  }));
}
