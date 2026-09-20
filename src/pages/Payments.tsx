import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, IndianRupee } from "lucide-react";
import { Badge, Button, Card, EmptyState, LoadingState, MetricCard, PageHeader, Section } from "../components/ui";
import { usePaymentStore } from "../stores/paymentStore.ts";
import PaymentDashboardKpis from "../components/payments/PaymentDashboardKpis";
import { demoInvoices, demoPaymentSummary, demoTransactions } from "../demo/prototypeData";
import { withDemoFallback } from "../services/demoAware";
import { formatINR, formatDate } from "../utils/formatCurrency";
import type { DashboardSummary, Payment } from "../types/payment";

export default function Payments() {
  const {
    dashboardSummary,
    transactions,
    dashboardLoading,
    loadDashboard,
    loadTransactions,
  } = usePaymentStore();

  const [usedDemo, setUsedDemo] = useState(false);
  const [demoSummary, setDemoSummary] = useState<DashboardSummary | null>(null);
  const [demoTxns, setDemoTxns] = useState<typeof demoTransactions>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await Promise.all([loadDashboard(), loadTransactions()]);
      } catch {
        /* store catches internally */
      }

      // If store still has no data after load attempt, fall back to demo.
      const summaryResult = await withDemoFallback(
        async () => {
          // Re-read after store load; treat empty as failure for demo pages.
          const { dashboardSummary: s, transactions: t } = usePaymentStore.getState();
          if (!s && t.length === 0) throw new Error("Payment API unavailable");
          return { summary: s, transactions: t };
        },
        () => ({
          summary: {
            todaysRevenue: demoPaymentSummary.todaysRevenue,
            successfulPayments: demoPaymentSummary.successfulPayments,
            pendingPayments: demoPaymentSummary.pendingPayments,
            failedPayments: demoPaymentSummary.failedPayments,
            totalRefunded: demoPaymentSummary.totalRefunded,
            outstandingAmount: demoPaymentSummary.outstandingAmount,
          } satisfies DashboardSummary,
          transactions: [] as Payment[],
        })
      );

      if (cancelled) return;

      if (summaryResult.usedDemo) {
        setUsedDemo(true);
        setDemoSummary(summaryResult.data.summary);
        setDemoTxns(demoTransactions);
      } else {
        setUsedDemo(false);
        setDemoSummary(null);
        setDemoTxns([]);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showDemo = usedDemo || (!dashboardLoading && !dashboardSummary && transactions.length === 0);
  const summary = showDemo ? demoSummary ?? {
    todaysRevenue: demoPaymentSummary.todaysRevenue,
    successfulPayments: demoPaymentSummary.successfulPayments,
    pendingPayments: demoPaymentSummary.pendingPayments,
    failedPayments: demoPaymentSummary.failedPayments,
    totalRefunded: demoPaymentSummary.totalRefunded,
    outstandingAmount: demoPaymentSummary.outstandingAmount,
  } : dashboardSummary;

  if (loading || dashboardLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Financial" title="Payments" description="Staff payment overview and recent transactions." />
        <LoadingState label="Loading payment dashboard…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financial"
        title="Payments"
        description="Monitor collections, outstanding balances, and recent payment activity."
        actions={
          <Button variant="secondary" onClick={() => { window.location.href = "/billing"; }}>
            Open billing
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      {showDemo && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <Badge variant="warning">Demo data — Payment API unavailable</Badge>
          <span>Showing prototype invoices and KPIs. Live Razorpay flows remain on the Billing page when the API is reachable.</span>
        </div>
      )}

      {summary ? <PaymentDashboardKpis summary={summary} /> : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Today's revenue" value={formatINR(demoPaymentSummary.todaysRevenue)} icon={<IndianRupee className="h-5 w-5" />} />
          <MetricCard label="Successful" value={demoPaymentSummary.successfulPayments} />
          <MetricCard label="Pending" value={demoPaymentSummary.pendingPayments} />
          <MetricCard label="Outstanding" value={formatINR(demoPaymentSummary.outstandingAmount)} />
        </section>
      )}

      <Section
        title="Invoices"
        description={showDemo ? "Prototype invoice list" : "Linked billing invoices"}
        action={<Link to="/billing" className="text-sm font-semibold text-cyan-700 hover:underline">Go to billing</Link>}
      >
        {showDemo ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {demoInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">{inv.invoiceNumber}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{inv.patientName}</td>
                    <td className="px-3 py-3 font-semibold">{formatINR(inv.amount)}</td>
                    <td className="px-3 py-3 text-slate-500">{formatDate(inv.billingDate)}</td>
                    <td className="px-3 py-3">
                      <Badge variant={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "critical" : "warning"}>
                        {inv.status.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Use Billing for live invoices" description="Staff invoice management is available on the Billing page." action={<Button onClick={() => { window.location.href = "/billing"; }}>Open billing</Button>} />
        )}
      </Section>

      <Section title="Recent transactions" description="Payment attempts and confirmations">
        {showDemo ? (
          <div className="space-y-2">
            {demoTxns.map((txn) => (
              <Card key={txn.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {txn.invoiceNumber} · {txn.patientName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(txn.createdAt)} · {txn.method}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={txn.status === "SUCCESS" ? "success" : "warning"}>{txn.status}</Badge>
                  <p className="text-sm font-semibold">{formatINR(txn.amount)}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState title="No transactions yet" description="Patient payments will appear here as they are confirmed." />
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 12).map((payment) => (
              <Card key={payment.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {payment.paymentOrder?.invoice?.invoiceNumber ?? payment.id}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(payment.createdAt)} · {payment.method}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={payment.status === "SUCCESS" ? "success" : payment.status === "FAILED" ? "danger" : "warning"}>
                    {payment.status}
                  </Badge>
                  <p className="text-sm font-semibold">{formatINR(payment.amount)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
