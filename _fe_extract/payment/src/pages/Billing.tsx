import { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import LoadingState from "../components/ui/LoadingState";
import EmptyState from "../components/ui/EmptyState";
import Card from "../components/ui/Card";
import { useAuthStore } from "../store/authStore.js";
import { usePaymentStore } from "../stores/paymentStore";
import InvoiceList from "../components/payments/InvoiceList";
import SecurePaymentDialog from "../components/payments/SecurePaymentDialog";
import PaymentDashboardKpis from "../components/payments/PaymentDashboardKpis";
import TransactionTable from "../components/payments/TransactionTable";
import { formatINR, formatDate } from "../utils/formatCurrency";
import type { Invoice } from "../types/payment";

const STAFF_ROLES = ["ADMIN", "BILLING"];

export default function Billing() {
  const { user } = useAuthStore();
  const isStaff = user?.role && STAFF_ROLES.includes(user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financial"
        title="Billing and Payments"
        description={
          isStaff
            ? "Monitor revenue, review transactions, and manage refunds across MediCare Pro."
            : "Review your invoices and pay securely from anywhere."
        }
      />
      {isStaff ? <StaffBillingDashboard /> : <PatientBillingView />}
    </div>
  );
}

function PatientBillingView() {
  const { user } = useAuthStore();
  const { invoices, invoicesLoading, invoicesError, loadInvoices, paymentHistory, loadPaymentHistory } = usePaymentStore();
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
    loadPaymentHistory();
    // Patient identity for this session comes from the mock auth store used
    // throughout this repo (see src/pages/Login.tsx) — it does not yet issue
    // a real Firebase token the way backend/middleware/authMiddleware.js
    // expects. This is a pre-existing gap in the repo's auth wiring, not
    // something introduced by the Payment module — see PAYMENT_IMPLEMENTATION_REPORT.md.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (invoicesLoading) return <LoadingState label="Loading your invoices…" />;
  if (invoicesError) return <EmptyState title="Couldn't load invoices" description={invoicesError} />;

  const outstanding = invoices.filter((inv) => inv.status === "UNPAID" || inv.status === "PARTIALLY_PAID");
  const totalOutstanding = outstanding.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);

  return (
    <div className="space-y-6">
      {outstanding.length > 0 && (
        <Card className="border-cyan-200 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-900 dark:text-cyan-200">Total outstanding balance</p>
              <p className="text-2xl font-semibold text-cyan-950 dark:text-cyan-100">{formatINR(totalOutstanding)}</p>
            </div>
            <p className="text-xs text-cyan-800 dark:text-cyan-300">
              {outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""} awaiting payment
            </p>
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Invoices</h2>
        <InvoiceList invoices={invoices} onPay={setPayingInvoice} />
      </section>

      {paymentHistory && paymentHistory.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Payment History</h2>
          <div className="space-y-2">
            {paymentHistory.items.map((payment) => (
              <Card key={payment.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {payment.paymentOrder?.invoice?.invoiceNumber ?? "Invoice"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(payment.createdAt)} · {payment.method}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatINR(payment.amount)}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <SecurePaymentDialog
        open={payingInvoice !== null}
        invoice={payingInvoice}
        patient={{ name: user?.name ?? "Patient", email: user?.email }}
        onClose={() => setPayingInvoice(null)}
      />
    </div>
  );
}

function StaffBillingDashboard() {
  const { dashboardSummary, transactions, loadDashboard, loadTransactions } = usePaymentStore();
  const { user } = useAuthStore();
  const canRefund = user?.role === "ADMIN" || user?.role === "BILLING";

  useEffect(() => {
    loadDashboard();
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <PaymentDashboardKpis summary={dashboardSummary} />
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Recent Transactions
        </h2>
        {transactions.length === 0 ? (
          <EmptyState title="No transactions yet" description="Patient payments will appear here as they come in." />
        ) : (
          <TransactionTable transactions={transactions} canRefund={canRefund} />
        )}
      </section>
    </div>
  );
}
