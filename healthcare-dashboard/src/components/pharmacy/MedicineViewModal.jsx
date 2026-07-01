import StatusBadge from "./StatusBadge";
import { getQty, getPrice, getStockStatus, formatCurrency, formatDate, downloadMedicinePDF } from "./pharmacyUtils";

export default function MedicineViewModal({ medicine, onClose, onEdit }) {
  if (!medicine) return null;
  const status = getStockStatus(medicine);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">{medicine.name || "Medicine Details"}</h2>
            <p className="text-teal-200 text-sm">{medicine.genericName || ""} {medicine.brand ? `· ${medicine.brand}` : ""}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <DetailBlock title="Identity">
              <DetailRow label="Medicine ID" value={medicine.medicineId} />
              <DetailRow label="Manufacturer" value={medicine.manufacturer} />
              <DetailRow label="Category" value={medicine.category} />
              <DetailRow label="Dosage Form" value={medicine.dosageForm} />
              <DetailRow label="Strength" value={medicine.strength} />
              <DetailRow label="Pack Size" value={medicine.packSize} />
            </DetailBlock>
            <DetailBlock title="Pricing">
              <DetailRow label="Purchase Price" value={formatCurrency(medicine.purchasePrice)} />
              <DetailRow label="Selling Price" value={formatCurrency(getPrice(medicine))} />
              <DetailRow label="MRP" value={formatCurrency(medicine.mrp)} />
              <DetailRow label="GST" value={medicine.gst ? `${medicine.gst}%` : "—"} />
              <DetailRow label="Supplier" value={medicine.supplier} />
            </DetailBlock>
            <DetailBlock title="Stock & Expiry">
              <DetailRow label="Stock Quantity" value={String(getQty(medicine))} />
              <DetailRow label="Minimum Stock" value={medicine.minimumStock || "—"} />
              <DetailRow label="Expiry Date" value={formatDate(medicine.expiryDate)} />
              <DetailRow label="Manufacturing Date" value={formatDate(medicine.manufacturingDate)} />
              <DetailRow label="Batch Number" value={medicine.batchNumber} />
              <DetailRow label="Status" value={<StatusBadge status={status} />} />
            </DetailBlock>
            <DetailBlock title="Other">
              <DetailRow label="Storage" value={medicine.storageInstructions || "—"} />
              <DetailRow label="Barcode" value={medicine.barcode || "—"} />
              <DetailRow label="QR Code" value={medicine.qrCode || "—"} />
              <DetailRow label="Notes" value={medicine.notes || "—"} />
            </DetailBlock>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button onClick={() => { downloadMedicinePDF(medicine); }} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition">Export PDF</button>
            <button onClick={() => { onEdit(medicine); onClose(); }} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition">Edit</button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition ml-auto">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ title, children }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right">{value || "—"}</span>
    </div>
  );
}
