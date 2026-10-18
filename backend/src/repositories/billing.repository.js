import pool from '../config/db.js';

export async function nextInvoiceNumber(client = pool) {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM 10)::INT), 0) + 1 AS next
     FROM invoices WHERE invoice_number LIKE $1`,
    [`INV-${year}-%`]
  );
  return `INV-${year}-${String(rows[0].next).padStart(6, '0')}`;
}

export async function insertInvoice(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO invoices (
       invoice_number, patient_id, prescription_id, status, currency,
       subtotal_amount, tax_rate, tax_amount, discount_amount, total_amount, due_date, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      data.invoiceNumber, data.patientId, data.prescriptionId, data.status, data.currency,
      data.subtotalAmount, data.taxRate, data.taxAmount, data.discountAmount,
      data.totalAmount, data.dueDate, data.notes,
    ]
  );
  return rows[0];
}

export async function insertLineItem(data, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO invoice_line_items (invoice_id, item_type, reference_id, description, quantity, unit_price, amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [data.invoiceId, data.itemType, data.referenceId, data.description, data.quantity, data.unitPrice, data.amount]
  );
  return rows[0];
}

export async function findInvoiceById(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM invoices WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function findLineItemsByInvoice(invoiceId, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY created_at`,
    [invoiceId]
  );
  return rows;
}

export async function listInvoicesByPatient(patientId, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM invoices WHERE patient_id = $1 ORDER BY created_at DESC`,
    [patientId]
  );
  return rows;
}

export async function updateInvoiceStatus(id, { status, amountPaid }, client = pool) {
  const { rows } = await client.query(
    `UPDATE invoices SET status = COALESCE($2, status), amount_paid = COALESCE($3, amount_paid)
     WHERE id = $1 RETURNING *`,
    [id, status, amountPaid]
  );
  return rows[0] || null;
}

export async function findPriceForItem(itemType, itemKey, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM price_list WHERE item_type = $1 AND item_key = $2`,
    [itemType, itemKey]
  );
  return rows[0] || null;
}

export async function findExistingInvoiceForPrescription(prescriptionId, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM invoices WHERE prescription_id = $1 AND status != 'void' ORDER BY created_at DESC LIMIT 1`,
    [prescriptionId]
  );
  return rows[0] || null;
}
