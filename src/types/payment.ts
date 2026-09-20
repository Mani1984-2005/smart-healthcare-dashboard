// Mirrors backend/prisma/schema.prisma. Kept as plain string literal unions
// (not imported from the backend) since the frontend and backend are
// separate build targets in this repo — there's no shared package to import
// from. If they ever diverge, this file is the one to check against the
// Prisma schema.

export type InvoiceStatus = "DRAFT" | "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

export type PaymentMethod = "UPI" | "CARD" | "NETBANKING" | "WALLET" | "CASH" | "BANK_TRANSFER" | "OTHER";

export type PaymentOrderStatus = "CREATED" | "ATTEMPTED" | "PAID" | "EXPIRED" | "CANCELLED";

export type PaymentStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export type RefundStatus = "PENDING" | "PROCESSED" | "FAILED";

export interface InvoiceItem {
  id: string;
  serviceName: string;
  category: string;
  quantity: number;
  unitPrice: string | number;
  amount: string | number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patient?: { id: string; fullName: string };
  items: InvoiceItem[];
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  grandTotal: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  status: InvoiceStatus;
  billingDate: string;
  dueDate?: string | null;
  paidAt?: string | null;
}

export interface PaymentOrder {
  id: string;
  invoiceId: string;
  amount: string | number;
  currency: string;
  status: PaymentOrderStatus;
  providerOrderId: string | null;
  idempotencyKey: string;
  expiresAt?: string | null;
}

export interface PaymentAttempt {
  id: string;
  paymentOrderId: string;
  method: PaymentMethod;
  status: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: string | number;
  status: RefundStatus;
  reason?: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentOrderId: string;
  amount: string | number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  providerPaymentId: string;
  createdAt: string;
  refunds?: Refund[];
  paymentOrder?: { invoice?: Invoice; patient?: { fullName: string } };
}

export interface PaymentHistoryResponse {
  items: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardSummary {
  todaysRevenue: string | number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalRefunded: string | number;
  outstandingAmount: string | number;
}
