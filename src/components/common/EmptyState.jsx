export default function EmptyState({ title = "No data available", description = "No records found.", className = "" }) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 ${className}`}>
      <p className="text-4xl">📭</p>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}
