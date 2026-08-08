import prisma from "../db.js";

export const getLabTests = async (req, res, next) => {
  try {
    const tests = await prisma.labTest.findMany({
      include: { patient: true }
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
    const { patientId, testName, testCategory, priority, notes } = req.body;
    const test = await prisma.labTest.create({
      data: {
        patientId,
        testName,
        testCategory,
        priority: priority || "NORMAL",
        status: "PENDING",
        notes
      },
    });
    res.status(201).json({ success: true, test });
  } catch (error) {
    next(error);
  }
};

export const updateLabTest = async (req, res, next) => {
  try {
    const { status, result, completedAt } = req.body;
    const data = { status, result };
    if (completedAt) {
      data.completedAt = new Date(completedAt);
    }
    const test = await prisma.labTest.update({
      where: { id: req.params.id },
      data,
    });
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
