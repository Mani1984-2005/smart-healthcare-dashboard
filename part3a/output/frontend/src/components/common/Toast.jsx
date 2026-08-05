import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const VARIANT_STYLES = {
  success: {
    icon: CheckCircle2,
    classes: 'bg-clinical-50 border-clinical-200 text-clinical-800 dark:bg-clinical-900/40 dark:border-clinical-700 dark:text-clinical-100',
  },
  error: {
    icon: XCircle,
    classes: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-100',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100',
  },
  info: {
    icon: Info,
    classes: 'bg-trust-50 border-trust-200 text-trust-800 dark:bg-trust-900/40 dark:border-trust-700 dark:text-trust-100',
  },
};

export function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant] || VARIANT_STYLES.info;
          const Icon = style.icon;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 shadow-cardHover font-sans text-sm ${style.classes}`}
              role="status"
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 leading-snug">{toast.message}</p>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
