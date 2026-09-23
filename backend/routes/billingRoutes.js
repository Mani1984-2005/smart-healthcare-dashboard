import express from "express";
const router = express.Router();
import * as billingController from "../controllers/billing.controller.js";

function roleOf(req) {
  return typeof req.user?.role === "string" ? req.user.role.trim().toUpperCase() : "";
}

/** PATIENT: force reads to own records; block all writes. */
function patientBillingScope(req, res, next) {
  if (roleOf(req) !== "PATIENT") return next();

  const own = Number(req.user?.patientId ?? req.user?.id);
  if (!Number.isInteger(own) || own <= 0) {
    return res.status(403).json({ success: false, message: "Forbidden: patient identity not resolved" });
  }

  if (req.method === "GET") {
    // Reads are scoped to the authenticated patient's own invoices.
    if (req.query.patientId !== undefined && Number(req.query.patientId) !== own) {
      return res.status(403).json({ success: false, message: "Forbidden: patient can only view their own invoices" });
    }
    req.query.patientId = String(own);
    return next();
  }

  // Patients never create/update/delete invoices or mark them paid
  // through this API (payments go through the payment flow).
  return res.status(403).json({ success: false, message: "Forbidden: patients cannot modify billing records" });
}

router.get("/invoices", patientBillingScope, billingController.getInvoices);
router.get("/invoices/:id", patientBillingScope, billingController.getInvoiceById);
router.post("/invoices", patientBillingScope, billingController.createInvoice);
router.put("/invoices/:id", patientBillingScope, billingController.updateInvoice);
router.delete("/invoices/:id", patientBillingScope, billingController.deleteInvoice);
router.post("/invoices/:id/pay", patientBillingScope, billingController.payInvoice);

export default router;
