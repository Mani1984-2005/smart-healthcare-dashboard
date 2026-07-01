// backend/models/Prescription.js
// MediCare Pro — Prescription Model (PostgreSQL)

import pool from "../config/db.js";
import crypto from "crypto";

// ─── Simple dosage rule engine ────────────────────────────────────────────────
// Returns structured dosage guidance from plain text inputs — no external AI.
function applyDosageRules(medicine, dosage, frequency, duration, patientAge, patientWeight) {
  const warnings = [];
  const suggestions = [];
  const form = (medicine.form || "").toLowerCase();
  const age = parseInt(patientAge) || 0;
  const weight = parseFloat(patientWeight) || 0;

  // Paediatric check
  if (age < 12 && medicine.requires_rx) {
    warnings.push("Paediatric patient: verify dose with prescribing physician.");
  }

  // Geriatric check
  if (age > 65) {
    warnings.push("Geriatric patient: consider reduced starting dose.");
  }

  // Weight-based dosing hint for injections/syrups
  if (weight > 0 && (form === "injection" || form === "syrup")) {
    const dosePerKg = parseFloat(dosage) / weight;
    if (!isNaN(dosePerKg)) {
      suggestions.push(`Approx dose/kg: ${dosePerKg.toFixed(2)} (verify against formulary).`);
    }
  }

  // Frequency normalisation
  const freqMap = {
    "od": "Once daily",
    "bd": "Twice daily",
    "tds": "Three times daily",
    "qds": "Four times daily",
    "sos": "As needed",
    "stat": "Immediately (single dose)",
    "hs": "At bedtime",
    "ac": "Before meals",
    "pc": "After meals",
  };
  const normFreq = freqMap[(frequency || "").toLowerCase()] || frequency;

  // Duration safety
  const durationDays = parseInt(duration) || 0;
  if (durationDays > 30 && medicine.requires_rx) {
    warnings.push("Long-term prescription (>30 days): review may be required.");
  }

  return { normalizedFrequency: normFreq, warnings, suggestions };
}

// ─── QR Payload builder ───────────────────────────────────────────────────────
function buildPrescriptionQR(prescription) {
  const payload = {
    rx_id: prescription.id,
    patient_id: prescription.patient_id,
    doctor: prescription.doctor_name,
    date: prescription.created_at,
    medicines: (prescription.items || []).map((item) => ({
      name: item.medicine_name,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration_days + "d",
    })),
    hash: crypto
      .createHash("sha256")
      .update(`${prescription.id}|${prescription.patient_id}|${prescription.doctor_name}`)
      .digest("hex")
      .slice(0, 16),
  };
  return JSON.stringify(payload);
}

