import { create } from "zustand";
import * as paymentService from "../services/paymentService.js";
import { openRazorpayCheckout } from "../services/razorpayCheckout.js";
import type {
  DashboardSummary,
  Invoice,
  Payment,
  PaymentHistoryResponse,
  PaymentOrder,
} from "../types/payment";

type PayFlowStatus = "idle" | "creating_order" | "awaiting_checkout" | "confirming" | "success" | "failed";

type PaymentStore = {
  // Patient-facing
  invoices: Invoice[];
  invoicesLoading: boolean;
  invoicesError: string | null;
  paymentHistory: PaymentHistoryResponse | null;
  historyLoading: boolean;

  payFlow: {
    status: PayFlowStatus;
    invoice: Invoice | null;
    order: PaymentOrder | null;
    error: string | null;
  };

  loadInvoices: (params?: Record<string, string>) => Promise<void>;
  loadPaymentHistory: (page?: number) => Promise<void>;
  startPayment: (invoice: Invoice, patient: { name: string; email?: string; phone?: string }) => Promise<void>;
  resetPayFlow: () => void;

  // Staff dashboard
  dashboardSummary: DashboardSummary | null;
  transactions: Payment[];
  transactionsTotal: number;
  dashboardLoading: boolean;
  loadDashboard: () => Promise<void>;
  loadTransactions: (params?: Record<string, string>) => Promise<void>;
  refundPayment: (paymentId: string, amount?: number, reason?: string) => Promise<void>;
};

export const usePaymentStore = create<PaymentStore>((set, get) => ({
  invoices: [],
  invoicesLoading: false,
  invoicesError: null,
  paymentHistory: null,
  historyLoading: false,

  payFlow: { status: "idle", invoice: null, order: null, error: null },

  dashboardSummary: null,
  transactions: [],
  transactionsTotal: 0,
  dashboardLoading: false,

  async loadInvoices(params = {}) {
    set({ invoicesLoading: true, invoicesError: null });
    try {
      const data = await paymentService.fetchInvoices(params);
      set({ invoices: data.items, invoicesLoading: false });
    } catch (err) {
      set({ invoicesError: (err as Error).message, invoicesLoading: false });
    }
  },

  async loadPaymentHistory(page = 1) {
    set({ historyLoading: true });
    try {
      const data = await paymentService.fetchPaymentHistory({ page: String(page) });
      set({ paymentHistory: data, historyLoading: false });
    } catch {
      set({ historyLoading: false });
    }
  },

  async startPayment(invoice, patient) {
    set({ payFlow: { status: "creating_order", invoice, order: null, error: null } });

    let order: PaymentOrder;
    try {
      order = await paymentService.createPaymentOrder(invoice.id);
    } catch (err) {
      set({ payFlow: { status: "failed", invoice, order: null, error: (err as Error).message } });
      return;
    }

    set((state) => ({ payFlow: { ...state.payFlow, status: "awaiting_checkout", order } }));

    if (!order.providerOrderId) {
      set((state) => ({
        payFlow: { ...state.payFlow, status: "failed", error: "Payment order was created but no provider order id was returned." },
      }));
      return;
    }

    await openRazorpayCheckout({
      providerOrderId: order.providerOrderId,
      amountInRupees: Number(order.amount),
      invoiceNumber: invoice.invoiceNumber,
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone,
      onSuccess: async (response) => {
        set((state) => ({ payFlow: { ...state.payFlow, status: "confirming" } }));
        try {
          const attempt = await paymentService.recordPaymentAttempt(order.id, "UPI");
          await paymentService.confirmPayment({
            paymentOrderId: order.id,
            paymentAttemptId: attempt.id,
            providerOrderId: response.razorpay_order_id,
            providerPaymentId: response.razorpay_payment_id,
            providerSignature: response.razorpay_signature,
          });
          set((state) => ({ payFlow: { ...state.payFlow, status: "success" } }));
          get().loadInvoices();
        } catch (err) {
          set((state) => ({ payFlow: { ...state.payFlow, status: "failed", error: (err as Error).message } }));
        }
      },
      onFailure: (reason) => {
        set((state) => ({ payFlow: { ...state.payFlow, status: "failed", error: reason } }));
      },
      onDismiss: () => {
        set((state) =>
          state.payFlow.status === "awaiting_checkout"
            ? { payFlow: { ...state.payFlow, status: "idle" } }
            : state
        );
      },
    });
  },

  resetPayFlow() {
    set({ payFlow: { status: "idle", invoice: null, order: null, error: null } });
  },

  async loadDashboard() {
    set({ dashboardLoading: true });
    try {
      const summary = await paymentService.fetchDashboardSummary();
      set({ dashboardSummary: summary, dashboardLoading: false });
    } catch {
      set({ dashboardLoading: false });
    }
  },

  async loadTransactions(params = {}) {
    try {
      const data = await paymentService.fetchTransactions(params);
      set({ transactions: data.items, transactionsTotal: data.total });
    } catch {
      // Surfaced via empty state in the UI rather than a thrown error — the
      // dashboard summary cards above still render independently.
    }
  },

  async refundPayment(paymentId, amount, reason) {
    await paymentService.initiateRefund(paymentId, { amount, reason });
    await get().loadTransactions();
  },
}));
