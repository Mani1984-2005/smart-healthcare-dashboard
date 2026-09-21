type PatientCardProps = {
  label: string;
  value: string | number;
  description: string;
  delta?: string;
};

export default function PatientCard({ label, value, description, delta }: PatientCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {delta && <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-300">{delta}</p>}
    </div>
  );
}
