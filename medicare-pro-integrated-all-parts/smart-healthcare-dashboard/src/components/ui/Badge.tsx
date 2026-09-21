import { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "info" | "success" | "warning" | "danger" | "critical" | "neutral";
type BadgeProps = HTMLAttributes<HTMLSpanElement> & { children: ReactNode; variant?: BadgeVariant };
const variants: Record<BadgeVariant, string> = { info: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200", success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200", warning: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200", danger: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200", critical: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200", neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" };
export default function Badge({ children, className = "", variant = "info", ...props }: BadgeProps) { return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${variants[variant]} ${className}`} {...props}>{children}</span>; }
