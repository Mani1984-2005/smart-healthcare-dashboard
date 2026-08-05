import EmptyState from "../components/common/EmptyState.jsx";

export default function Reports() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Operational Reports</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Monitor clinical, financial, and operational performance across the hospital network.</p>
      </section>

      <EmptyState title="Reporting insights" description="Analytics will be available after backend metrics are integrated." />
    </div>
  );
}
