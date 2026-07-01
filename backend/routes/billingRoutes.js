const express = require("express");
const router = express.Router();

const billingController = require("../controllers/billing.controller");

router.get("/summary", billingController.getSummary);

router.get("/invoices", billingController.getInvoices);

router.get("/invoices/:id", billingController.getInvoiceById);

router.post("/invoices", billingController.createInvoice);

router.put("/invoices/:id", billingController.updateInvoice);

router.delete("/invoices/:id", billingController.deleteInvoice);

module.exports = router;