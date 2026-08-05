// src/components/Toast.jsx
export default function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border p-4 shadow-xl transition-all ${
            toast.type === "success"
              ? "bg-emerald-950 text-emerald-200 border-emerald-700"
              : toast.type === "error"
              ? "bg-red-950 text-red-200 border-red-700"
              : "bg-slate-900 text-slate-200 border-slate-700"
          }`}
        >
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-bold text-sm">{toast.title}</p>
              {toast.message && <p className="text-xs mt-1 opacity-80">{toast.message}</p>}
            </div>
            <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
          </div>
        </div>
      ))}
    </div>
  );
}