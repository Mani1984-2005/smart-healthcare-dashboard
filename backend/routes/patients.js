import express from "express";
import prisma from "../db.js";
import authenticate, { authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { patientSchema } from "../validators/index.js";

const router = express.Router();

/**
 * All patient endpoints require authentication.
 * Authorization is enforced server-side.
 */
router.use(authenticate);

function normalizeUserRole(role) {
  return typeof role === "string" ? role.trim().toUpperCase() : "";
}

function getPatientAccessError(res) {
  return res.status(403).json({ error: "Forbidden: patient can only access their own patient record" });
}

function allowPatientSelfOnly(req, patientId) {
  const role = normalizeUserRole(req.user?.role);
  if (role === "PATIENT") {
    const userPatientId = Number(req.user?.patientId ?? req.user?.id);
    if (!Number.isInteger(userPatientId) || userPatientId !== Number(patientId)) {
      return false;
    }
  }
  return true;
}

/**
 * Convert and validate a patient ID.
 *
 * Returns:
 * - positive integer when valid
 * - null when invalid
 */
function parsePatientId(value) {
  const patientId = Number(value);

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return null;
  }

  return patientId;
}

/**
 * Safely log backend errors without exposing
 * internal database details to API consumers.
 */
function logPatientError(operation, error) {
  console.error(`[Patients] ${operation} failed`, {
    name: error?.name,
    code: error?.code,
    message: error?.message,
  });
}

/**
 * Standard server-error response.
 */
function serverError(res, message) {
  return res.status(500).json({
    error: message,
  });
}

/**
 * GET /patients
 *
 * Returns all patients.
 */
router.get("/", async (req, res) => {
  try {
    const role = normalizeUserRole(req.user?.role);
    if (role === "PATIENT") {
      const patientId = Number(req.user?.patientId ?? req.user?.id);
      if (!Number.isInteger(patientId) || patientId <= 0) {
        return res.status(403).json({ error: "Forbidden: patient identity not resolved" });
      }
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: { appointments: true, queues: true },
      });

      return res.status(200).json({ data: patient ? [patient] : [] });
    }

    const patients = await prisma.patient.findMany({
      include: {
        appointments: true,
        queues: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    return res.status(200).json({
      data: patients,
    });
  } catch (error) {
    logPatientError("fetch patients", error);

    return serverError(res, "Failed to fetch patients");
  }
});

/**
 * POST /patients/me
 *
 * Resolves (finds or creates) the Patient row that belongs to the
 * authenticated PATIENT, so login can attach a stable patientId to the
 * session token. PATIENT-only: a patient can never claim another
 * patient's record by supplying a different id.
 */
router.post("/me", async (req, res) => {
  if (normalizeUserRole(req.user?.role) !== "PATIENT") {
    return res.status(403).json({ error: "Forbidden: only patients may resolve their own profile" });
  }

  const { name, email, phone } = req.body || {};
  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "email is required to resolve the patient profile" });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    let patient = await prisma.patient.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });

    if (!patient) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "name is required to create the patient profile" });
      }
      patient = await prisma.patient.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
          status: "Active",
        },
      });
    }

    return res.status(200).json({
      data: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        age: patient.age,
        gender: patient.gender,
      },
    });
  } catch (error) {
    logPatientError("resolve patient profile", error);
    if (error?.code === "P2002") {
      // Concurrent create for the same email — re-read.
      const existing = await prisma.patient.findFirst({
        where: { email: { equals: email.trim().toLowerCase(), mode: "insensitive" } },
      });
      if (existing) {
        return res.status(200).json({
          data: { id: existing.id, name: existing.name, email: existing.email, phone: existing.phone, age: existing.age, gender: existing.gender },
        });
      }
    }
    return serverError(res, "Failed to resolve patient profile");
  }
});

/**
 * GET /patients/booking-lookup?phone=... or ?name=...
 *
 * Booking-scoped lookup used by the "book for someone else" flow. Returns
 * ONLY minimal identity fields (id, name, age, gender, phone) — never
 * demographics beyond that, medical history, or any clinical data. Exact
 * phone match or exact name match, limited to 5 rows.
 */
