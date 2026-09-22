import express from "express";
import prisma from "../db.js";
import authenticate, { authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { appointmentSchema } from "../validators/index.js";

const router = express.Router();

router.use(authenticate);

function normalizeRole(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function patientSelfMatch(req, patientId) {
  if (normalizeRole(req.user?.role) !== "PATIENT") return true;
  const userPatientId = Number(req.user?.patientId ?? req.user?.id);
  return Number(patientId) === userPatientId;
}

router.get("/", async (req, res) => {
  try {
    if (normalizeRole(req.user?.role) === "PATIENT") {
      const patientId = Number(req.user?.patientId ?? req.user?.id);
      const appointments = await prisma.appointment.findMany({
        where: { patientId },
        include: { patient: true, doctor: true },
        orderBy: { date: "desc" },
      });
      return res.json(appointments);
    }

    const appointments = await prisma.appointment.findMany({
      include: { patient: true, doctor: true },
      orderBy: { date: "desc" },
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

router.post("/", authorize(["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "PATIENT"]), validate(appointmentSchema), async (req, res) => {
  try {
    const { patientId, doctorId, date, timeSlot, reason, notes } = req.body;

    if (normalizeRole(req.user?.role) === "PATIENT" && !patientSelfMatch(req, patientId)) {
      return res.status(403).json({ error: "Forbidden: patient can only book appointments for themselves" });
    }

    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId,
        date: new Date(date),
        timeSlot,
        status: { notIn: ["CANCELLED"] },
      },
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
        notes,
      },
      include: { patient: true, doctor: true },
    });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: "Failed to create appointment", details: error.message });
  }
});

router.put("/:id/status", authorize(["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]), async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: "Failed to update appointment status" });
  }
});

export default router;
