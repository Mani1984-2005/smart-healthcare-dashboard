import { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
  trend?: ReactNode;
  icon?: ReactNode;
};

export default function MetricCard({ description, icon, label, trend, value }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
        {icon && <div className="text-cyan-700 dark:text-cyan-300">{icon}</div>}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      {(description || trend) && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {description && <span>{description}</span>}
          {trend && <span className="font-semibold text-emerald-700 dark:text-emerald-300">{trend}</span>}
        </div>
      )}
    </div>
  );
}
