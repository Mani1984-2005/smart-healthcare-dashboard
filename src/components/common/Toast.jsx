import { useEffect } from "react";

export default function Toast({ message, variant = "info", onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const tone = {
    info: "bg-sky-50 text-sky-700 dark:bg-sky-900/90 dark:text-sky-100",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/90 dark:text-emerald-100",
    warning: "bg-amber-50 text-amber-800 dark:bg-amber-900/90 dark:text-amber-100",
    danger: "bg-rose-50 text-rose-700 dark:bg-rose-900/90 dark:text-rose-100",
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-3xl border p-4 shadow-2xl backdrop-blur-xl ${tone[variant]}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="mt-1 text-xl">⚕️</span>
        <div>
          <p className="text-sm font-semibold">{variant === "success" ? "Success" : variant === "danger" ? "Error" : "Info"}</p>
          <p className="mt-1 text-sm leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}
