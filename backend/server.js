import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import healthRoutes from "./routes/healthRoutes.js";
import pharmacyRoutes from "./routes/pharmacyRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import hospitalRoutes from "./routes/hospitalRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ success: true, message: "MediCare Pro Backend Running" });
});

app.use("/api/health", healthRoutes);
app.use("/api", pharmacyRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/hospital", hospitalRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
