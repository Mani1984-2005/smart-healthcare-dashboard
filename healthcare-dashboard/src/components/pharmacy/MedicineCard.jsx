// src/components/pharmacy/MedicineCard.jsx
// MediCare Pro — Medicine Card Component

import React from "react";

const FORM_ICONS = {
  tablet:    "💊",
  capsule:   "💊",
  syrup:     "🧴",
  injection: "💉",
  cream:     "🧴",
  drops:     "💧",
  inhaler:   "🌬️",
  patch:     "🩹",
};

const STOCK_STATUS = (qty, reorder) => {
  if (qty === 0) return { label: "Out of Stock", color: "text-red-500 bg-red-50", dot: "bg-red-500" };
  if (qty <= reorder) return { label: "Low Stock", color: "text-amber-600 bg-amber-50", dot: "bg-amber-500" };
  return { label: "In Stock", color: "text-emerald-600 bg-emerald-50", dot: "bg-emerald-500" };
};

export default function MedicineCard({ medicine, darkMode, onSelect, onEdit, onDelete, compact = false }) {
  const stock = STOCK_STATUS(medicine.stock_qty, medicine.reorder_level);
  const icon = FORM_ICONS[medicine.form?.toLowerCase()] || "💊";

  const card = darkMode
    ? "bg-slate-800 border-slate-700 text-white"
    : "bg-white border-slate-200 text-slate-900";

  const sub = darkMode ? "text-slate-400" : "text-slate-500";

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b cursor-pointer hover:bg-opacity-80 transition-colors ${card}`}
        onClick={() => onSelect?.(medicine)}
      >
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{medicine.name}</p>
          <p className={`text-xs truncate ${sub}`}>{medicine.generic_name || medicine.brand || "—"}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold">₹{parseFloat(medicine.unit_price || 0).toFixed(2)}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stock.color}`}>{stock.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow ${card}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{medicine.name}</h3>
            {medicine.generic_name && (
              <p className={`text-xs ${sub}`}>{medicine.generic_name}</p>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${stock.color}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${stock.dot}`} />
          {stock.label}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {medicine.brand && (
          <>
            <span className={sub}>Brand</span>
            <span className="font-medium">{medicine.brand}</span>
          </>
        )}
        {medicine.category && (
          <>
            <span className={sub}>Category</span>
            <span className="font-medium capitalize">{medicine.category}</span>
          </>
        )}
        {medicine.form && (
          <>
            <span className={sub}>Form</span>
            <span className="font-medium capitalize">{medicine.form}</span>
          </>
        )}
        {medicine.strength && (
          <>
            <span className={sub}>Strength</span>
            <span className="font-medium">{medicine.strength}</span>
          </>
        )}
        <span className={sub}>Stock</span>
        <span className="font-medium">{medicine.stock_qty} units</span>
        <span className={sub}>Price</span>
        <span className="font-medium">₹{parseFloat(medicine.unit_price || 0).toFixed(2)}</span>
      </div>

      {/* Rx badge */}
      {medicine.requires_rx && (
        <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full w-fit">
          Rx Required
        </span>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
        {onSelect && (
          <button
            onClick={() => onSelect(medicine)}
            className="flex-1 text-xs bg-cyan-500 hover:bg-cyan-600 text-white py-1.5 rounded-lg font-medium transition-colors"
          >
            Add to Rx
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(medicine)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium border transition-colors ${
              darkMode ? "border-slate-600 hover:bg-slate-700" : "border-slate-300 hover:bg-slate-50"
            }`}
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(medicine.id)}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