// ─── Prescription Model ───────────────────────────────────────────────────────
const Prescription = {
  // Create tables with correct indices and relationships
  async createTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id            SERIAL PRIMARY KEY,
        patient_id    VARCHAR(50) NOT NULL,
        patient_name  VARCHAR(255) NOT NULL,
        doctor_name   VARCHAR(255),
        doctor_id     VARCHAR(50),
        department    VARCHAR(100),
        diagnosis     TEXT,
        notes         TEXT,
        status        VARCHAR(30) DEFAULT 'Active', -- Active, Dispensed, Cancelled
        qr_payload    TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS prescription_items (
        id                 SERIAL PRIMARY KEY,
        prescription_id    INT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
        medicine_id        INT, -- Optional reference to absolute inventory items
        medicine_name      VARCHAR(255) NOT NULL,
        generic_name       VARCHAR(255),
        category           VARCHAR(100),
        dosage_strength    VARCHAR(50),
        dosage_form        VARCHAR(50),
        dosage             VARCHAR(100),
        frequency          VARCHAR(100),
        duration           VARCHAR(50),
        duration_days      INTEGER,
        timing             VARCHAR(100),
        route              VARCHAR(50),
        quantity           INTEGER,
        refills            INTEGER DEFAULT 0,
        instructions       TEXT,
        warnings           JSONB DEFAULT '[]',
        suggestions        JSONB DEFAULT '[]',
        created_at         TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions (patient_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor  ON prescriptions (doctor_id);
      CREATE INDEX IF NOT EXISTS idx_prescription_items_rx ON prescription_items (prescription_id);
    `);
  },

  // Create a Prescription header along with its medicines in a safe Transaction block
  async create(data) {
    const {
      patient_id, patient_name, doctor_name, doctor_id, department, diagnosis, notes,
      status, items = [], patientAge, patientWeight
    } = data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert prescription header
      const { rows: [rx] } = await client.query(
        `INSERT INTO prescriptions 
           (patient_id, patient_name, doctor_name, doctor_id, department, diagnosis, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [patient_id, patient_name, doctor_name, doctor_id, department, diagnosis, notes, status || "Active"]
      );

      // Insert items with dosage evaluation
      const insertedItems = [];
      for (const item of items) {
        const ruleResult = applyDosageRules(
          { form: item.dosage_form || item.form, requires_rx: item.requires_rx ?? true },
          item.dosage || item.dosage_strength,
          item.frequency,
          item.duration_days || item.duration,
          patientAge,
          patientWeight
        );

        const { rows: [rxItem] } = await client.query(
          `INSERT INTO prescription_items
             (prescription_id, medicine_id, medicine_name, generic_name, category,
              dosage_strength, dosage_form, dosage, frequency, duration, duration_days,
              timing, route, quantity, refills, instructions, warnings, suggestions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
           RETURNING *`,
          [
            rx.id,
            item.medicine_id || null,
            item.medicine_name,
            item.generic_name || null,
            item.category || null,
            item.dosage_strength || null,
            item.dosage_form || null,
            item.dosage || null,
            ruleResult.normalizedFrequency,
            item.duration || null,
            item.duration_days || null,
            item.timing || null,
            item.route || null,
            item.quantity || null,
            item.refills || 0,
            item.instructions || null,
            JSON.stringify(ruleResult.warnings),
            JSON.stringify(ruleResult.suggestions)
          ]
        );
        insertedItems.push(rxItem);
      }

      // Build and assign QR payload
      const qrPayload = buildPrescriptionQR({ ...rx, items: insertedItems });
      const { rows: [updated] } = await client.query(
        "UPDATE prescriptions SET qr_payload = $1 WHERE id = $2 RETURNING *",
        [qrPayload, rx.id]
      );

      await client.query("COMMIT");
      return { ...updated, items: insertedItems };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  // Append a standalone medicine to an existing prescription
  async addMedicine(data) {
    const {
      prescription_id, medicine_id, medicine_name, generic_name, category,
      dosage_strength, dosage_form, dosage, frequency, duration, duration_days,
      timing, route, quantity, refills, instructions, warnings, suggestions
    } = data;

    const result = await pool.query(
      `INSERT INTO prescription_items
         (prescription_id, medicine_id, medicine_name, generic_name, category,
          dosage_strength, dosage_form, dosage, frequency, duration, duration_days,
          timing, route, quantity, refills, instructions, warnings, suggestions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        prescription_id, medicine_id || null, medicine_name, generic_name, category,
        dosage_strength, dosage_form, dosage, frequency, duration, duration_days,
        timing, route, quantity, refills || 0, instructions,
        JSON.stringify(warnings || []), JSON.stringify(suggestions || [])
      ]
    );
    return result.rows[0];
  },

  // Fetch all prescriptions associated with a single patient ID
  async findByPatient(patient_id) {
    const { rows: prescriptions } = await pool.query(
      "SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC",
      [patient_id]
    );

    for (const rx of prescriptions) {
      const { rows: items } = await pool.query(
        "SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY id ASC",
        [rx.id]
      );
      rx.items = items;
    }
    return prescriptions;
  },

  // Fetch a single prescription by its primary ID sequence
  async findById(id) {
    const { rows: [rx] } = await pool.query("SELECT * FROM prescriptions WHERE id = $1", [id]);
    if (!rx) return null;

    const { rows: items } = await pool.query(
      "SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY id ASC",
      [id]
    );
    return { ...rx, items };
  },

  // Fetch all prescriptions registered across the application
  async getAllPrescriptions() {
    const result = await pool.query(
      `SELECT p.*, COUNT(pi.id)::int AS medicine_count
       FROM prescriptions p
       LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  },

  // Patch execution status (e.g., Active, Dispensed, Cancelled)
  async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE prescriptions SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0] || null;
  },

  // Delete a specific medicine entry row 
  async deleteMedicine(medicine_item_id) {
    await pool.query(`DELETE FROM prescription_items WHERE id = $1`, [medicine_item_id]);
  },

  // Clear out an entire prescription configuration
  async delete(id) {
    await pool.query(`DELETE FROM prescriptions WHERE id = $1`, [id]);
  },
};

export { Prescription, applyDosageRules, buildPrescriptionQR };