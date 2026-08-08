import express from "express";
const router = express.Router();
import * as laboratoryController from "../controllers/laboratoryController.js";

router.get("/tests", laboratoryController.getLabTests);
router.get("/tests/:id", laboratoryController.getLabTestById);
router.post("/tests", laboratoryController.createLabTest);
router.put("/tests/:id", laboratoryController.updateLabTest);
router.delete("/tests/:id", laboratoryController.deleteLabTest);

export default router;
