export default function Widget({ title, icon, children, actions, className = "", fullHeight = false }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm ${fullHeight ? "" : ""} ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            {icon && <span className="text-base">{icon}</span>}
            {title}
          </h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={title ? "px-5 pb-5" : "p-5"}>{children}</div>
    </div>
  );
}
