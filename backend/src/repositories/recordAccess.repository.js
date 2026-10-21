import pool from '../config/db.js';

// -----------------------------------------------------------------------------
// Record-access lookups used by the patient-isolation layer.
// These are intentionally tiny and only read ownership-relevant columns.
// -----------------------------------------------------------------------------

/** Owner row of a prescription (prescriptions.user_id -> users.id). */
export async function findPrescriptionOwnerRow(id, client = pool) {
  const { rows } = await client.query('SELECT id, user_id FROM prescriptions WHERE id = $1', [id]);
  return rows[0] || null;
}

/** File locations of a prescription (served only via the authorized file route). */
export async function findPrescriptionFileRow(id, client = pool) {
  const { rows } = await client.query(
    'SELECT id, file_path, preprocessed_path FROM prescriptions WHERE id = $1',
    [id],
  );
  return rows[0] || null;
}

/** Which prescription an invoice belongs to (0..1 link). */
export async function findInvoicePrescriptionRow(invoiceId, client = pool) {
  const { rows } = await client.query('SELECT id, prescription_id FROM invoices WHERE id = $1', [invoiceId]);
  return rows[0] || null;
}
