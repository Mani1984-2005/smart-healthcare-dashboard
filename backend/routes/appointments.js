import express from "express";
import prisma from "../db.js";
import authenticate, { authorize } from "../middleware/authMiddleware.js";
import { notify } from "../services/notificationService.js";

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
      if (!Number.isInteger(patientId) || patientId <= 0) {
        return res.status(403).json({ error: "Forbidden: patient identity not resolved" });
      }
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

router.post("/", authorize(["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "PATIENT"]), async (req, res) => {
  try {
    let { patientId, patientName, bookForOther, doctorId, date, timeSlot, reason, notes, patientProfile } = req.body;
    const requesterRole = normalizeRole(req.user?.role);

    const hasNewPatientName =
      typeof patientName === "string" && patientName.trim().length > 0 &&
      (!patientId || !Number.isInteger(Number(patientId)));

    if (requesterRole === "PATIENT") {
      if (bookForOther) {
        // SOMEONE ELSE: select an existing patient (numeric patientId) or create one (patientName).
        if (hasNewPatientName) {
          const profile = patientProfile && typeof patientProfile === "object" ? patientProfile : {};
          const newPatient = await prisma.patient.create({
            data: {
              name: patientName.trim(),
              age: Number.isInteger(Number(profile.age)) && Number(profile.age) > 0 ? Number(profile.age) : null,
              gender: profile.gender || null,
              phone: profile.phone || null,
              status: "Active",
            },
          });
          patientId = newPatient.id;
        } else if (!Number.isInteger(Number(patientId))) {
          return res.status(400).json({ error: "Booking for someone else requires an existing patientId or a patientName" });
        }
      } else {
        // MYSELF: use the authenticated patient's own profile — never re-entered.
        if (hasNewPatientName) {
          return res.status(400).json({ error: "Use bookForOther=true to create a record for another patient" });
        }
        if (!patientSelfMatch(req, patientId)) {
          return res.status(403).json({ error: "Forbidden: patient can only book appointments for themselves" });
        }
      }
    } else if (hasNewPatientName) {
      // Staff creating a new patient record during booking.
      const profile = patientProfile && typeof patientProfile === "object" ? patientProfile : {};
      const newPatient = await prisma.patient.create({
        data: {
          name: patientName.trim(),
          age: Number.isInteger(Number(profile.age)) && Number(profile.age) > 0 ? Number(profile.age) : null,
          gender: profile.gender || null,
          phone: profile.phone || null,
          status: "Active",
        },
      });
      patientId = newPatient.id;
    }

    patientId = Number(patientId);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({ error: "Invalid patientId" });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(400).json({ error: "Patient not found" });
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      return res.status(400).json({ error: "Doctor not found" });
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

    // In-app notifications (local only — no SMS/email/WhatsApp configured).
    const when = `${new Date(date).toLocaleDateString("en-IN")} at ${timeSlot}`;
    await notify({
      userId: patientId,
      userRole: "PATIENT",
      type: "APPOINTMENT_CREATED",
      title: "Appointment booked",
      message: `Your appointment with Dr. ${doctor.name} is scheduled for ${when}.`,
      data: { appointmentId: appointment.id, doctorId },
    });
    await notify({
      userId: doctorId,
      userRole: "DOCTOR",
      type: "APPOINTMENT_ASSIGNED",
      title: "New appointment assigned",
      message: `A new appointment is scheduled on ${when}.`,
      data: { appointmentId: appointment.id, patientId },
    });

    // A PATIENT who booked for someone else must not receive that patient's
    // full record (demographics/clinical history) in the response.
    if (requesterRole === "PATIENT" && appointment.patientId !== Number(req.user?.patientId ?? req.user?.id)) {
      const { patient: _omit, ...rest } = appointment;
      return res.json({ ...rest, patient: { id: patient.id, name: patient.name } });
    }

    res.json(appointment);
  } catch (error) {
    if (error?.code === "P2003") {
      return res.status(400).json({ error: "Invalid patient or doctor reference" });
    }
    res.status(500).json({ error: "Failed to create appointment", details: error.message });
  }
});

router.put("/:id/status", authorize(["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]), async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
      include: { doctor: true },
    });

    // In-app notification of appointment updates (local only).
    const statusLabel = String(status || "").replace(/_/g, " ").toLowerCase();
    await notify({
      userId: appointment.patientId,
      userRole: "PATIENT",
      type: status === "CANCELLED" ? "APPOINTMENT_CANCELLED" : "APPOINTMENT_UPDATED",
      title: status === "CANCELLED" ? "Appointment cancelled" : "Appointment updated",
      message: `Your appointment with Dr. ${appointment.doctor?.name || "your doctor"} is now ${statusLabel}.`,
      data: { appointmentId: appointment.id, status },
    });

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: "Failed to update appointment status" });
  }
});

export default router;
