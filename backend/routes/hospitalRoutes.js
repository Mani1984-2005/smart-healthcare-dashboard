// backend/routes/hospitalRoutes.js
const express = require("express");
const router = express.Router();
const hospitalController = require("../controllers/hospitalController");

router.get("/dashboard", hospitalController.getDashboard);

// Departments
router.get("/departments", hospitalController.getDepartments);
router.get("/departments/:id", hospitalController.getDepartmentById);
router.post("/departments", hospitalController.createDepartment);
router.put("/departments/:id", hospitalController.updateDepartment);
router.delete("/departments/:id", hospitalController.deleteDepartment);

// Staff
router.get("/staff", hospitalController.getStaff);
router.get("/staff/:id", hospitalController.getStaffById);
router.post("/staff", hospitalController.createStaff);
router.put("/staff/:id", hospitalController.updateStaff);
router.delete("/staff/:id", hospitalController.deleteStaff);

// Assignment
router.post("/assign-staff", hospitalController.assignStaffToDepartment);

module.exports = router;