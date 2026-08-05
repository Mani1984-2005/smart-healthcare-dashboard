export default function Modal({ title, children, open, onClose, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded-full px-3 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Close modal">✕</button>
        </div>
        <div className="p-6 text-slate-700 dark:text-slate-200">{children}</div>
        {footer && <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}
