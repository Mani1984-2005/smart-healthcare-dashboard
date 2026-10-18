// src/components/billing/SignalToast.jsx
// MediCare Pro — Billing Module — SignalToast
// Modern notification system: success / warning / error / loading
// Usage:
//   import { ToastProvider, useToast } from "./SignalToast";
//   wrap app in <ToastProvider>, then const { toast } = useToast();
//   toast.success("Invoice paid"); toast.error("..."); toast.warning("...");
//   const id = toast.loading("Saving…"); toast.update(id, { type: "success", message: "Saved" });

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

const ICONS = {
  success: "✓",
  error:   "✕",
  warning: "⚠",
  loading: "◐",
};

const STYLES = {
  success: {
    border: "border-emerald-300",
    bg:     "bg-emerald-50 dark:bg-emerald-950/40",
    text:   "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-500 text-white",
  },
  error: {
    border: "border-red-300",
    bg:     "bg-red-50 dark:bg-red-950/40",
    text:   "text-red-700 dark:text-red-300",
    iconBg: "bg-red-500 text-white",
  },
  warning: {
    border: "border-amber-300",
    bg:     "bg-amber-50 dark:bg-amber-950/40",
    text:   "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-500 text-white",
  },
  loading: {
    border: "border-cyan-300",
    bg:     "bg-cyan-50 dark:bg-cyan-950/40",
    text:   "text-cyan-700 dark:text-cyan-300",
    iconBg: "bg-cyan-500 text-white",
  },
};

let idCounter = 0;

export function ToastProvider({ children, position = "top-right" }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((type, message, opts = {}) => {
    const id = ++idCounter;
    const duration = opts.duration ?? (type === "loading" ? 0 : 4000);
    setToasts((prev) => [...prev, { id, type, message, title: opts.title }]);
    if (duration > 0) {
      timers.current[id] = setTimeout(() => remove(id), duration);
    }
    return id;
  }, [remove]);

  const update = useCallback((id, { type, message, title, duration }) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, type: type ?? t.type, message: message ?? t.message, title: title ?? t.title } : t)));
    if (timers.current[id]) clearTimeout(timers.current[id]);
    const d = duration ?? (type === "loading" ? 0 : 4000);
    if (d > 0) timers.current[id] = setTimeout(() => remove(id), d);
  }, [remove]);

  const toast = {
    success: (message, opts) => push("success", message, opts),
    error:   (message, opts) => push("error", message, opts),
    warning: (message, opts) => push("warning", message, opts),
    loading: (message, opts) => push("loading", message, { ...opts, duration: 0 }),
    update,
    dismiss: remove,
  };

  const posClass = {
    "top-right":    "top-4 right-4 items-end",
    "top-left":     "top-4 left-4 items-start",
    "bottom-right": "bottom-4 right-4 items-end",
    "bottom-left":  "bottom-4 left-4 items-start",
    "top-center":   "top-4 left-1/2 -translate-x-1/2 items-center",
  }[position] || "top-4 right-4 items-end";

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={`fixed z-[100] flex flex-col gap-2 pointer-events-none ${posClass}`}>
        {toasts.map((t) => {
          const style = STYLES[t.type] || STYLES.success;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto w-80 max-w-[90vw] rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3 backdrop-blur-sm animate-[toast-in_0.2s_ease-out] ${style.border} ${style.bg}`}
            >
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${style.iconBg} ${t.type === "loading" ? "animate-spin" : ""}`}>
                {ICONS[t.type]}
              </span>
              <div className={`flex-1 min-w-0 text-sm ${style.text}`}>
                {t.title && <p className="font-semibold">{t.title}</p>}
                <p className="leading-snug">{t.message}</p>
              </div>
              {t.type !== "loading" && (
                <button
                  onClick={() => remove(t.id)}
                  className={`shrink-0 text-xs opacity-50 hover:opacity-100 transition-opacity ${style.text}`}
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export default ToastProvider;