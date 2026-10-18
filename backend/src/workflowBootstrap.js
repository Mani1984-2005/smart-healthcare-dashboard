// Part 3B — one-time startup wiring for the new enterprise workflow
// modules. Import and call `bootstrapWorkflow()` once from server.js
// (see INTEGRATION.md) after the app is created and before it starts
// listening. Kept as its own file so Part 3A domain services never need
// to import the approval engine themselves — dependencies point inward
// from this bootstrap, not outward from domain code (dependency
// inversion / open-closed).
import * as billingService from './services/billing.service.js';
import * as pharmacyService from './services/pharmacy.service.js';
import { registerApprovalHandler } from './services/approval.service.js';
import { logger } from './utils/logger.js';

export function bootstrapWorkflow() {
  // Example: voiding/refunding an invoice requires billing:approve sign-off.
  // Submit with entityType="invoice", action="void_invoice", payload={ status: "void" }.
  registerApprovalHandler('invoice', 'void_invoice', async (invoiceId) => {
    await billingService.updateInvoiceStatus(invoiceId, { status: 'void' });
  });

  registerApprovalHandler('invoice', 'refund_invoice', async (invoiceId, payload) => {
    await billingService.updateInvoiceStatus(invoiceId, { status: 'refunded', amountPaid: payload?.amountPaid });
  });

  // Example: a pharmacist-flagged dispensation over a configured quantity
  // threshold can require a second pharmacist's approval before release.
  registerApprovalHandler('dispensation', 'approve_dispense', async (dispensationId, payload) => {
    await pharmacyService.updateDispensation(dispensationId, {
      status: 'dispensed',
      quantityDispensed: payload?.quantityDispensed,
    });
  });

  logger.info('✅ Workflow approval handlers registered (invoice, dispensation)');
}
