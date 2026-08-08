import express from "express";
const router = express.Router();

// Import all route modules
import authRoutes from "./authRoutes.js";
import patientRoutes from "./patients.js";
import doctorRoutes from "./doctors.js";
import appointmentRoutes from "./appointments.js";
import queueRoutes from "./queue.js";
import pharmacyRoutes from "./pharmacyRoutes.js";
import healthRoutes from "./healthRoutes.js";
import billingRoutes from "./billingRoutes.js";
import hospitalRoutes from "./hospitalRoutes.js";
import laboratoryRoutes from "./laboratoryRoutes.js";

import { authenticate, authorize } from "../middleware/authMiddleware.js";

// Mount public routes
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

// Mount protected routes (all require authentication)
router.use("/patients", authenticate, patientRoutes);
router.use("/doctors", authenticate, doctorRoutes);
router.use("/appointments", authenticate, appointmentRoutes);
router.use("/queue", authenticate, authorize(["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]), queueRoutes);
router.use("/pharmacy", authenticate, authorize(["ADMIN", "PHARMACIST", "DOCTOR", "NURSE"]), pharmacyRoutes);
router.use("/billing", authenticate, authorize(["ADMIN", "BILLING", "RECEPTIONIST"]), billingRoutes);
router.use("/hospital", authenticate, authorize(["ADMIN"]), hospitalRoutes);
router.use("/laboratory", authenticate, authorize(["ADMIN", "DOCTOR", "NURSE", "LAB_TECH"]), laboratoryRoutes);

// Default route
router.get("/", (req, res) => {
  res.json({
    message: "MediCare Pro Enterprise API Routes Working 🚀",
  });
});

export default router;