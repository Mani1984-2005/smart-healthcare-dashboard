import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import patientRoutes from "./routes/patients.js";
import healthRoutes from "./routes/healthRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("MediCare Pro Backend Running 🚀");
});

app.use("/health", healthRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/v1/patients", patientRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
