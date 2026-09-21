import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { focusRing } from "./styles";

export type VoiceButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type VoiceButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: VoiceButtonVariant;
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
};

const variants: Record<VoiceButtonVariant, string> = {
  primary: "bg-cyan-700 text-white hover:bg-cyan-800 disabled:hover:bg-cyan-700",
  secondary:
    "border-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  danger: "bg-rose-700 text-white hover:bg-rose-800",
  ghost: "text-cyan-800 hover:bg-cyan-50 dark:text-cyan-200 dark:hover:bg-slate-800",
};

/** Touch-friendly button: at least 48px tall, icon plus text, visible focus ring. */
export default function VoiceButton({
  variant = "secondary",
  icon,
  loading = false,
  className = "",
  type = "button",
  disabled,
  children,
  ...props
}: VoiceButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <LoaderCircle className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
