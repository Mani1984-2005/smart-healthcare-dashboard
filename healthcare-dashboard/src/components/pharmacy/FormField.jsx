export default function FormField({ label, name, value, onChange, type, placeholder, disabled, min, max, step, required, as, children }) {
  const base = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition disabled:bg-slate-100 disabled:cursor-not-allowed";

  if (as === "select") {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
        <select name={name} value={value} onChange={onChange} disabled={disabled} className={base}>
          <option value="">Select {label}</option>
          {children}
        </select>
      </div>
    );
  }

  if (as === "textarea") {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className={`${base} resize-none`} rows={3} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type || "text"} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} min={min} max={max} step={step} required={required} className={base} />
    </div>
  );
}
