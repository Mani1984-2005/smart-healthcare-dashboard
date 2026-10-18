import { asyncHandler } from '../utils/asyncHandler.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import * as billingService from '../services/billing.service.js';

export const generateInvoice = asyncHandler(async (req, res) => {
  const { id: prescriptionId } = req.params;
  const { taxRate, dueInDays, force } = req.body || {};
  const { invoice, lineItems, reused } = await billingService.generateInvoiceForPrescription(prescriptionId, {
    taxRate: taxRate !== undefined ? Number(taxRate) : undefined,
    dueInDays: dueInDays !== undefined ? Number(dueInDays) : undefined,
    force: Boolean(force),
  });

  if (!reused) {
    await recordAudit({
      prescriptionId,
      action: 'INVOICE_CREATED',
      details: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, total: invoice.total_amount },
      ...auditContextFromRequest(req),
    });
  }

  res.status(reused ? 200 : 201).json({ success: true, reused, data: billingService.serializeInvoice(invoice, lineItems) });
});

export const getInvoice = asyncHandler(async (req, res) => {
  const { invoice, lineItems } = await billingService.getInvoice(req.params.invoiceId);
  await recordAudit({
    prescriptionId: invoice.prescription_id,
    action: 'INVOICE_VIEWED',
    details: { invoiceId: invoice.id },
    ...auditContextFromRequest(req),
  });
  res.json({ success: true, data: billingService.serializeInvoice(invoice, lineItems) });
});

export const listPatientInvoices = asyncHandler(async (req, res) => {
  const rows = await billingService.listPatientInvoices(req.params.patientId);
  res.json({ success: true, data: rows.map((r) => billingService.serializeInvoice(r)) });
});

export const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const invoice = await billingService.updateInvoiceStatus(req.params.invoiceId, req.body);
  await recordAudit({
    prescriptionId: invoice.prescription_id,
    action: 'INVOICE_STATUS_CHANGED',
    details: { invoiceId: invoice.id, status: invoice.status },
    ...auditContextFromRequest(req),
  });
  res.json({ success: true, data: billingService.serializeInvoice(invoice) });
});
