const express = require("express");
const router = express.Router();

// Import all route modules
const authRoutes = require("./authRoutes");
const patientRoutes = require("./patientRoutes");
const pharmacyRoutes = require("./pharmacyRoutes");
const healthRoutes = require("./healthRoutes");

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

module.exports = router;