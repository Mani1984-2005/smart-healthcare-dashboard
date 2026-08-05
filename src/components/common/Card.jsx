export default function Card({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-950 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4 flex flex-col gap-1">
          {title && <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>}
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
