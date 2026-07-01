import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { getQty, getStockStatus, formatCurrency, formatDate, daysUntilExpiry } from "./pharmacyUtils";

export default function AlertSection({ title, color, icon, medicines, onEdit, onDelete, onView, badge, description }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon || "📋"}</span>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800">{title}</h3>
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {badge && <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${color === "red" ? "bg-red-100 text-red-700" : color === "orange" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>{badge}</span>}
          <span className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="pb-2 pr-4">ID</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Stock</th>
                <th className="pb-2 pr-4">Price</th>
                <th className="pb-2 pr-4">Expiry</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((m) => {
                const status = getStockStatus(m);
                const days = daysUntilExpiry(m.expiryDate);
                return (
                  <tr key={m.medicineId} className="border-t border-slate-100">
                    <td className="py-2.5 pr-4 text-xs font-mono text-slate-400">{m.medicineId?.substring(0, 8)}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-700">{m.name}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{m.category}</td>
                    <td className="py-2.5 pr-4"><span className={`font-semibold ${getQty(m) <= 0 ? "text-red-600" : "text-amber-600"}`}>{getQty(m)}</span></td>
                    <td className="py-2.5 pr-4 text-slate-600">{formatCurrency(m.sellingPrice ?? m.price)}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600">{formatDate(m.expiryDate)}</span>
                        {days !== null && days < 0 && <span className="text-xs text-red-500">{Math.abs(days)}d ago</span>}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4"><StatusBadge status={status} /></td>
                    <td className="py-2.5 flex gap-1">
                      <button onClick={() => onView(m)} className="px-2 py-1 rounded text-xs font-medium text-teal-700 hover:bg-teal-50 border border-teal-200">View</button>
                      <button onClick={() => onEdit(m)} className="px-2 py-1 rounded text-xs font-medium text-blue-700 hover:bg-blue-50 border border-blue-200">Edit</button>
                      <button onClick={() => onDelete(m.medicineId)} className="px-2 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
