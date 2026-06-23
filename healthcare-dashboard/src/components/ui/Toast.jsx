// FILE PATH: src/components/ui/Toast.jsx
// REPLACE your existing Toast component with this file (or CREATE if none exists yet in ui/).
//
// This restyles the toast notification visual only. Every page that
// currently does `const [toast, setToast] = useState(null)` and renders
// `{toast && <Toast message={...} type={...} onClose={...} />}` keeps
// working exactly the same — only the markup/classes changed, and the
// `type` prop values ("success" | "error" | "warning") are unchanged.
//
// USAGE (identical to before):
//   const [toast, setToast] = useState(null);
//   showToast = (message, type = "success") => setToast({ message, type });
//   {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const TYPE_CONFIG = {
  success: {
    bg: "bg-white",
    border: "border-success-500",
    iconBg: "bg-success-50",
    iconColor: "text-success-500",
    icon: CheckCircle2,
  },
  error: {
    bg: "bg-white",
    border: "border-error-500",
    iconBg: "bg-error-50",
    iconColor: "text-error-500",
    icon: XCircle,
  },
  warning: {
    bg: "bg-white",
    border: "border-warning-500",
    iconBg: "bg-warning-50",
    iconColor: "text-warning-500",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-white",
    border: "border-info-500",
    iconBg: "bg-info-50",
    iconColor: "text-info-500",
    icon: Info,
  },
};

export default function Toast({ message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.success;
  const Icon = config.icon;

  return (
    <div
      className={`
        fixed top-5 right-5 z-50
        flex items-start gap-3
        ${config.bg} border-l-4 ${config.border}
        rounded-md shadow-lift
        px-4 py-3.5 pr-3
        max-w-sm w-full
        animate-slide-up
      `}
      role="alert"
    >
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${config.iconBg} ${config.iconColor}`}>
        <Icon size={16} />
      </div>

      <p className="text-small text-neutral-700 flex-1 pt-1">{message}</p>

      <button
        onClick={onClose}
        className="shrink-0 w-6 h-6 inline-flex items-center justify-center rounded-full text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * ToastStack — optional helper if you want to support multiple
 * simultaneous toasts instead of just one. Not required to adopt —
 * existing single-toast pages work fine without this.
 *
 * USAGE:
 *   const [toasts, setToasts] = useState([]);
 *   const pushToast = (message, type) =>
 *     setToasts((prev) => [...prev, { id: Date.now(), message, type }]);
 *   const dismissToast = (id) =>
 *     setToasts((prev) => prev.filter((t) => t.id !== id));
 *   <ToastStack toasts={toasts} onDismiss={dismissToast} />
 */
export function ToastStack({ toasts = [], onDismiss }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => onDismiss(t.id)}
        />
      ))}
    </div>
  );
}