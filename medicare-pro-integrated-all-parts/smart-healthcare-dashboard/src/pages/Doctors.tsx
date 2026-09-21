import EmptyState from "../components/common/EmptyState.jsx";

export default function Doctors() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Provider Directory</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Review clinical providers, specialties, and on-duty schedules.</p>
      </section>

      <EmptyState title="Provider insights pending" description="Doctor and staff management will appear here once connected to the backend." />
    </div>
  );
}
