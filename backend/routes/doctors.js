import express from "express";
import prisma from "../db.js";
import { validate } from "../middleware/validate.js";
import { doctorSchema } from "../validators/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        appointments: true,
      }
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

router.post("/", validate(doctorSchema), async (req, res) => {
  try {
    const { name, department, specialization, phone, email } = req.body;
    const doctor = await prisma.doctor.create({
      data: { name, department, specialization, phone, email },
    });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: "Failed to create doctor" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: { appointments: { include: { patient: true } } }
    });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch doctor" });
  }
});

export default router;
