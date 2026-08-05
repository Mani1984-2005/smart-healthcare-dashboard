import { asyncHandler } from '../utils/asyncHandler.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import * as labService from '../services/labReports.service.js';

export const createLabReport = asyncHandler(async (req, res) => {
  const { report, safetyFlags } = await labService.createLabReport(req.body);

  await recordAudit({
    prescriptionId: report.prescription_id,
    action: 'LAB_REPORT_CREATED',
    details: { labReportId: report.id, testName: report.test_name, abnormalFlag: report.abnormal_flag, safetyFlagsRaised: safetyFlags.length },
    ...auditContextFromRequest(req),
  });

  res.status(201).json({
    success: true,
    data: labService.serializeLabReport(report),
    safetyFlags: safetyFlags.map(labService.serializeSafetyFlag),
  });
});

export const getLabReport = asyncHandler(async (req, res) => {
  const { report, safetyFlags } = await labService.getLabReport(req.params.id);
  await recordAudit({
    prescriptionId: report.prescription_id,
    action: 'LAB_REPORT_VIEWED',
    details: { labReportId: report.id },
    ...auditContextFromRequest(req),
  });
  res.json({
    success: true,
    data: labService.serializeLabReport(report),
    safetyFlags: safetyFlags.map(labService.serializeSafetyFlag),
  });
});

export const listPatientLabReports = asyncHandler(async (req, res) => {
  const rows = await labService.listPatientLabReports(req.params.patientId, req.pagination);
  res.json({ success: true, data: rows.map(labService.serializeLabReport) });
});

export const listPrescriptionLabReports = asyncHandler(async (req, res) => {
  const rows = await labService.listPrescriptionLabReports(req.params.id);
  res.json({ success: true, data: rows.map(labService.serializeLabReport) });
});
