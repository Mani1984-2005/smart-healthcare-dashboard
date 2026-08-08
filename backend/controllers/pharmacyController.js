import prisma from "../db.js";

export const getMedicines = async (req, res, next) => {
  try {
    const medicines = await prisma.medicine.findMany();
    res.json({ success: true, medicines });
  } catch (error) {
    next(error);
  }
};

export const getMedicineById = async (req, res, next) => {
  try {
    const medicine = await prisma.medicine.findUnique({
      where: { id: req.params.id },
    });
    if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found" });
    res.json({ success: true, medicine });
  } catch (error) {
    next(error);
  }
};

export const createMedicine = async (req, res, next) => {
  try {
    const { name, genericName, category, manufacturer, form, dosage, unit, stock, reorderLevel, unitPrice, isPrescriptionOnly, batchNumber, expiryDate } = req.body;
    const medicine = await prisma.medicine.create({
      data: {
        name, genericName, category, manufacturer, form, dosage, unit, stock, reorderLevel, unitPrice, isPrescriptionOnly, batchNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : null
      },
    });
    res.status(201).json({ success: true, medicine });
  } catch (error) {
    next(error);
  }
};

export const updateMedicine = async (req, res, next) => {
  try {
    const data = req.body;
    if (data.expiryDate) {
      data.expiryDate = new Date(data.expiryDate);
    }
    const medicine = await prisma.medicine.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, medicine });
  } catch (error) {
    next(error);
  }
};

export const deleteMedicine = async (req, res, next) => {
  try {
    await prisma.medicine.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Medicine deleted" });
  } catch (error) {
    next(error);
  }
};

// Prescriptions
export const getPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      include: { items: true },
    });
    res.json({ success: true, prescriptions });
  } catch (error) {
    next(error);
  }
};

export const getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!prescription) return res.status(404).json({ success: false, message: "Prescription not found" });
    res.json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
};

export const createPrescription = async (req, res, next) => {
  try {
    const { patientId, doctorId, appointmentId, notes, status, items } = req.body;
    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        doctorId,
        appointmentId,
        notes,
        status: status || "PENDING",
        items: {
          create: items // array of { medicineId, dosage, frequency, duration, quantity, instructions }
        }
      },
      include: { items: true }
    });
    res.status(201).json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
};

export const dispensePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prisma Transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!prescription) {
        throw new Error("Prescription not found");
      }
      if (prescription.status === "COMPLETED") {
        throw new Error("Prescription is already dispensed");
      }

      // Deduct stock for each medicine
      for (const item of prescription.items) {
        if (!item.medicineId) continue;
        
        const medicine = await tx.medicine.findUnique({ where: { id: item.medicineId } });
        if (!medicine) {
            throw new Error(`Medicine ${item.medicineId} not found`);
        }
        if (medicine.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${medicine.name}. Required: ${item.quantity}, Available: ${medicine.stock}`);
        }

        await tx.medicine.update({
          where: { id: medicine.id },
          data: { stock: medicine.stock - item.quantity },
        });
      }

      // Mark prescription as COMPLETED
      const updated = await tx.prescription.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      return updated;
    });

    res.json({ success: true, message: "Prescription dispensed successfully", prescription: result });
  } catch (error) {
    if (error.message.includes("Insufficient stock") || error.message.includes("already dispensed") || error.message.includes("not found")) {
        return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};