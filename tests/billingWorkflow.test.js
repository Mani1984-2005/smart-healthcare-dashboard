// tests/billingWorkflow.test.js
// Focused verification test for BillingPage logic, NovaInvoice contracts, BillTable resilience, and Indian currency formatting

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeTotals,
  resolvePayment,
  validateBill,
  fmt,
  generateBillId,
  billingAPI,
  DEFAULT_BILLS,
  STORAGE_KEY,
} from '../src/utils/billingStorage.js';

describe('Billing Logic & Business Calculations Suite', () => {
  test('computeTotals handles flat charges from BillForm with GST 18%', () => {
    const form = {
      consultationFee: 500,
      medicineCharges: 1200,
      labCharges: 850,
      otherCharges: 150,
      discount: 100,
      applyGst: true,
    };

    const totals = computeTotals(form);
    // Subtotal = 500 + 1200 + 850 + 150 = 2700
    // Taxable = 2700 - 100 = 2600
    // GST = 2600 * 0.18 = 468
    // Grand Total = 2600 + 468 = 3068
    assert.equal(totals.subtotal, 2700);
    assert.equal(totals.discountAmt, 100);
    assert.equal(totals.taxable, 2600);
    assert.equal(totals.gstAmount, 468);
    assert.equal(totals.grandTotal, 3068);
    assert.equal(totals.grand, 3068, 'Provides grand alias for backwards compatibility');
  });

  test('computeTotals handles legacy 3-argument signature', () => {
    const charges = {
      consultationFee: 400,
      pharmacyCharges: 600,
    };
    const totals = computeTotals(charges, 10, 18);
    // Subtotal = 1000
    // Discount = 10% of 1000 = 100
    // Taxable = 900
    // GST = 900 * 0.18 = 162
    // Grand = 1062
    assert.equal(totals.subtotal, 1000);
    assert.equal(totals.discountAmt, 100);
    assert.equal(totals.taxable, 900);
    assert.equal(totals.gstAmount, 162);
    assert.equal(totals.grandTotal, 1062);
  });

  test('computeTotals clamps discount so taxable amount never drops below 0', () => {
    const form = {
      consultationFee: 300,
      discount: 500, // exceeds subtotal
      applyGst: false,
    };

    const totals = computeTotals(form);
    assert.equal(totals.subtotal, 300);
    assert.equal(totals.discountAmt, 300);
    assert.equal(totals.taxable, 0);
    assert.equal(totals.gstAmount, 0);
    assert.equal(totals.grandTotal, 0);
  });

  test('resolvePayment computes correct paid and due amounts across all payment statuses', () => {
    // Paid
    const paid = resolvePayment('Paid', 3000, 0);
    assert.equal(paid.paidAmount, 3000);
    assert.equal(paid.dueAmount, 0);

    // Unpaid / Pending
    const pending = resolvePayment('Pending', 3000, 0);
    assert.equal(pending.paidAmount, 0);
    assert.equal(pending.dueAmount, 3000);

    // Partial
    const partial = resolvePayment('Partial', 3000, 1200);
    assert.equal(partial.paidAmount, 1200);
    assert.equal(partial.dueAmount, 1800);

    // Refunded
    const refunded = resolvePayment('Refunded', 3000, 3000);
    assert.equal(refunded.paidAmount, 0);
    assert.equal(refunded.dueAmount, 0);
  });

  test('validateBill enforces required patient name and positive charges', () => {
    assert.throws(
      () => validateBill({ patientName: '', grandTotal: 500 }),
      /Patient name is required/
    );

    assert.throws(
      () => validateBill({ patientName: 'John', grandTotal: 0 }),
      /Invoice must have valid charges/
    );

    assert.throws(
      () => validateBill({ patientName: 'John', grandTotal: 500, paymentStatus: 'Paid', dueAmount: 100 }),
      /Paid invoice cannot have due amount/
    );

    // Valid bill passes without throw
    assert.doesNotThrow(() =>
      validateBill({ patientName: 'John', grandTotal: 500, paymentStatus: 'Paid', dueAmount: 0 })
    );
  });

  test('generateBillId generates unique INV formatted identifier', () => {
    const id1 = generateBillId();
    const id2 = generateBillId();
    assert.match(id1, /^INV-\d{8}-\d{4}$/);
    assert.notEqual(id1, id2);
  });
});

