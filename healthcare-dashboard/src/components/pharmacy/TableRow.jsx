import StatusBadge from "./StatusBadge";
import { getQty, getPrice, getStockStatus, formatCurrency, formatDate, daysUntilExpiry } from "./pharmacyUtils";

export default function TableRow({ medicine, onEdit, onDelete, onView, onPDF }) {
  const status = getStockStatus(medicine);
  const qty = getQty(medicine);
  const days = daysUntilExpiry(medicine.expiryDate);
  const rowBg = status === "Expired" ? "bg-red-50/50" :
    status === "Low Stock" || status === "Out of Stock" ? "bg-amber-50/30" : "";

  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${rowBg}`}>
      <td className="px-4 py-3 text-xs font-mono text-slate-400">{medicine.medicineId?.substring(0, 10) || "—"}</td>
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800">{medicine.name || "—"}</p>
        <p className="text-xs text-slate-400">{medicine.genericName || ""}</p>
      </td>
      <td className="px-4 py-3">
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">{medicine.category || "—"}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm ${qty <= 0 ? "text-red-600" : qty <= 10 ? "text-amber-600" : "text-slate-800"}`}>{qty}</span>
          {qty <= 0 && <span className="text-xs text-red-500 font-medium">Out</span>}
          {qty > 0 && qty <= 10 && <span className="text-xs text-amber-500 font-medium">Low</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-slate-700">{formatCurrency(getPrice(medicine))}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{medicine.supplier || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">{formatDate(medicine.expiryDate)}</span>
          {days !== null && days >= 0 && days <= 30 && <span className="text-xs text-orange-500 font-medium">({days}d)</span>}
          {days !== null && days < 0 && <span className="text-xs text-red-500">{Math.abs(days)}d ago</span>}
        </div>
      </td>
      <td className="px-4 py-3"><StatusBadge status={status} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => onView(medicine)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-teal-700 border border-teal-200 hover:bg-teal-50 transition">View</button>
          <button onClick={() => onPDF(medicine)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-700 border border-indigo-200 hover:bg-indigo-50 transition">PDF</button>
          <button onClick={() => onEdit(medicine)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 transition">Edit</button>
          <button onClick={() => onDelete(medicine.medicineId)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition">Delete</button>
        </div>
      </td>
    </tr>
  );
}
