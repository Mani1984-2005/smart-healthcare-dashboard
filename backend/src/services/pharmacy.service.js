import { AppError } from '../utils/AppError.js';
import * as pharmacyRepo from '../repositories/pharmacy.repository.js';

/**
 * Creates a dispensation record for a prescription. If the prescription has
 * an AI analysis, the requested medicine is cross-checked against the
 * extracted medicine list so pharmacy staff can't dispense something that
 * was never actually prescribed (or can consciously override with a note).
 */
export async function dispenseMedicine(prescriptionId, input) {
  const { medicineName, quantityDispensed, unit, dispensedBy, pharmacyId, notes, extractedMedicineId } = input;

  const pharmacy = pharmacyId
    ? await pharmacyRepo.findPharmacyById(pharmacyId)
    : { id: pharmacyRepo.defaultPharmacyId() };
  if (!pharmacy) throw AppError.notFound('Pharmacy not found');

  const extracted = await pharmacyRepo.findExtractedMedicinesForPrescription(prescriptionId);
  let matched = null;
  if (extractedMedicineId) {
    matched = extracted.find((m) => m.id === extractedMedicineId) || null;
    if (!matched) throw AppError.badRequest('extractedMedicineId does not belong to this prescription\'s analysis.');
  } else {
    matched = extracted.find((m) => m.generic_name.toLowerCase() === medicineName.toLowerCase()) || null;
  }

  const status = matched ? 'dispensed' : 'pending';

  const dispensation = await pharmacyRepo.insertDispensation({
    prescriptionId,
    extractedMedicineId: matched?.id || null,
    pharmacyId: pharmacy.id,
    medicineName,
    quantityPrescribed: matched?.dosage_amount ?? null,
    quantityDispensed,
    unit: unit || matched?.dosage_unit || null,
    status,
    dispensedBy,
    dispensedAt: status === 'dispensed' ? new Date() : null,
    substitutionOf: matched && matched.generic_name.toLowerCase() !== medicineName.toLowerCase() ? matched.generic_name : null,
    notes: matched ? notes : (notes ? `${notes} [WARNING: not found in AI-extracted medicine list]` : 'WARNING: not found in AI-extracted medicine list — dispensed against unmatched request'),
  });

  return { dispensation, matchedAgainstAnalysis: Boolean(matched) };
}

export async function updateDispensation(id, input) {
  const existing = await pharmacyRepo.findDispensationById(id);
  if (!existing) throw AppError.notFound('Dispensation record not found');
  return pharmacyRepo.updateDispensationStatus(id, input);
}

export async function getDispensationsForPrescription(prescriptionId) {
  return pharmacyRepo.findDispensationsByPrescription(prescriptionId);
}

export async function listPharmacies() {
  return pharmacyRepo.listPharmacies();
}

export function serializeDispensation(d) {
  if (!d) return null;
  return {
    id: d.id,
    prescriptionId: d.prescription_id,
    extractedMedicineId: d.extracted_medicine_id,
    pharmacyId: d.pharmacy_id,
    medicineName: d.medicine_name,
    quantityPrescribed: d.quantity_prescribed !== null ? Number(d.quantity_prescribed) : null,
    quantityDispensed: Number(d.quantity_dispensed),
    unit: d.unit,
    status: d.status,
    dispensedBy: d.dispensed_by,
    dispensedAt: d.dispensed_at,
    substitutionOf: d.substitution_of,
    notes: d.notes,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}
