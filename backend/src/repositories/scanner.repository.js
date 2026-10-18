import pool from '../config/db.js';

export async function findMedicineByBarcode(barcode, client = pool) {
  const { rows } = await client.query(`SELECT * FROM medicine_barcodes WHERE barcode = $1`, [barcode]);
  return rows[0] || null;
}

export async function upsertMedicineBarcode({ barcode, itemKey, displayName }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO medicine_barcodes (barcode, item_key, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (barcode) DO UPDATE SET item_key = EXCLUDED.item_key, display_name = EXCLUDED.display_name
     RETURNING *`,
    [barcode, itemKey, displayName]
  );
  return rows[0];
}

export async function findPatientByQrToken(qrToken, client = pool) {
  const { rows } = await client.query(`SELECT * FROM patients WHERE qr_token = $1`, [qrToken]);
  return rows[0] || null;
}

export async function setPatientQrToken(patientId, qrToken, client = pool) {
  const { rows } = await client.query(
    `UPDATE patients SET qr_token = $2 WHERE id = $1 RETURNING *`,
    [patientId, qrToken]
  );
  return rows[0] || null;
}

export async function findPrescriptionByQrToken(qrToken, client = pool) {
  const { rows } = await client.query(`SELECT * FROM prescriptions WHERE qr_token = $1`, [qrToken]);
  return rows[0] || null;
}

export async function setPrescriptionQrToken(prescriptionId, qrToken, client = pool) {
  const { rows } = await client.query(
    `UPDATE prescriptions SET qr_token = $2 WHERE id = $1 RETURNING *`,
    [prescriptionId, qrToken]
  );
  return rows[0] || null;
}

export async function insertScanEvent(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO scan_events (scan_type, code_value, resolved_entity_type, resolved_entity_id, scanned_by, device_info, was_successful)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      data.scanType, data.codeValue, data.resolvedEntityType || null, data.resolvedEntityId || null,
      data.scannedBy || null, JSON.stringify(data.deviceInfo || {}), data.wasSuccessful,
    ]
  );
  return rows[0];
}
