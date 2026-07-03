import pool from '../config/db.js';

/**
 * Data-access layer for patients. Contains SQL only — no business rules.
 * Swapping storage engines later means replacing this file alone.
 */

export async function nextMrn(client = pool) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(SUBSTRING(mrn FROM 5)::INT), 0) + 1 AS next FROM patients WHERE mrn ~ '^MRN-[0-9]+$'`
  );
  return `MRN-${String(rows[0].next).padStart(6, '0')}`;
}

export async function insertPatient(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO patients (
       mrn, full_name, date_of_birth, gender, phone, email, address, blood_type,
       known_allergies, chronic_conditions, primary_physician,
       emergency_contact_name, emergency_contact_phone
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.mrn, data.fullName, data.dateOfBirth, data.gender, data.phone, data.email,
      data.address, data.bloodType, data.knownAllergies, data.chronicConditions,
      data.primaryPhysician, data.emergencyContactName, data.emergencyContactPhone,
    ]
  );
  return rows[0];
}

export async function updatePatient(id, data, client = pool) {
  const { rows } = await client.query(
    `UPDATE patients SET
       full_name = COALESCE($2, full_name),
       date_of_birth = COALESCE($3, date_of_birth),
       gender = COALESCE($4, gender),
       phone = COALESCE($5, phone),
       email = COALESCE($6, email),
       address = COALESCE($7, address),
       blood_type = COALESCE($8, blood_type),
       known_allergies = COALESCE($9, known_allergies),
       chronic_conditions = COALESCE($10, chronic_conditions),
       primary_physician = COALESCE($11, primary_physician),
       emergency_contact_name = COALESCE($12, emergency_contact_name),
       emergency_contact_phone = COALESCE($13, emergency_contact_phone),
       is_active = COALESCE($14, is_active)
     WHERE id = $1
     RETURNING *`,
    [
      id, data.fullName, data.dateOfBirth, data.gender, data.phone, data.email,
      data.address, data.bloodType, data.knownAllergies, data.chronicConditions,
      data.primaryPhysician, data.emergencyContactName, data.emergencyContactPhone,
      data.isActive,
    ]
  );
  return rows[0] || null;
}

export async function findPatientById(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM patients WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function findPatientByMrn(mrn, client = pool) {
  const { rows } = await client.query(`SELECT * FROM patients WHERE mrn = $1`, [mrn]);
  return rows[0] || null;
}

export async function listPatients({ search, isActive, limit, offset }, client = pool) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(LOWER(full_name) LIKE $${params.length} OR LOWER(mrn) LIKE $${params.length})`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`is_active = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await client.query(
    `SELECT * FROM patients ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const countRes = await client.query(`SELECT COUNT(*)::INT AS total FROM patients ${where}`, params.slice(0, -2));
  return { rows, total: countRes.rows[0].total };
}

export async function linkPrescriptionToPatient(prescriptionId, patientId, client = pool) {
  const { rows } = await client.query(
    `UPDATE prescriptions SET patient_id = $2 WHERE id = $1 RETURNING id, patient_id`,
    [prescriptionId, patientId]
  );
  return rows[0] || null;
}

export async function findPrescriptionsByPatient(patientId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, status, created_at, original_filename FROM prescriptions
     WHERE patient_id = $1 ORDER BY created_at DESC`,
    [patientId]
  );
  return rows;
}
