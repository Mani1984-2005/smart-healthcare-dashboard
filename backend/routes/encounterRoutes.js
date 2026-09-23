import express from "express";
import prisma from "../db.js";
import authenticate, { authorize } from "../middleware/authMiddleware.js";
import { notify } from "../services/notificationService.js";

const router = express.Router();

router.use(authenticate);

function roleOf(req) {
  return typeof req.user?.role === "string" ? req.user.role.trim().toUpperCase() : "";
}

/** Numeric patient id of the authenticated PATIENT, or null when absent/invalid. */
function ownPatientId(req) {
  const value = Number(req.user?.patientId ?? req.user?.id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** Read access: staff clinician roles read freely; PATIENT reads only own encounters. */
function requireEncounterRead(req, res, next) {
  const role = roleOf(req);
  if (role === "PATIENT") {
    if (ownPatientId(req) === null) {
      return res.status(403).json({ success: false, message: "Forbidden: patient identity not resolved" });
    }
    return next();
  }
  if (["ADMIN", "DOCTOR", "NURSE"].includes(role)) return next();
  return res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
}

// Create encounter from an appointment (Doctor starts consultation).
// patientId/doctorId are derived from the appointment when appointmentId is
// supplied, so a client cannot attach an encounter to the wrong patient.
router.post("/", authorize(["ADMIN", "DOCTOR"]), async (req, res) => {
  try {
    const { appointmentId, patientId: bodyPatientId, doctorId: bodyDoctorId, chiefComplaint, notes } = req.body;

    let patientId = bodyPatientId;
    let doctorId = bodyDoctorId;

    if (appointmentId) {
      // Idempotency: one encounter per appointment.
      const existing = await prisma.encounter.findUnique({
        where: { appointmentId },
        include: { patient: true, doctor: true, appointment: true },
      });
      if (existing) {
        return res.json({ success: true, encounter: existing, message: "Encounter already exists" });
      }

      const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment) {
        return res.status(404).json({ success: false, message: "Appointment not found" });
      }
      // Authoritative identity comes from the appointment record.
      patientId = appointment.patientId;
      doctorId = appointment.doctorId;
    }

    patientId = Number(patientId);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({ success: false, message: "Valid patientId is required" });
    }
    if (!doctorId) {
      return res.status(400).json({ success: false, message: "doctorId is required" });
    }

    const encounter = await prisma.encounter.create({
      data: {
        appointmentId: appointmentId || null,
        patientId,
        doctorId,
        chiefComplaint,
        notes,
      },
      include: { patient: true, doctor: true, appointment: true },
    });

    // Update appointment status
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "IN_PROGRESS" },
      });
    }

    res.status(201).json({ success: true, encounter });
  } catch (error) {
    if (error?.code === "P2002" && req.body.appointmentId) {
      // Unique(appointmentId) raced with another creator — return the winner.
      const existing = await prisma.encounter.findUnique({
        where: { appointmentId: req.body.appointmentId },
        include: { patient: true, doctor: true, appointment: true },
      });
      if (existing) return res.json({ success: true, encounter: existing, message: "Encounter already exists" });
    }
    res.status(500).json({ success: false, error: "Failed to create encounter", details: error.message });
  }
});

// Get encounters (doctor's/today's/patient's). PATIENT is forced to own records.
router.get("/", requireEncounterRead, async (req, res) => {
  try {
    const { doctorId, patientId, date } = req.query;
    const where = {};

    if (roleOf(req) === "PATIENT") {
      const own = ownPatientId(req);
      if (own === null) return res.status(403).json({ success: false, message: "Forbidden: patient identity not resolved" });
      where.patientId = own;
    } else if (patientId) {
      const parsed = Number(patientId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({ success: false, message: "Invalid patientId" });
      }
      where.patientId = parsed;
    }

    if (doctorId && roleOf(req) !== "PATIENT") where.doctorId = doctorId;
    if (date) {
      const d = new Date(date);
      where.startedAt = {
        gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
      };
    }

    const encounters = await prisma.encounter.findMany({
      where,
      include: { patient: true, doctor: true, appointment: true, prescriptions: { include: { items: true } }, labTests: true },
      orderBy: { startedAt: "desc" },
    });
    res.json({ success: true, encounters });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch encounters" });
  }
});

// Get single encounter with full details (PATIENT only sees own).
router.get("/:id", requireEncounterRead, async (req, res) => {
  try {
    const encounter = await prisma.encounter.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
        prescriptions: { include: { items: { include: { medicine: true } } } },
        labTests: true,
        invoices: true,
      },
    });
    if (!encounter) return res.status(404).json({ success: false, message: "Encounter not found" });
    if (roleOf(req) === "PATIENT" && encounter.patientId !== ownPatientId(req)) {
      return res.status(403).json({ success: false, message: "Forbidden: patient can only access their own encounter" });
    }
    res.json({ success: true, encounter });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch encounter" });
  }
});

// Update encounter (add diagnosis, notes, vital signs, anatomy data)
router.put("/:id", authorize(["ADMIN", "DOCTOR"]), async (req, res) => {
  try {
    const { diagnosis, notes, chiefComplaint, vitalSigns, anatomyData, status } = req.body;
    const data = {};
    if (diagnosis !== undefined) data.diagnosis = diagnosis;
    if (notes !== undefined) data.notes = notes;
    if (chiefComplaint !== undefined) data.chiefComplaint = chiefComplaint;
    if (vitalSigns !== undefined) data.vitalSigns = vitalSigns;
    if (anatomyData !== undefined) data.anatomyData = anatomyData;
    if (status !== undefined) {
      data.status = status;
      if (status === "COMPLETED") data.completedAt = new Date();
    }

    const encounter = await prisma.encounter.update({
      where: { id: req.params.id },
      data,
      include: { patient: true, doctor: true },
    });
    res.json({ success: true, encounter });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update encounter", details: error.message });
  }
});

// Complete an encounter
router.post("/:id/complete", authorize(["ADMIN", "DOCTOR"]), async (req, res) => {
  try {
    const encounter = await prisma.encounter.update({
      where: { id: req.params.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // Also complete the appointment
    if (encounter.appointmentId) {
      await prisma.appointment.update({
        where: { id: encounter.appointmentId },
        data: { status: "COMPLETED" },
      });
    }

    // In-app notification to the patient (local only — no SMS/email/WhatsApp).
    await notify({
      userId: encounter.patientId,
      userRole: "PATIENT",
      type: "ENCOUNTER_COMPLETED",
      title: "Consultation completed",
      message: "Your consultation has been completed. Reports and prescriptions are available in your records.",
      data: { encounterId: encounter.id, appointmentId: encounter.appointmentId },
    });

    res.json({ success: true, encounter });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to complete encounter" });
  }
});

export default router;