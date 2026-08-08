import prisma from "../db.js";

// Departments
export const getDepartments = async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany();
    res.json({ success: true, departments });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const department = await prisma.department.findUnique({
      where: { id: req.params.id },
    });
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });
    res.json({ success: true, department });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const department = await prisma.department.create({
      data: { name, description },
    });
    res.status(201).json({ success: true, department });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const department = await prisma.department.update({
      where: { id: req.params.id },
      data: { name, description },
    });
    res.json({ success: true, department });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    await prisma.department.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Department deleted" });
  } catch (error) {
    next(error);
  }
};

// Beds
export const getBeds = async (req, res, next) => {
  try {
    const beds = await prisma.bed.findMany();
    res.json({ success: true, beds });
  } catch (error) {
    next(error);
  }
};

export const createBed = async (req, res, next) => {
  try {
    const { ward, number, status, patientId } = req.body;
    const bed = await prisma.bed.create({
      data: { ward, number, status, patientId },
    });
    res.status(201).json({ success: true, bed });
  } catch (error) {
    next(error);
  }
};