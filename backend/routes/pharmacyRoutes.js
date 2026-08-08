import express from "express";
const router = express.Router();
import * as pharmacyController from "../controllers/pharmacyController.js";

// Medicines
router.get("/medicines", pharmacyController.getMedicines);
router.get("/medicines/:id", pharmacyController.getMedicineById);
router.post("/medicines", pharmacyController.createMedicine);
router.put("/medicines/:id", pharmacyController.updateMedicine);
router.delete("/medicines/:id", pharmacyController.deleteMedicine);

// Prescriptions
router.get("/prescriptions", pharmacyController.getPrescriptions);
router.get("/prescriptions/:id", pharmacyController.getPrescriptionById);
router.post("/prescriptions", pharmacyController.createPrescription);
router.post("/prescriptions/:id/dispense", pharmacyController.dispensePrescription);

export default router;
