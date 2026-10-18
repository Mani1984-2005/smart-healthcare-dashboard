import { asyncHandler } from '../utils/asyncHandler.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import * as pharmacyService from '../services/pharmacy.service.js';

export const dispenseMedicine = asyncHandler(async (req, res) => {
  const { id: prescriptionId } = req.params;
  const { dispensation, matchedAgainstAnalysis } = await pharmacyService.dispenseMedicine(prescriptionId, req.body);

  await recordAudit({
    prescriptionId,
    action: 'DISPENSATION_CREATED',
    details: { dispensationId: dispensation.id, medicineName: dispensation.medicine_name, matchedAgainstAnalysis },
    ...auditContextFromRequest(req),
  });

  res.status(201).json({
    success: true,
    data: pharmacyService.serializeDispensation(dispensation),
    warnings: matchedAgainstAnalysis ? [] : ['Medicine was not found in the AI-extracted list for this prescription.'],
  });
});

export const updateDispensation = asyncHandler(async (req, res) => {
  const dispensation = await pharmacyService.updateDispensation(req.params.dispensationId, req.body);
  await recordAudit({
    prescriptionId: dispensation.prescription_id,
    action: 'DISPENSATION_UPDATED',
    details: { dispensationId: dispensation.id, status: dispensation.status },
    ...auditContextFromRequest(req),
  });
  res.json({ success: true, data: pharmacyService.serializeDispensation(dispensation) });
});

export const listDispensationsForPrescription = asyncHandler(async (req, res) => {
  const rows = await pharmacyService.getDispensationsForPrescription(req.params.id);
  res.json({ success: true, data: rows.map(pharmacyService.serializeDispensation) });
});

export const listPharmacies = asyncHandler(async (req, res) => {
  const rows = await pharmacyService.listPharmacies();
  res.json({ success: true, data: rows });
});
