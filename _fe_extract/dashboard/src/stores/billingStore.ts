import { create } from "zustand";
import {
  fetchInvoices,
  fetchInvoiceById as fetchInvoiceByIdApi,
  createInvoice as createInvoiceApi,
  updateInvoice as updateInvoiceApi,
  deleteInvoice as deleteInvoiceApi,
} from "../services/billingService.js";

export type InvoiceStatus = "Draft" | "Unpaid" | "Partially Paid" | "Paid" | "Overdue" | "Cancelled";
export type PaymentMethod = "Cash" | "Card" | "UPI" | "Insurance" | "Pending";
export type BillingCategory = "Consultation" | "Laboratory" | "Pharmacy" | "Procedure" | "Room" | "ICU" | "Emergency" | "Surgery" | "Other";

export type InvoiceItem = {
  id: string;
  description: string;
  category: BillingCategory;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  phone: string;
  doctorName: string;
  department: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  insuranceCoverage: number;
  insuranceProvider: string;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: PaymentMethod;
  status: InvoiceStatus;
  billingDate: string;
  dueDate: string;
  notes: string;
};

export type BillingInsight = {
  id: string;
  tone: "info" | "warning" | "critical";
  title: string;
  message: string;
};

type InvoiceFilters = {
  status: string;
  paymentMethod: string;
};

type BillingStore = {
  invoices: InvoiceRecord[];
  selectedInvoice: InvoiceRecord | null;
  searchTerm: string;
  filters: InvoiceFilters;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  loadInvoices: () => Promise<void>;
  setSelectedInvoice: (id: string) => Promise<void>;
  clearSelectedInvoice: () => void;
  addInvoice: (payload: Omit<InvoiceRecord, "id" | "invoiceNumber" | "billingDate">) => Promise<void>;
  updateInvoice: (id: string, payload: Partial<Omit<InvoiceRecord, "id" | "invoiceNumber">>) => Promise<void>;
  recordPayment: (id: string, amount: number, method: PaymentMethod) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  searchInvoices: (query: string) => void;
  filterInvoices: (filters: Partial<InvoiceFilters>) => void;
  setPage: (page: number) => void;
  clearError: () => void;
};

function computeTotals(items: InvoiceItem[], discount: number, tax: number, insuranceCoverage: number, amountPaid: number) {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxable = Math.max(subtotal - discount, 0);
  const taxAmount = Math.round(taxable * (tax / 100));
  const grandTotal = Math.max(taxable + taxAmount - insuranceCoverage, 0);
  const balanceDue = Math.max(grandTotal - amountPaid, 0);
  return { subtotal, grandTotal, balanceDue };
}

function createInvoiceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `INV-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function createInvoiceNumber(existingCount: number) {
  const year = new Date().getFullYear();
  return `MCP-${year}-${String(existingCount + 1001).padStart(5, "0")}`;
}

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
const daysFromNow = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const mockInvoices: InvoiceRecord[] = [
  {
    id: "INV-1001",
    invoiceNumber: "MCP-2026-01001",
    patientId: "P-1001",
    patientName: "Amrita Singh",
    phone: "+91 98877 66554",
    doctorName: "Dr. Kavita Sharma",
    department: "Cardiology",
    items: [
      { id: "LI-1", description: "Cardiology consultation", category: "Consultation", quantity: 1, unitPrice: 1200, amount: 1200 },
      { id: "LI-2", description: "ECG", category: "Laboratory", quantity: 1, unitPrice: 800, amount: 800 },
      { id: "LI-3", description: "Lipid profile panel", category: "Laboratory", quantity: 1, unitPrice: 1500, amount: 1500 },
    ],
    subtotal: 3500,
    discount: 200,
    tax: 5,
    insuranceCoverage: 1500,
    insuranceProvider: "Star Health",
    grandTotal: 1965,
    amountPaid: 1965,
    balanceDue: 0,
    paymentMethod: "Insurance",
    status: "Paid",
    billingDate: daysAgo(6),
    dueDate: daysAgo(-9),
    notes: "",
  },
  {
    id: "INV-1002",
    invoiceNumber: "MCP-2026-01002",
    patientId: "P-1002",
    patientName: "Rahul Mehra",
    phone: "+91 99876 55443",
    doctorName: "Dr. Arvind Nair",
    department: "Endocrinology",
    items: [
      { id: "LI-1", description: "Follow-up consultation", category: "Consultation", quantity: 1, unitPrice: 900, amount: 900 },
      { id: "LI-2", description: "HbA1c test", category: "Laboratory", quantity: 1, unitPrice: 650, amount: 650 },
      { id: "LI-3", description: "Metformin 500mg (30 tabs)", category: "Pharmacy", quantity: 2, unitPrice: 120, amount: 240 },
    ],
    subtotal: 1790,
    discount: 0,
    tax: 5,
    insuranceCoverage: 0,
    insuranceProvider: "",
    grandTotal: 1880,
    amountPaid: 0,
    balanceDue: 1880,
    paymentMethod: "Pending",
    status: "Overdue",
    billingDate: daysAgo(18),
    dueDate: daysAgo(4),
    notes: "Reminder sent to patient on last visit.",
  },
  {
    id: "INV-1003",
    invoiceNumber: "MCP-2026-01003",
    patientId: "P-1004",
    patientName: "Sanjay Kapoor",
    phone: "+91 91234 56789",
    doctorName: "Dr. Meera Iyer",
    department: "Emergency",
    items: [
      { id: "LI-1", description: "Emergency admission", category: "Emergency", quantity: 1, unitPrice: 5000, amount: 5000 },
      { id: "LI-2", description: "ICU bed (2 nights)", category: "ICU", quantity: 2, unitPrice: 8000, amount: 16000 },
      { id: "LI-3", description: "Cardiac monitoring", category: "Procedure", quantity: 1, unitPrice: 3200, amount: 3200 },
      { id: "LI-4", description: "Emergency medication", category: "Pharmacy", quantity: 1, unitPrice: 2100, amount: 2100 },
    ],
    subtotal: 26300,
    discount: 1000,
    tax: 5,
    insuranceCoverage: 15000,
    insuranceProvider: "HDFC Ergo",
    grandTotal: 11565,
    amountPaid: 5000,
    balanceDue: 6565,
    paymentMethod: "Insurance",
    status: "Partially Paid",
    billingDate: daysAgo(3),
    dueDate: daysFromNow(4),
    notes: "Awaiting insurance claim approval for balance.",
  },
  {
    id: "INV-1004",
    invoiceNumber: "MCP-2026-01004",
    patientId: "P-1003",
    patientName: "Priya Desai",
    phone: "+91 98765 43210",
    doctorName: "Dr. Kavita Sharma",
    department: "Pulmonology",
    items: [
      { id: "LI-1", description: "Pulmonology consultation", category: "Consultation", quantity: 1, unitPrice: 1000, amount: 1000 },
      { id: "LI-2", description: "Spirometry test", category: "Laboratory", quantity: 1, unitPrice: 1100, amount: 1100 },
    ],
    subtotal: 2100,
    discount: 0,
    tax: 5,
    insuranceCoverage: 0,
    insuranceProvider: "",
    grandTotal: 2205,
    amountPaid: 0,
    balanceDue: 2205,
    paymentMethod: "Pending",
    status: "Unpaid",
    billingDate: daysAgo(1),
    dueDate: daysFromNow(13),
    notes: "",
  },
  {
    id: "INV-1005",
    invoiceNumber: "MCP-2026-01005",
    patientId: "P-1001",
    patientName: "Amrita Singh",
    phone: "+91 98877 66554",
    doctorName: "Dr. Kavita Sharma",
    department: "Cardiology",
    items: [
      { id: "LI-1", description: "Angiography", category: "Procedure", quantity: 1, unitPrice: 18000, amount: 17000 },
    ],
    subtotal: 18000,
    discount: 0,
    tax: 5,
    insuranceCoverage: 10000,
    insuranceProvider: "Star Health",
    grandTotal: 8900,
    amountPaid: 0,
    balanceDue: 8900,
    paymentMethod: "Pending",
    status: "Draft",
    billingDate: daysAgo(0),
    dueDate: daysFromNow(15),
    notes: "Pending final sign-off from billing desk — line item amount does not match quantity x unit price, verify before sending.",
  },
];

export function generateBillingInsights(invoices: InvoiceRecord[]): BillingInsight[] {
  const insights: BillingInsight[] = [];

  const overdue = invoices.filter((invoice) => invoice.status === "Overdue" || (invoice.balanceDue > 0 && invoice.dueDate < today.toISOString().split("T")[0] && invoice.status !== "Cancelled" && invoice.status !== "Paid"));
  if (overdue.length > 0) {
    const total = overdue.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    insights.push({
      id: "overdue",
      tone: "critical",
      title: "Overdue balances",
      message: `${overdue.length} invoice${overdue.length > 1 ? "s are" : " is"} past due, totaling ₹${total.toLocaleString("en-IN")} outstanding.`,
    });
  }

  const pendingInsurance = invoices.filter((invoice) => invoice.insuranceCoverage > 0 && invoice.status !== "Paid" && invoice.status !== "Cancelled");
  if (pendingInsurance.length > 0) {
    insights.push({
      id: "insurance",
      tone: "warning",
      title: "Insurance approvals pending",
      message: `${pendingInsurance.length} invoice${pendingInsurance.length > 1 ? "s" : ""} may require insurance approval or claim documents before they can close.`,
    });
  }

  const mismatched = invoices.filter((invoice) => invoice.items.some((item) => item.unitPrice * item.quantity !== item.amount));
  if (mismatched.length > 0) {
    insights.push({
      id: "mismatch",
      tone: "critical",
      title: "Possible billing errors",
      message: `${mismatched.length} invoice${mismatched.length > 1 ? "s have" : " has"} a line item where quantity × unit price doesn't match the billed amount. Review before sending.`,
    });
  }

  const emergencyTotal = invoices.flatMap((invoice) => invoice.items).filter((item) => item.category === "Emergency" || item.category === "ICU").reduce((sum, item) => sum + item.amount, 0);
  const grandTotalAll = invoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0) || 1;
  const emergencyShare = Math.round((emergencyTotal / grandTotalAll) * 100);
  if (emergencyShare >= 30) {
    insights.push({
      id: "emergency-share",
      tone: "info",
      title: "Emergency & ICU load",
      message: `Emergency and ICU charges make up ${emergencyShare}% of current billed revenue — worth flagging to hospital administration for staffing and inventory planning.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "clear",
      tone: "info",
      title: "No issues detected",
      message: "All invoices are within expected ranges. No overdue balances, mismatches, or pending insurance items right now.",
    });
  }

  return insights;
}

export const useBillingStore = create<BillingStore>((set, get) => ({
  invoices: mockInvoices,
  selectedInvoice: null,
  searchTerm: "",
  filters: { status: "All", paymentMethod: "All" },
  page: 1,
  pageSize: 8,
  loading: false,
  error: null,
  async loadInvoices() {
    set({ loading: true, error: null });
    try {
      const data = await fetchInvoices();
      if (Array.isArray(data) && data.length > 0) {
        set({ invoices: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load invoices", loading: false });
    }
  },
  async setSelectedInvoice(id) {
    const state = get();
    const existing = state.invoices.find((invoice) => invoice.id === id);
    if (existing) {
      set({ selectedInvoice: existing });
      return;
    }
    set({ loading: true, error: null });
    try {
      const invoice = await fetchInvoiceByIdApi(id);
      set({ selectedInvoice: invoice, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Invoice not found", loading: false });
    }
  },
  clearSelectedInvoice() {
    set({ selectedInvoice: null });
  },
  async addInvoice(payload) {
    set({ loading: true, error: null });
    const { subtotal, grandTotal, balanceDue } = computeTotals(payload.items, payload.discount, payload.tax, payload.insuranceCoverage, payload.amountPaid);
    const optimisticInvoice: InvoiceRecord = {
      ...payload,
      id: createInvoiceId(),
      invoiceNumber: createInvoiceNumber(get().invoices.length),
      billingDate: new Date().toISOString().split("T")[0],
      subtotal,
      grandTotal,
      balanceDue,
    };
    try {
      const saved = await createInvoiceApi(payload);
      set((state) => ({ invoices: [saved, ...state.invoices], loading: false }));
    } catch (error) {
      set((state) => ({
        invoices: [optimisticInvoice, ...state.invoices],
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async updateInvoice(id, payload) {
    set({ loading: true, error: null });
    try {
      const saved = await updateInvoiceApi(id, payload);
      set((state) => ({
        invoices: state.invoices.map((invoice) => (invoice.id === id ? saved : invoice)),
        selectedInvoice: state.selectedInvoice?.id === id ? saved : state.selectedInvoice,
        loading: false,
      }));
    } catch (error) {
      set((state) => ({
        invoices: state.invoices.map((invoice) => {
          if (invoice.id !== id) return invoice;
          const merged = { ...invoice, ...payload };
          const { subtotal, grandTotal, balanceDue } = computeTotals(merged.items, merged.discount, merged.tax, merged.insuranceCoverage, merged.amountPaid);
          return { ...merged, subtotal, grandTotal, balanceDue };
        }),
        selectedInvoice: state.selectedInvoice?.id === id ? { ...state.selectedInvoice, ...payload } : state.selectedInvoice,
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async recordPayment(id, amount, method) {
    set({ loading: true, error: null });
    const current = get().invoices.find((invoice) => invoice.id === id);
    if (!current) {
      set({ loading: false, error: "Invoice not found" });
      return;
    }
    const amountPaid = Math.min(current.amountPaid + amount, current.grandTotal);
    const balanceDue = Math.max(current.grandTotal - amountPaid, 0);
    const status: InvoiceStatus = balanceDue === 0 ? "Paid" : amountPaid > 0 ? "Partially Paid" : current.status;
    try {
      const saved = await updateInvoiceApi(id, { amountPaid, paymentMethod: method, status });
      set((state) => ({ invoices: state.invoices.map((invoice) => (invoice.id === id ? saved : invoice)), loading: false }));
    } catch (error) {
      set((state) => ({
        invoices: state.invoices.map((invoice) => (invoice.id === id ? { ...invoice, amountPaid, balanceDue, status, paymentMethod: method } : invoice)),
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async deleteInvoice(id) {
    set({ loading: true, error: null });
    try {
      await deleteInvoiceApi(id);
      set((state) => ({ invoices: state.invoices.filter((invoice) => invoice.id !== id), loading: false }));
    } catch (error) {
      set((state) => ({
        invoices: state.invoices.filter((invoice) => invoice.id !== id),
        loading: false,
        error: error instanceof Error ? `Removed locally only — ${error.message}` : "Removed locally only — could not reach the server",
      }));
    }
  },
  searchInvoices(query) {
    set({ searchTerm: query, page: 1 });
  },
  filterInvoices(filters) {
    set((state) => ({ filters: { ...state.filters, ...filters }, page: 1 }));
  },
  setPage(page) {
    set({ page });
  },
  clearError() {
    set({ error: null });
  },
}));
