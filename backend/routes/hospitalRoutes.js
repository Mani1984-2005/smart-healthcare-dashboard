import express from "express";
const router = express.Router();
import * as hospitalController from "../controllers/hospitalController.js";

// Departments
router.get("/departments", hospitalController.getDepartments);
router.get("/departments/:id", hospitalController.getDepartmentById);
router.post("/departments", hospitalController.createDepartment);
router.put("/departments/:id", hospitalController.updateDepartment);
router.delete("/departments/:id", hospitalController.deleteDepartment);

// Beds
router.get("/beds", hospitalController.getBeds);
router.post("/beds", hospitalController.createBed);

export default router;