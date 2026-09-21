import express from "express";
const router = express.Router();

// Import all route modules
import authRoutes from "./authRoutes.js";
import patientRoutes from "./patientRoutes.js";
import pharmacyRoutes from "./pharmacyRoutes.js";
import healthRoutes from "./healthRoutes.js";

// Mount routes
router.use("/auth", authRoutes);
router.use("/patients", patientRoutes);
router.use("/pharmacy", pharmacyRoutes);
router.use("/health", healthRoutes);

// Default route (optional but useful)
router.get("/", (req, res) => {
  res.json({
    message: "MediCare Pro API Routes Working 🚀",
    availableRoutes: [
      "/auth",
      "/patients",
      "/pharmacy",
      "/health"
    ]
  });
});

export default router;