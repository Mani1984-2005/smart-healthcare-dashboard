import EmptyState from "../components/common/EmptyState.jsx";

export default function Laboratory() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Laboratory Orders</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Track test requests, specimen collections, and result workflows from one place.</p>
      </section>

      <EmptyState title="Laboratory operations" description="Lab results and orders will appear after the laboratory service is enabled." />
    </div>
  );
}
