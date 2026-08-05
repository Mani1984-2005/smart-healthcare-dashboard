import EmptyState from "../components/common/EmptyState.jsx";

export default function Billing() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Billing and Invoicing</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Review invoices, claims, and payment workflows with audit-ready controls.</p>
      </section>

      <EmptyState title="Billing workflows" description="Billing dashboards and invoice generation are coming soon." />
    </div>
  );
}
