import express from "express";
const router = express.Router();
import * as billingController from "../controllers/billing.controller.js";

router.get("/invoices", billingController.getInvoices);
router.get("/invoices/:id", billingController.getInvoiceById);
router.post("/invoices", billingController.createInvoice);
router.put("/invoices/:id", billingController.updateInvoice);
router.delete("/invoices/:id", billingController.deleteInvoice);
router.post("/invoices/:id/pay", billingController.payInvoice);

export default router;
