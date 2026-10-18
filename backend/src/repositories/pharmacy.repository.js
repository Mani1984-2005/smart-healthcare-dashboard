import pool from '../config/db.js';

const DEFAULT_PHARMACY_ID = '00000000-0000-0000-0000-0000000000f1';

export async function listPharmacies(client = pool) {
  const { rows } = await client.query(`SELECT * FROM pharmacies WHERE is_active = true ORDER BY name`);
  return rows;
}

export async function findPharmacyById(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM pharmacies WHERE id = $1`, [id]);
  return rows[0] || null;
}

export function defaultPharmacyId() {
  return DEFAULT_PHARMACY_ID;
}

export async function insertDispensation(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO dispensations (
       prescription_id, extracted_medicine_id, pharmacy_id, medicine_name,
       quantity_prescribed, quantity_dispensed, unit, status, dispensed_by,
       dispensed_at, substitution_of, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      data.prescriptionId, data.extractedMedicineId, data.pharmacyId, data.medicineName,
      data.quantityPrescribed, data.quantityDispensed, data.unit, data.status,
      data.dispensedBy, data.dispensedAt, data.substitutionOf, data.notes,
    ]
  );
  return rows[0];
}

export async function updateDispensationStatus(id, { status, quantityDispensed, dispensedBy, dispensedAt, notes }, client = pool) {
  const { rows } = await client.query(
    `UPDATE dispensations SET
       status = COALESCE($2, status),
       quantity_dispensed = COALESCE($3, quantity_dispensed),
       dispensed_by = COALESCE($4, dispensed_by),
       dispensed_at = COALESCE($5, dispensed_at),
       notes = COALESCE($6, notes)
     WHERE id = $1
     RETURNING *`,
    [id, status, quantityDispensed, dispensedBy, dispensedAt, notes]
  );
  return rows[0] || null;
}

export async function findDispensationById(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM dispensations WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function findDispensationsByPrescription(prescriptionId, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM dispensations WHERE prescription_id = $1 ORDER BY created_at DESC`,
    [prescriptionId]
  );
  return rows;
}

export async function findExtractedMedicinesForPrescription(prescriptionId, client = pool) {
  const { rows } = await client.query(
    `SELECT em.* FROM extracted_medicines em
     JOIN ai_analyses a ON a.id = em.analysis_id
     WHERE a.prescription_id = $1`,
    [prescriptionId]
  );
  return rows;
}
