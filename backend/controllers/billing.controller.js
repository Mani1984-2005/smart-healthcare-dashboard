import prisma from "../db.js";
import { notify } from "../services/notificationService.js";

export const getInvoices = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.patientId !== undefined) {
      const patientId = Number(req.query.patientId);
      if (!Number.isInteger(patientId) || patientId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid patientId" });
      }
      where.patientId = patientId;
    }
    const invoices = await prisma.invoice.findMany({
      where,
      include: { patient: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
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

    // PATIENT may only read their own invoice.
    if (typeof req.user?.role === "string" && req.user.role.trim().toUpperCase() === "PATIENT") {
      const own = Number(req.user?.patientId ?? req.user?.id);
      if (!Number.isInteger(own) || own !== invoice.patientId) {
        return res.status(403).json({ success: false, message: "Forbidden: patient can only view their own invoices" });
      }
    }

    res.json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const { patientId: rawPatientId, appointmentId, encounterId, amount, tax, discount, total, status, dueDate } = req.body;

    const patientId = Number(rawPatientId);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({ success: false, message: "Valid patientId is required" });
    }
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue < 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const taxValue = Number(tax) || 0;
    const discountValue = Number(discount) || 0;
    const totalValue = Number.isFinite(Number(total)) ? Number(total) : amountValue + taxValue - discountValue;

    // `items` from the request body is intentionally not persisted — the
    // schema has no InvoiceItem table, and inventing one is out of scope.
    const invoice = await prisma.invoice.create({
      data: {
        patientId,
        appointmentId: appointmentId || null,
        encounterId: encounterId || null,
        amount: amountValue,
        tax: taxValue,
        discount: discountValue,
        total: totalValue,
        status: status || "UNPAID",
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: { patient: { select: { id: true, name: true } } },
    });
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    if (error?.code === "P2003") {
      return res.status(400).json({ success: false, message: "Invalid patient, appointment, or encounter reference" });
    }
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
      data: { status: "PAID" },
      include: { patient: { select: { id: true, name: true } } },
    });

    // Payment status → in-app notification (local only).
    await notify({
      userId: invoice.patientId,
      userRole: "PATIENT",
      type: "PAYMENT_STATUS",
      title: "Payment received",
      message: `Your invoice of ₹${invoice.total ?? invoice.amount} has been marked as paid.`,
      data: { invoiceId: invoice.id, status: invoice.status },
    });

    res.json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};
