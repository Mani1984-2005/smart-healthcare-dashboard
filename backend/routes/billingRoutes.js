import express from "express";
const router = express.Router();
import * as billingController from "../controllers/billing.controller.js";

router.get("/summary", billingController.getSummary);
router.get("/invoices", billingController.getInvoices);
router.get("/invoices/:id", billingController.getInvoiceById);
router.post("/invoices", billingController.createInvoice);
router.put("/invoices/:id", billingController.updateInvoice);
router.delete("/invoices/:id", billingController.deleteInvoice);

export default router;
