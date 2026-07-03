import { asyncHandler } from '../utils/asyncHandler.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import * as scannerService from '../services/scanner.service.js';

export const lookupBarcode = asyncHandler(async (req, res) => {
  const item = await scannerService.lookupBarcode(req.body.barcode, req.user?.id);
  res.json({ success: true, data: item });
});

export const registerBarcode = asyncHandler(async (req, res) => {
  const item = await scannerService.registerBarcode(req.body);
  res.status(201).json({ success: true, data: item });
});

export const lookupQr = asyncHandler(async (req, res) => {
  const result = await scannerService.lookupQr(req.body.token, req.user?.id);
  res.json({ success: true, data: result });
});

export const generatePatientQr = asyncHandler(async (req, res) => {
  const result = await scannerService.generatePatientQr(req.params.patientId);
  await recordAudit({
    userId: req.user?.id,
    action: 'QR_CODE_GENERATED',
    details: { entityType: 'patient', entityId: req.params.patientId },
    ...auditContextFromRequest(req),
  });
  res.status(201).json({ success: true, data: result });
});

export const generatePrescriptionQr = asyncHandler(async (req, res) => {
  const result = await scannerService.generatePrescriptionQr(req.params.id);
  await recordAudit({
    prescriptionId: req.params.id,
    userId: req.user?.id,
    action: 'QR_CODE_GENERATED',
    details: { entityType: 'prescription', entityId: req.params.id },
    ...auditContextFromRequest(req),
  });
  res.status(201).json({ success: true, data: result });
});
