import prisma from "../db.js";
import { notify } from "../services/notificationService.js";

export const getLabTests = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.patientId !== undefined) {
      const patientId = Number(req.query.patientId);
      if (!Number.isInteger(patientId) || patientId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid patientId" });
      }
      where.patientId = patientId;
    }
    const tests = await prisma.labTest.findMany({
      where,
      include: { patient: { select: { id: true, name: true } }, encounter: { select: { id: true, appointmentId: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, tests });
  } catch (error) {
    next(error);
  }
};

export const getLabTestById = async (req, res, next) => {
  try {
    const test = await prisma.labTest.findUnique({
      where: { id: req.params.id },
      include: { patient: true }
    });
    if (!test) return res.status(404).json({ success: false, message: "Lab test not found" });
    res.json({ success: true, test });
  } catch (error) {
    next(error);
  }
};

export const createLabTest = async (req, res, next) => {
  try {
    const { patientId: rawPatientId, encounterId, testName, testCategory, priority, notes, orderedBy } = req.body;

    const patientId = Number(rawPatientId);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({ success: false, message: "Valid patientId is required" });
    }
    if (typeof testName !== "string" || !testName.trim()) {
      return res.status(400).json({ success: false, message: "testName is required" });
    }

    const test = await prisma.labTest.create({
      data: {
        patientId,
        encounterId: encounterId || null,
        testName: testName.trim(),
        testCategory,
        priority: priority || "NORMAL",
        status: "PENDING",
        orderedBy: orderedBy || req.user?.doctorId || null,
        notes
      },
      include: { patient: { select: { id: true, name: true } } },
    });

    // Lab order → in-app notification to the patient (local only).
    await notify({
      userId: patientId,
      userRole: "PATIENT",
      type: "LAB_ORDER",
      title: "Lab test ordered",
      message: `Your ${test.testName} test has been ordered and awaits sample collection.`,
      data: { labTestId: test.id, testName: test.testName },
    });

    res.status(201).json({ success: true, test });
  } catch (error) {
    if (error?.code === "P2003") {
      return res.status(400).json({ success: false, message: "Invalid patient or encounter reference" });
    }
    next(error);
  }
};

export const updateLabTest = async (req, res, next) => {
  try {
    const { status, result, completedAt } = req.body;
    const data = {};
    if (status !== undefined) data.status = status;
    if (result !== undefined) data.result = result;

    const before = await prisma.labTest.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ success: false, message: "Lab test not found" });

    const becomingCompleted = status === "COMPLETED" && before.status !== "COMPLETED";
    if (completedAt) {
      data.completedAt = new Date(completedAt);
    } else if (becomingCompleted) {
      data.completedAt = new Date();
    }

    const test = await prisma.labTest.update({
      where: { id: req.params.id },
      data,
      include: { patient: { select: { id: true, name: true } } },
    });

    // Lab result available → in-app notification (local only).
    if (becomingCompleted) {
      await notify({
        userId: test.patientId,
        userRole: "PATIENT",
        type: "LAB_RESULT",
        title: "Lab report available",
        message: `Your ${test.testName} report is now available.`,
        data: { labTestId: test.id, testName: test.testName },
      });
      if (before.orderedBy) {
        await notify({
          userId: before.orderedBy,
          userRole: "DOCTOR",
          type: "LAB_RESULT",
          title: "Lab result ready",
          message: `Result for ${test.testName} is ready for review.`,
          data: { labTestId: test.id, patientId: test.patientId },
        });
      }
    }

    res.json({ success: true, test });
  } catch (error) {
    next(error);
  }
};

export const deleteLabTest = async (req, res, next) => {
  try {
    await prisma.labTest.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Lab test deleted" });
  } catch (error) {
    next(error);
  }
};
