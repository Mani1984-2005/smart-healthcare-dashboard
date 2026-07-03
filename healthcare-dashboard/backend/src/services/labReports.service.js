import { AppError } from '../utils/AppError.js';
import * as labRepo from '../repositories/labReports.repository.js';
import * as patientsRepo from '../repositories/patients.repository.js';
import { correlateLabWithMedicines } from '../data/labCorrelationRules.js';

export async function createLabReport(input) {
  const patient = await patientsRepo.findPatientById(input.patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  const report = await labRepo.insertLabReport(input);

  // If this lab result is tied to a prescription, cross-check it against
  // that prescription's already-extracted medicines for safety flags.
  let flags = [];
  if (input.prescriptionId) {
    const medicines = await labRepo.findLatestExtractedMedicinesForPrescription(input.prescriptionId);
    const correlated = correlateLabWithMedicines(
      { testCode: input.testCode || input.testName, abnormalFlag: input.abnormalFlag },
      medicines
    );
    for (const flag of correlated) {
      const saved = await labRepo.insertLabMedicineFlag({
        labReportId: report.id,
        prescriptionId: input.prescriptionId,
        medicineName: flag.medicineName,
        severity: flag.severity,
        description: flag.description,
      });
      flags.push(saved);
    }
  }

  return { report, safetyFlags: flags };
}

export async function getLabReport(id) {
  const report = await labRepo.findLabReportById(id);
  if (!report) throw AppError.notFound('Lab report not found');
  const flags = await labRepo.listLabMedicineFlagsForReport(id);
  return { report, safetyFlags: flags };
}

export async function listPatientLabReports(patientId, pagination) {
  return labRepo.listLabReportsByPatient(patientId, pagination);
}

export async function listPrescriptionLabReports(prescriptionId) {
  return labRepo.listLabReportsByPrescription(prescriptionId);
}

export function serializeLabReport(r) {
  if (!r) return null;
  return {
    id: r.id,
    patientId: r.patient_id,
    prescriptionId: r.prescription_id,
    testName: r.test_name,
    testCode: r.test_code,
    panelName: r.panel_name,
    resultValue: r.result_value,
    unit: r.unit,
    referenceRange: r.reference_range,
    abnormalFlag: r.abnormal_flag,
    orderedBy: r.ordered_by,
    performedByLab: r.performed_by_lab,
    reportDate: r.report_date,
    filePath: r.file_path,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

export function serializeSafetyFlag(f) {
  return {
    id: f.id,
    labReportId: f.lab_report_id,
    prescriptionId: f.prescription_id,
    medicineName: f.medicine_name,
    severity: f.severity,
    description: f.description,
  };
}
