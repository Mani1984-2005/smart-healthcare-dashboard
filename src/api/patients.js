// src/api/patients.js
// Client API layer for MediCare Pro patient management
import { apiClient } from './client.js';

function parseStringArray(input) {
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);
  if (typeof input === 'string' && input.trim()) {
    return input.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function normalizeGender(gender) {
  const g = (gender || '').toLowerCase().trim();
  const valid = ['male', 'female', 'other', 'unspecified'];
  return valid.includes(g) ? g : 'unspecified';
}

export function buildPatientPayload(patientData) {
  return {
    fullName: (patientData.name || patientData.fullName || '').trim(),
    gender: normalizeGender(patientData.gender),
    dateOfBirth: patientData.dob || patientData.dateOfBirth || undefined,
    phone: patientData.phone?.trim() || undefined,
    email: patientData.email?.trim() || undefined,
    address: patientData.address?.trim() || undefined,
    bloodType: patientData.bloodGroup?.trim() || patientData.bloodType?.trim() || undefined,
    knownAllergies: parseStringArray(patientData.allergies || patientData.knownAllergies),
    chronicConditions: parseStringArray(patientData.disease || patientData.chronicConditions),
    emergencyContactName: patientData.emergencyContactName?.trim() || undefined,
    emergencyContactPhone: (patientData.emergencyContactPhone || patientData.emergencyContact)?.trim() || undefined,
    primaryPhysician: patientData.primaryPhysician?.trim() || undefined,
  };
}

export async function fetchPatients(params = {}) {
  const { data } = await apiClient.get('/patients', { params });
  return data;
}

export async function getPatient(id) {
  const { data } = await apiClient.get(`/patients/${id}`);
  return data;
}

export async function createPatient(patientData) {
  const payload = buildPatientPayload(patientData);
  const { data } = await apiClient.post('/patients', payload);
  return data;
}

export async function updatePatient(id, patientData) {
  const payload = buildPatientPayload(patientData);
  const { data } = await apiClient.patch(`/patients/${id}`, payload);
  return data;
}
