import { useEffect } from "react";

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: "bg-emerald-600", error: "bg-red-600",
    warning: "bg-amber-500", info: "bg-teal-600",
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[60] px-5 py-3 rounded-xl text-white text-sm font-medium shadow-2xl flex items-center gap-3 ${styles[type] || "bg-slate-700"}`}>
      <span>{message}</span>
      <button onClick={onClose} className="text-white/80 hover:text-white font-bold text-lg leading-none">×</button>
    </div>
  );
}
