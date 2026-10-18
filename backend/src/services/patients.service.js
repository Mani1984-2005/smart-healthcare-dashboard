import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as patientsRepo from '../repositories/patients.repository.js';

export async function createPatient(input) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const mrn = await patientsRepo.nextMrn(client);
    const patient = await patientsRepo.insertPatient({ ...input, mrn }, client);
    await client.query('COMMIT');
    return patient;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      throw AppError.conflict('A patient with this MRN already exists.');
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function updatePatient(id, input) {
  const existing = await patientsRepo.findPatientById(id);
  if (!existing) throw AppError.notFound('Patient not found');
  return patientsRepo.updatePatient(id, input);
}

export async function getPatient(id) {
  const patient = await patientsRepo.findPatientById(id);
  if (!patient) throw AppError.notFound('Patient not found');
  const prescriptions = await patientsRepo.findPrescriptionsByPatient(id);
  return { ...patient, prescriptions };
}

export async function listPatients(query) {
  const { search, isActive, page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;
  const { rows, total } = await patientsRepo.listPatients({ search, isActive, limit, offset });
  return { patients: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function linkPrescription(prescriptionId, patientId) {
  const patient = await patientsRepo.findPatientById(patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  const rxCheck = await pool.query(`SELECT id FROM prescriptions WHERE id = $1`, [prescriptionId]);
  if (rxCheck.rows.length === 0) throw AppError.notFound('Prescription not found');

  const result = await patientsRepo.linkPrescriptionToPatient(prescriptionId, patientId);
  return result;
}

export function serializePatient(p) {
  if (!p) return null;
  return {
    id: p.id,
    mrn: p.mrn,
    fullName: p.full_name,
    dateOfBirth: p.date_of_birth,
    gender: p.gender,
    phone: p.phone,
    email: p.email,
    address: p.address,
    bloodType: p.blood_type,
    knownAllergies: p.known_allergies || [],
    chronicConditions: p.chronic_conditions || [],
    primaryPhysician: p.primary_physician,
    emergencyContactName: p.emergency_contact_name,
    emergencyContactPhone: p.emergency_contact_phone,
    isActive: p.is_active,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    prescriptions: p.prescriptions,
  };
}
