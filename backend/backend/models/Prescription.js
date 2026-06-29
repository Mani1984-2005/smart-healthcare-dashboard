// backend/models/Prescription.js
// MediCare Pro — Prescription Model (PostgreSQL)

const pool = require("../config/db");

// ─── Table Initialization ──────────────────────────────────────────────────────
const createPrescriptionsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id            SERIAL PRIMARY KEY,
      prescription_id VARCHAR(20) UNIQUE NOT NULL,
      patient_id    VARCHAR(20) NOT NULL,
      patient_name  VARCHAR(200) NOT NULL,
      doctor_name   VARCHAR(200),
      department    VARCHAR(100),
      diagnosis     TEXT,
      notes         TEXT,
      status        VARCHAR(30) DEFAULT 'Active',
      qr_payload    TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prescription_medicines (
      id                 SERIAL PRIMARY KEY,
      prescription_id    VARCHAR(20) NOT NULL REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
      medicine_name      VARCHAR(200) NOT NULL,
      generic_name       VARCHAR(200),
      category           VARCHAR(100),
      dosage_strength    VARCHAR(50),
      dosage_form        VARCHAR(50),
      frequency          VARCHAR(100),
      duration           VARCHAR(50),
      duration_days      INTEGER,
      timing             VARCHAR(100),
      route              VARCHAR(50),
      quantity           INTEGER,
      refills            INTEGER DEFAULT 0,
      instructions       TEXT,
      warnings           TEXT[],
      interactions       TEXT[],
      created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// ─── CRUD Operations ──────────────────────────────────────────────────────────

const createPrescription = async (data) => {
  const {
    prescription_id, patient_id, patient_name, doctor_name,
    department, diagnosis, notes, status, qr_payload,
  } = data;

  const result = await pool.query(
    `INSERT INTO prescriptions
       (prescription_id, patient_id, patient_name, doctor_name,
        department, diagnosis, notes, status, qr_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [prescription_id, patient_id, patient_name, doctor_name,
     department, diagnosis, notes, status || "Active", qr_payload]
  );
  return result.rows[0];
};

const addMedicine = async (data) => {
  const {
    prescription_id, medicine_name, generic_name, category,
    dosage_strength, dosage_form, frequency, duration, duration_days,
    timing, route, quantity, refills, instructions, warnings, interactions,
  } = data;

  const result = await pool.query(
    `INSERT INTO prescription_medicines
       (prescription_id, medicine_name, generic_name, category,
        dosage_strength, dosage_form, frequency, duration, duration_days,
        timing, route, quantity, refills, instructions, warnings, interactions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      prescription_id, medicine_name, generic_name, category,
      dosage_strength, dosage_form, frequency, duration, duration_days,
      timing, route, quantity, refills || 0, instructions,
      warnings || [], interactions || [],
    ]
  );
  return result.rows[0];
};

const getPrescriptionsByPatient = async (patient_id) => {
  const prescriptions = await pool.query(
    `SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC`,
    [patient_id]
  );

  // Attach medicines to each prescription
  for (const rx of prescriptions.rows) {
    const meds = await pool.query(
      `SELECT * FROM prescription_medicines WHERE prescription_id = $1 ORDER BY id`,
      [rx.prescription_id]
    );
    rx.medicines = meds.rows;
  }

  return prescriptions.rows;
};

const getPrescriptionById = async (prescription_id) => {
  const result = await pool.query(
    `SELECT * FROM prescriptions WHERE prescription_id = $1`,
    [prescription_id]
  );
  if (!result.rows[0]) return null;
  const rx = result.rows[0];
  const meds = await pool.query(
    `SELECT * FROM prescription_medicines WHERE prescription_id = $1 ORDER BY id`,
    [prescription_id]
  );
  rx.medicines = meds.rows;
  return rx;
};

const getAllPrescriptions = async () => {
  const result = await pool.query(
    `SELECT p.*, COUNT(pm.id)::int AS medicine_count
     FROM prescriptions p
     LEFT JOIN prescription_medicines pm ON p.prescription_id = pm.prescription_id
     GROUP BY p.id
     ORDER BY p.created_at DESC`
  );
  return result.rows;
};

const updatePrescriptionStatus = async (prescription_id, status) => {
  const result = await pool.query(
    `UPDATE prescriptions SET status = $1, updated_at = NOW()
     WHERE prescription_id = $2 RETURNING *`,
    [status, prescription_id]
  );
  return result.rows[0];
};

const deleteMedicine = async (medicine_id) => {
  await pool.query(`DELETE FROM prescription_medicines WHERE id = $1`, [medicine_id]);
};

const deletePrescription = async (prescription_id) => {
  await pool.query(`DELETE FROM prescriptions WHERE prescription_id = $1`, [prescription_id]);
};

module.exports = {
  createPrescriptionsTable,
  createPrescription,
  addMedicine,
  getPrescriptionsByPatient,
  getPrescriptionById,
  getAllPrescriptions,
  updatePrescriptionStatus,
  deleteMedicine,
  deletePrescription,
};