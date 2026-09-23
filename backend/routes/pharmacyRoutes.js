import express from "express";
const router = express.Router();
import * as pharmacyController from "../controllers/pharmacyController.js";
import { authorize } from "../middleware/authMiddleware.js";

// Medicines (catalogue + stock: pharmacist/hospital-staff territory)
router.get("/medicines", pharmacyController.getMedicines);
router.get("/medicines/:id", pharmacyController.getMedicineById);
router.post("/medicines", authorize(["ADMIN", "PHARMACIST"]), pharmacyController.createMedicine);
router.put("/medicines/:id", authorize(["ADMIN", "PHARMACIST"]), pharmacyController.updateMedicine);
router.delete("/medicines/:id", authorize(["ADMIN", "PHARMACIST"]), pharmacyController.deleteMedicine);

// Prescriptions
// Read: clinicians + pharmacy see prescriptions.
// CREATE is clinical — PHARMACIST must not create or alter clinical
// prescriptions; only prescribers (DOCTOR/NURSE/ADMIN) may.
// Dispense: pharmacist fulfills the prescription (stock movement only).
router.get("/prescriptions", pharmacyController.getPrescriptions);
router.get("/prescriptions/:id", pharmacyController.getPrescriptionById);
router.post("/prescriptions", authorize(["ADMIN", "DOCTOR", "NURSE"]), pharmacyController.createPrescription);
router.post("/prescriptions/:id/dispense", authorize(["ADMIN", "PHARMACIST"]), pharmacyController.dispensePrescription);

export default router;
