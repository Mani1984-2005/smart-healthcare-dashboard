import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MediCare Pro Backend is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

export default router;
const express = require("express");
const router = express.Router();

const pharmacy = require("../controllers/PharmacyController");

router.get("/pharmacy/drug-list", pharmacy.getDrugList);
router.post("/pharmacy/check-interactions", pharmacy.checkInteractions);
router.post("/pharmacy/prescriptions", pharmacy.createPrescription);
router.get("/pharmacy/prescriptions", pharmacy.getAllPrescriptions);
router.get("/pharmacy/prescriptions/patient/:patientId", pharmacy.getByPatient);

module.exports = router;