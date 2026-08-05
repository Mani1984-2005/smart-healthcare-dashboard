export default function Loader({ label = "Loading..." }) {
  return (
    <div className="grid min-h-[200px] place-items-center rounded-3xl border border-slate-200 bg-white p-8 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}
