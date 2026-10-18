export default function ActionButton({ icon: Icon, label, onClick, primary, variant = "default", size = "md", disabled = false }) {
  const base = "inline-flex items-center gap-2 font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

  const sizeMap = { sm: "px-3 py-1.5 text-xs rounded-lg", md: "px-4 py-2.5 text-sm rounded-xl", lg: "px-6 py-3 text-base rounded-xl" };

  const variantMap = {
    default: "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:shadow-md shadow-sm",
    primary: "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white hover:from-indigo-500 hover:to-indigo-600 shadow-md hover:shadow-lg",
    danger: "bg-gradient-to-br from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 shadow-md hover:shadow-lg",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    success: "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white hover:from-emerald-500 hover:to-emerald-600 shadow-md hover:shadow-lg",
  };

  const renderIcon = () => {
    if (!Icon) return null;
    if (typeof Icon === "function") {
      try {
        const rendered = Icon({ className: "w-4 h-4" });
        return typeof rendered === "string" ? <span className="text-base">{rendered}</span> : rendered;
      } catch {
        return null;
      }
    }
    if (typeof Icon === "string") {
      return <span className="text-base">{Icon}</span>;
    }
    return Icon;
  };

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${sizeMap[size]} ${variantMap[primary ? "primary" : variant]}`}>
      {renderIcon()}
      {label}
    </button>
  );
}
