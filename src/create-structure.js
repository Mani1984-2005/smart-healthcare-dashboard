const fs = require("fs");

const structure = [
  "config/db.js",
  "controllers/pharmacyController.js",
  "controllers/patientController.js",
  "models/Prescription.js",
  "routes/pharmacyRoutes.js",
  "services/pharmacyService.js",
  "modules/clinical/index.js"
];

structure.forEach(file => {
  fs.mkdirSync(file.split("/").slice(0, -1).join("/"), { recursive: true });
  fs.writeFileSync(file, "");
});

console.log("Backend structure created!");