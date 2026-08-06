import { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: ButtonVariant; loading?: boolean };

const variants: Record<ButtonVariant, string> = {
  primary: "bg-cyan-700 text-white hover:bg-cyan-800 focus-visible:ring-cyan-600",
  secondary: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  danger: "bg-rose-700 text-white hover:bg-rose-800 focus-visible:ring-rose-600",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:ring-cyan-600 dark:text-slate-200 dark:hover:bg-slate-800",
};

export default function Button({ children, className = "", disabled, loading = false, type = "button", variant = "primary", ...props }: ButtonProps) {
  return <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-950 ${variants[variant]} ${className}`} {...props}>{loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}{children}</button>;
}