describe('Indian Currency Formatting (₹ / INR) Suite', () => {
  test('fmt displays standard Indian Rupee format with ₹ prefix and two decimals', () => {
    assert.match(fmt(0), /^₹0\.00$/);
    assert.match(fmt(1250), /^₹1,250\.00$/);
    assert.match(fmt(154200.5), /^₹1,54,200\.50$/);
  });

  test('fmt safely handles null, undefined, NaN, and malformed strings without returning NaN', () => {
    assert.equal(fmt(null), "₹0.00");
    assert.equal(fmt(undefined), "₹0.00");
    assert.equal(fmt(NaN), "₹0.00");
    assert.equal(fmt("abc"), "₹0.00");
    assert.equal(fmt("1250.50"), "₹1,250.50");
  });
});

describe('Billing Malformed Input & NaN Prevention Suite', () => {
  test('computeTotals handles missing, null, undefined, and malformed string charges without NaN', () => {
    const malformedForm = {
      consultationFee: "invalid",
      medicineCharges: null,
      labCharges: undefined,
      otherCharges: "xyz",
      discount: "not-a-number",
      applyGst: true,
      gstPct: "18",
    };

    const totals = computeTotals(malformedForm);
    assert.equal(totals.subtotal, 0);
    assert.equal(totals.discountAmt, 0);
    assert.equal(totals.gstAmount, 0);
    assert.equal(totals.grandTotal, 0);
  });
});

describe('Storage Registry Lifecycle Suite', () => {
  const store = {};
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    globalThis.localStorage = {
      getItem: (key) => store[key] || null,
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: (key) => { delete store[key]; },
    };
  });

  test('billingAPI.getAll returns default seed bills when storage empty', async () => {
    const bills = await billingAPI.getAll();
    assert.equal(bills.length, DEFAULT_BILLS.length);
    assert.equal(bills[0].patientName, DEFAULT_BILLS[0].patientName);
  });

  test('billingAPI.create adds a new bill and persists to storage', async () => {
    const newBill = {
      billId: 'INV-TEST-9999',
      patientName: 'Test Patient',
      grandTotal: 1500,
      paymentStatus: 'Paid',
    };
    await billingAPI.create(newBill);
    const all = await billingAPI.getAll();
    assert.equal(all[0].billId, 'INV-TEST-9999');
  });

  test('billingAPI.update modifies existing bill in place', async () => {
    await billingAPI.update('INV-20261015-1042', { paymentStatus: 'Refunded' });
    const all = await billingAPI.getAll();
    const updated = all.find((b) => b.billId === 'INV-20261015-1042');
    assert.equal(updated.paymentStatus, 'Refunded');
  });

  test('billingAPI.remove deletes specified bill from storage', async () => {
    await billingAPI.remove('INV-20261015-1042');
    const all = await billingAPI.getAll();
    assert.equal(all.find((b) => b.billId === 'INV-20261015-1042'), undefined);
  });
});

describe('Component Contract & Architecture Verifications', () => {
  test('BillingPage.jsx integrates PageHeader, StatCards, Modal, BillForm, and BillTable', () => {
    const content = fs.readFileSync(path.resolve('src/pages/BillingPage.jsx'), 'utf-8');
    assert.match(content, /import\s+BillForm\s+from\s+"\.\.\/components\/billing\/BillForm"/);
    assert.match(content, /import\s+BillTable\s+from\s+"\.\.\/components\/billing\/BillTable"/);
    assert.match(content, /import\s+NovaInvoice\s+from\s+"\.\.\/components\/billing\/NovaInvoice"/);
    assert.match(content, /<Modal/);
    assert.match(content, /<BillForm/);
    assert.match(content, /<BillTable/);
    assert.match(content, /New Bill/);
  });

  test('NovaInvoice.jsx standardizes currency on INR and accepts onSave and onClose props', () => {
    const content = fs.readFileSync(path.resolve('src/components/billing/NovaInvoice.jsx'), 'utf-8');
    assert.match(content, /currency:\s*'INR'/);
    assert.match(content, /onSave/);
    assert.match(content, /onClose/);
    assert.match(content, /bills:\s*propBills/);
  });

  test('BillTable.jsx safely accepts either bills or invoices without throwing on undefined', () => {
    const content = fs.readFileSync(path.resolve('src/components/billing/BillTable.jsx'), 'utf-8');
    assert.match(content, /bills,\s*invoices/);
    assert.match(content, /billList\s*=\s*Array\.isArray\(bills\)/);
  });

  test('BillForm.jsx supports mode and initialData contract with Indian Rupee formatting', () => {
    const content = fs.readFileSync(path.resolve('src/components/billing/BillForm.jsx'), 'utf-8');
    assert.match(content, /export default function BillForm/);
    assert.match(content, /mode\s*=\s*"create"/);
    assert.match(content, /initialData/);
    assert.match(content, /onSubmit/);
    assert.match(content, /onCancel/);
    assert.match(content, /"₹"/);
  });
});
