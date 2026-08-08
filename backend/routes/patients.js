import express from "express";
import prisma from "../db.js";
import { validate } from "../middleware/validate.js";
import { patientSchema } from "../validators/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        appointments: true,
        queues: true,
      }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

router.post("/", validate(patientSchema), async (req, res) => {
  try {
    const { name, age, gender, phone, email, address } = req.body;
    const patient = await prisma.patient.create({
      data: { name, age, gender, phone, email, address },
    });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: "Failed to create patient" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: { appointments: { include: { doctor: true } } }
    });
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch patient" });
  }
});

export default router;
