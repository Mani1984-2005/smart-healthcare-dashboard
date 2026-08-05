export default function Input({ label, id, className = "", ...props }) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <input
        id={id}
        className={`mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-500/20 ${className}`}
        {...props}
      />
    </label>
  );
}
