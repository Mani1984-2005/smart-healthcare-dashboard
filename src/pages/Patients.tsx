import EmptyState from "../components/common/EmptyState.jsx";

export default function Patients() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Patient Registry</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Search and manage patient records across your care network.</p>
      </section>

      <EmptyState title="Patients coming soon" description="This module will show clinical patient profiles and recent visit history." />
    </div>
  );
}
