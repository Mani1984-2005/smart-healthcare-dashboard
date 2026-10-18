export default function AlertBanner({ type, message, onDismiss }) {
  const styles = {
    warning: "border-l-amber-500 bg-amber-50 text-amber-800",
    error:   "border-l-red-500 bg-red-50 text-red-800",
    info:    "border-l-teal-500 bg-teal-50 text-teal-800",
    success: "border-l-emerald-500 bg-emerald-50 text-emerald-800",
  };

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border-l-4 ${styles[type] || styles.info}`}>
      <p className="text-sm font-medium">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-current opacity-50 hover:opacity-100 text-lg leading-none ml-4">×</button>
      )}
    </div>
  );
}