router.get("/booking-lookup", async (req, res) => {
  const { phone, name } = req.query;
  const where = [];

  if (typeof phone === "string" && phone.trim()) {
    where.push({ phone: { equals: phone.trim() } });
  }
  if (typeof name === "string" && name.trim()) {
    where.push({ name: { equals: name.trim(), mode: "insensitive" } });
  }
  if (where.length === 0) {
    return res.status(400).json({ error: "Provide phone or name to look up a patient" });
  }

  try {
    const matches = await prisma.patient.findMany({
      where: { OR: where },
      select: { id: true, name: true, age: true, gender: true, phone: true },
      take: 5,
      orderBy: { id: "desc" },
    });
    return res.status(200).json({ data: matches });
  } catch (error) {
    logPatientError("booking lookup", error);
    return serverError(res, "Failed to look up patient");
  }
});

/**
 * GET /patients/:id
 *
 * Returns one patient by ID.
 */
router.get("/:id", async (req, res) => {
  const patientId = parsePatientId(req.params.id);

  if (patientId === null) {
    return res.status(400).json({
      error: "Invalid patient id",
    });
  }

  if (!allowPatientSelfOnly(req, patientId)) {
    return getPatientAccessError(res);
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: {
        id: patientId,
      },
      include: {
        appointments: true,
        queues: true,
      },
    });

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found",
      });
    }

    return res.status(200).json({
      data: patient,
    });
  } catch (error) {
    logPatientError("fetch patient", error);

    return serverError(res, "Failed to fetch patient");
  }
});

/**
 * POST /patients
 *
 * Creates a new patient.
 */
router.post(
  "/",
  authenticate,
  authorize(["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"]),
  validate(patientSchema),
  async (req, res) => {
    try {
      const {
        name,
        age,
        gender,
        phone,
        email,
        address,
        bloodGroup,
        medicalHistory,
        status,
      } = req.body;

      const patient = await prisma.patient.create({
        data: {
          name,
          age,
          gender,
          phone,
          email,
          address,
          bloodGroup,
          medicalHistory: Array.isArray(medicalHistory) ? medicalHistory : [],
          status: status || "Active",
        },
      });

      return res.status(201).json({
        data: patient,
      });
    } catch (error) {
      logPatientError("create patient", error);

      /*
       * Prisma unique constraint violation.
       */
      if (error?.code === "P2002") {
        return res.status(409).json({
          error: "A patient with the supplied unique information already exists",
        });
      }

      return serverError(res, "Failed to create patient");
    }
  }
);

/**
 * PUT /patients/:id
 *
 * Updates an existing patient.
 */
router.put(
  "/:id",
  (req, res, next) => {
    if (normalizeUserRole(req.user?.role) === "PATIENT" && !allowPatientSelfOnly(req, req.params.id)) {
      return getPatientAccessError(res);
    }
    return next();
  },
  validate(patientSchema),
  async (req, res) => {
    const patientId = parsePatientId(req.params.id);

    if (patientId === null) {
      return res.status(400).json({
        error: "Invalid patient id",
      });
    }

    try {
      const {
        name,
        age,
        gender,
        phone,
        email,
        address,
        bloodGroup,
        medicalHistory,
        status,
      } = req.body;

      const patient = await prisma.patient.update({
        where: {
          id: patientId,
        },
        data: {
          name,
          age,
          gender,
          phone,
          email,
          address,
          bloodGroup,
          medicalHistory: Array.isArray(medicalHistory) ? medicalHistory : [],
          status: status || "Active",
        },
      });

      return res.status(200).json({
        data: patient,
      });
    } catch (error) {
      logPatientError("update patient", error);

      /*
       * Prisma record-not-found error.
       */
      if (error?.code === "P2025") {
        return res.status(404).json({
          error: "Patient not found",
        });
      }

      /*
       * Prisma unique constraint violation.
       */
      if (error?.code === "P2002") {
        return res.status(409).json({
          error: "A patient with the supplied unique information already exists",
        });
      }

      return serverError(res, "Failed to update patient");
    }
  }
);

/**
 * DELETE /patients/:id
 *
 * Deletes an existing patient.
 */
router.delete("/:id", async (req, res) => {
  const patientId = parsePatientId(req.params.id);

  if (patientId === null) {
    return res.status(400).json({
      error: "Invalid patient id",
    });
  }

  try {
    await prisma.patient.delete({
      where: {
        id: patientId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    logPatientError("delete patient", error);

    /*
     * Patient does not exist.
     */
    if (error?.code === "P2025") {
      return res.status(404).json({
        error: "Patient not found",
      });
    }

    /*
     * Patient may be referenced by related records.
     * Do not expose Prisma/database details.
     */
    if (error?.code === "P2003") {
      return res.status(409).json({
        error: "Patient cannot be deleted because related records exist",
      });
    }

    return serverError(res, "Failed to delete patient");
  }
});

export default router;