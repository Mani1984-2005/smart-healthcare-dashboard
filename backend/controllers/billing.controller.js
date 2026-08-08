import prisma from "../db.js";

export const getInvoices = async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { patient: true },
    });
    res.json({ success: true, invoices });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { patient: true },
    });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    res.json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const { patientId, appointmentId, amount, tax, discount, total, status, dueDate, items } = req.body;
    // We can assume items is just stored as JSON for now or not stored since the schema doesn't have an InvoiceItem
    const invoice = await prisma.invoice.create({
      data: {
        patientId,
        appointmentId,
        amount,
        tax,
        discount,
        total,
        status: status || "PENDING",
        dueDate: dueDate ? new Date(dueDate) : null
      },
    });
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const data = req.body;
    if (data.dueDate) {
        data.dueDate = new Date(data.dueDate);
    }
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Invoice deleted" });
  } catch (error) {
    next(error);
  }
};

export const payInvoice = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: "PAID" }
    });
    res.json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};
