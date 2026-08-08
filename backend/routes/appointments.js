import express from "express";
import prisma from "../db.js";
import { validate } from "../middleware/validate.js";
import { appointmentSchema } from "../validators/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: true,
        doctor: true,
      }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

router.post("/", validate(appointmentSchema), async (req, res) => {
  try {
    const { patientId, doctorId, date, timeSlot, reason, notes } = req.body;
    
    // Check for conflict
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId,
        date: new Date(date),
        timeSlot,
        status: { notIn: ["CANCELLED"] }
      }
    });
    
    if (existing) {
      return res.status(409).json({ error: "Time slot already booked" });
    }

    const appointment = await prisma.appointment.create({
      data: { 
        patientId, 
        doctorId, 
        date: new Date(date), 
        timeSlot, 
        reason, 
        notes 
      },
      include: { patient: true, doctor: true }
    });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: "Failed to create appointment", details: error.message });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: "Failed to update appointment status" });
  }
});

export default router;
