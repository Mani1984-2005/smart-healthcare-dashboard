import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as billingRepo from '../repositories/billing.repository.js';
import * as patientsRepo from '../repositories/patients.repository.js';
import * as pharmacyRepo from '../repositories/pharmacy.repository.js';

const DEFAULT_TAX_RATE = 0; // overridable per-invoice; kept explicit rather than hidden magic

/**
 * Generates an invoice for a prescription: one line item per AI-extracted
 * medicine (priced from price_list, falling back to a default unit price),
 * plus a standard consultation fee. Idempotent per prescription unless
 * `force` is passed — re-running otherwise returns the existing invoice.
 */
export async function generateInvoiceForPrescription(prescriptionId, { taxRate = DEFAULT_TAX_RATE, dueInDays = 30, force = false } = {}) {
  const rxRes = await pool.query(`SELECT * FROM prescriptions WHERE id = $1`, [prescriptionId]);
  if (rxRes.rows.length === 0) throw AppError.notFound('Prescription not found');
  const prescription = rxRes.rows[0];

  if (!prescription.patient_id) {
    throw AppError.conflict('Prescription is not linked to a patient yet. Link it before billing.');
  }

  if (!force) {
    const existing = await billingRepo.findExistingInvoiceForPrescription(prescriptionId);
    if (existing) return { invoice: existing, lineItems: await billingRepo.findLineItemsByInvoice(existing.id), reused: true };
  }

  const medicines = await pharmacyRepo.findExtractedMedicinesForPrescription(prescriptionId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invoiceNumber = await billingRepo.nextInvoiceNumber(client);
    const lineItemDrafts = [];

    const consultationPrice = await billingRepo.findPriceForItem('service', 'consultation_standard', client);
    lineItemDrafts.push({
      itemType: 'service',
      referenceId: null,
      description: 'Standard Consultation Fee',
      quantity: 1,
      unitPrice: Number(consultationPrice?.unit_price ?? 25),
    });

    const defaultMedPrice = await billingRepo.findPriceForItem('medicine', 'medicine_default', client);
    for (const med of medicines) {
      const priced = await billingRepo.findPriceForItem('medicine', med.medicine_key, client);
      const unitPrice = Number(priced?.unit_price ?? defaultMedPrice?.unit_price ?? 5);
      lineItemDrafts.push({
        itemType: 'medicine',
        referenceId: med.id,
        description: `${med.generic_name}${med.dosage ? ` (${med.dosage})` : ''}`,
        quantity: 1,
        unitPrice,
      });
    }

    const subtotal = lineItemDrafts.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));
    const dueDate = new Date(Date.now() + dueInDays * 86400000).toISOString().slice(0, 10);

    const invoice = await billingRepo.insertInvoice(
      {
        invoiceNumber,
        patientId: prescription.patient_id,
        prescriptionId,
        status: 'pending',
        currency: 'USD',
        subtotalAmount: subtotal,
        taxRate,
        taxAmount,
        discountAmount: 0,
        totalAmount: total,
        dueDate,
        notes: null,
      },
      client
    );

    const lineItems = [];
    for (const draft of lineItemDrafts) {
      const li = await billingRepo.insertLineItem(
        { invoiceId: invoice.id, ...draft, amount: Number((draft.quantity * draft.unitPrice).toFixed(2)) },
        client
      );
      lineItems.push(li);
    }

    await client.query('COMMIT');
    return { invoice, lineItems, reused: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getInvoice(id) {
  const invoice = await billingRepo.findInvoiceById(id);
  if (!invoice) throw AppError.notFound('Invoice not found');
  const lineItems = await billingRepo.findLineItemsByInvoice(id);
  return { invoice, lineItems };
}

export async function listPatientInvoices(patientId) {
  const patient = await patientsRepo.findPatientById(patientId);
  if (!patient) throw AppError.notFound('Patient not found');
  return billingRepo.listInvoicesByPatient(patientId);
}

export async function updateInvoiceStatus(id, { status, amountPaid }) {
  const existing = await billingRepo.findInvoiceById(id);
  if (!existing) throw AppError.notFound('Invoice not found');

  const validTransitions = {
    draft: ['pending', 'void'],
    pending: ['paid', 'partially_paid', 'void'],
    partially_paid: ['paid', 'void'],
    paid: ['refunded'],
    void: [],
    refunded: [],
  };
  if (status && !validTransitions[existing.status]?.includes(status)) {
    throw AppError.conflict(`Cannot transition invoice from "${existing.status}" to "${status}".`);
  }

  return billingRepo.updateInvoiceStatus(id, { status, amountPaid });
}

export function serializeInvoice(invoice, lineItems = []) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    patientId: invoice.patient_id,
    prescriptionId: invoice.prescription_id,
    status: invoice.status,
    currency: invoice.currency,
    subtotalAmount: Number(invoice.subtotal_amount),
    taxRate: Number(invoice.tax_rate),
    taxAmount: Number(invoice.tax_amount),
    discountAmount: Number(invoice.discount_amount),
    totalAmount: Number(invoice.total_amount),
    amountPaid: Number(invoice.amount_paid),
    dueDate: invoice.due_date,
    notes: invoice.notes,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at,
    lineItems: lineItems.map((li) => ({
      id: li.id,
      itemType: li.item_type,
      referenceId: li.reference_id,
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unit_price),
      amount: Number(li.amount),
    })),
  };
}
