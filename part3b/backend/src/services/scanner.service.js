import crypto from 'crypto';
import QRCode from 'qrcode';
import { AppError } from '../utils/AppError.js';
import * as scannerRepo from '../repositories/scanner.repository.js';
import * as patientsRepo from '../repositories/patients.repository.js';
import pool from '../config/db.js';

function generateToken(prefix) {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Barcode lookup — resolves a scanned 1D barcode (medicine packaging,
 * lab-tube label, etc.) to a catalog item. Pluggable: swap the repository
 * for a real formulary/GS1 lookup service without touching callers.
 */
export async function lookupBarcode(barcode, scannedBy) {
  const match = await scannerRepo.findMedicineByBarcode(barcode);
  await scannerRepo.insertScanEvent({
    scanType: 'barcode',
    codeValue: barcode,
    resolvedEntityType: match ? 'medicine' : null,
    resolvedEntityId: match ? match.id : null,
    scannedBy,
    wasSuccessful: Boolean(match),
  });
  if (!match) throw AppError.notFound(`No catalog item is registered for barcode "${barcode}".`);
  return match;
}

export async function registerBarcode({ barcode, itemKey, displayName }) {
  if (!barcode || !itemKey) throw AppError.badRequest('"barcode" and "itemKey" are required.');
  return scannerRepo.upsertMedicineBarcode({ barcode, itemKey, displayName: displayName || itemKey });
}

/**
 * QR lookup — resolves a scanned QR token to whichever entity it was
 * minted for (patient wristband, prescription hand-off slip, ...).
 * Tokens are opaque random strings (not signed) so lookups always hit the
 * DB — this makes revocation trivial (regenerate the token) which matters
 * more than being able to verify offline for this use case.
 */
export async function lookupQr(qrToken, scannedBy) {
  const patient = await scannerRepo.findPatientByQrToken(qrToken);
  if (patient) {
    await scannerRepo.insertScanEvent({
      scanType: 'qr', codeValue: qrToken, resolvedEntityType: 'patient', resolvedEntityId: patient.id,
      scannedBy, wasSuccessful: true,
    });
    return { entityType: 'patient', entity: patient };
  }

  const prescription = await scannerRepo.findPrescriptionByQrToken(qrToken);
  if (prescription) {
    await scannerRepo.insertScanEvent({
      scanType: 'qr', codeValue: qrToken, resolvedEntityType: 'prescription', resolvedEntityId: prescription.id,
      scannedBy, wasSuccessful: true,
    });
    return { entityType: 'prescription', entity: prescription };
  }

  await scannerRepo.insertScanEvent({ scanType: 'qr', codeValue: qrToken, scannedBy, wasSuccessful: false });
  throw AppError.notFound('QR code did not resolve to any known patient or prescription.');
}

async function ensurePatientExists(patientId) {
  const patient = await patientsRepo.findPatientById(patientId, pool);
  if (!patient) throw AppError.notFound('Patient not found.');
  return patient;
}

export async function generatePatientQr(patientId) {
  await ensurePatientExists(patientId);
  const token = generateToken('pat');
  await scannerRepo.setPatientQrToken(patientId, token);
  const dataUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 1, width: 256 });
  return { token, qrImageDataUrl: dataUrl };
}

export async function generatePrescriptionQr(prescriptionId) {
  const token = generateToken('rx');
  const updated = await scannerRepo.setPrescriptionQrToken(prescriptionId, token);
  if (!updated) throw AppError.notFound('Prescription not found.');
  const dataUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 1, width: 256 });
  return { token, qrImageDataUrl: dataUrl };
}
