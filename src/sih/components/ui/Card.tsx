import { HTMLAttributes, ReactNode } from "react";

type CardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & { children: ReactNode; title?: ReactNode; subtitle?: ReactNode; interactive?: boolean };

export default function Card({ children, className = "", interactive = false, subtitle, title, ...props }: CardProps) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950 ${interactive ? "transition hover:border-slate-300 hover:shadow-raised dark:hover:border-slate-700" : ""} ${className}`} {...props}>{(title || subtitle) && <div className="mb-4"><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}</div>}{children}</section>;
}
