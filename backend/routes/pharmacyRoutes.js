import express from "express";
import * as pharmacy from "../controllers/pharmacyController.js";

const router = express.Router();

router.get("/drug-list", pharmacy.getDrugList);
router.post("/check-interactions", pharmacy.checkInteractions);
router.get("/dosage-suggestion", pharmacy.getDosageSuggestion);
router.post("/prescriptions", pharmacy.createPrescription);
router.get("/prescriptions", pharmacy.getAllPrescriptions);
router.get("/prescriptions/patient/:patientId", pharmacy.getByPatient);
router.get("/prescriptions/:rxId", pharmacy.getPrescriptionById);
router.patch("/prescriptions/:rxId/status", pharmacy.updateStatus);
router.delete("/prescriptions/:rxId", pharmacy.deletePrescription);
router.delete("/medicines/:medicineId", pharmacy.deletePrescriptionMedicine);
router.get("/medicines", pharmacy.listMedicines);
router.get("/medicines/low-stock", pharmacy.getLowStock);
router.get("/medicines/:id", pharmacy.getMedicine);
router.post("/medicines", pharmacy.createMedicine);
router.put("/medicines/:id", pharmacy.updateMedicine);
router.delete("/medicines/:id", pharmacy.deleteMedicine);
router.get("/categories", pharmacy.getCategories);

export default router;
