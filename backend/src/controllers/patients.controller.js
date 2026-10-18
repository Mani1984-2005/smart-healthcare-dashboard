import { asyncHandler } from '../utils/asyncHandler.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import * as patientsService from '../services/patients.service.js';

export const createPatient = asyncHandler(async (req, res) => {
  const patient = await patientsService.createPatient(req.body);
  await recordAudit({ action: 'PATIENT_CREATED', details: { patientId: patient.id, mrn: patient.mrn }, ...auditContextFromRequest(req) });
  res.status(201).json({ success: true, data: patientsService.serializePatient(patient) });
});

export const updatePatient = asyncHandler(async (req, res) => {
  const patient = await patientsService.updatePatient(req.params.id, req.body);
  await recordAudit({ action: 'PATIENT_UPDATED', details: { patientId: patient.id }, ...auditContextFromRequest(req) });
  res.json({ success: true, data: patientsService.serializePatient(patient) });
});

export const getPatient = asyncHandler(async (req, res) => {
  const patient = await patientsService.getPatient(req.params.id);
  await recordAudit({ action: 'PATIENT_VIEWED', details: { patientId: patient.id }, ...auditContextFromRequest(req) });
  res.json({ success: true, data: patientsService.serializePatient(patient) });
});

export const listPatients = asyncHandler(async (req, res) => {
  const { page, limit } = req.pagination;
  const { search, isActive } = req.query;
  const result = await patientsService.listPatients({
    search,
    isActive: isActive === undefined ? undefined : isActive === 'true',
    page,
    limit,
  });
  res.json({
    success: true,
    data: result.patients.map(patientsService.serializePatient),
    pagination: result.pagination,
  });
});

export const linkPrescriptionToPatient = asyncHandler(async (req, res) => {
  const { id: prescriptionId } = req.params;
  const { patientId } = req.body;
  const result = await patientsService.linkPrescription(prescriptionId, patientId);
  await recordAudit({
    prescriptionId,
    action: 'PATIENT_LINKED_TO_PRESCRIPTION',
    details: { patientId },
    ...auditContextFromRequest(req),
  });
  res.json({ success: true, data: { prescriptionId: result.id, patientId: result.patient_id } });
});
