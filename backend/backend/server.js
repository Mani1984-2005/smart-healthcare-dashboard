import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import healthRoutes from "./routes/healthRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

 // connectDB();

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MediCare Pro Backend Running",
  });
});

app.use("/api/health", healthRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});