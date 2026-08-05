const styles = {
  info: "bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-200",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function Badge({ children, variant = "info", className = "" }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase ${styles[variant] || styles.info} ${className}`}>
      {children}
    </span>
  );
}
