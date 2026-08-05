import FormField from "./FormField";
import SectionTitle from "./SectionTitle";
import { CATEGORIES, DOSAGE_FORMS, emptyForm } from "./pharmacyUtils";

export default function FormModal({ form, editingId, onChange, onSubmit, onClose }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange({ target: { name, value: type === "checkbox" ? checked : value } });
  };

  const handleNumber = (name) => (e) => {
    onChange({ target: { name, value: e.target.value } });
  };

  const isProfitVisible = form.sellingPrice && form.purchasePrice;
  const profit = isProfitVisible ? Number(form.sellingPrice) - Number(form.purchasePrice) : 0;
  const profitMargin = isProfitVisible && Number(form.purchasePrice) > 0 ? ((profit / Number(form.purchasePrice)) * 100).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-bold text-white">{editingId ? "Edit Medicine" : "Add New Medicine"}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-6">
          <SectionTitle title="Basic Information" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Medicine ID" name="medicineId" value={form.medicineId} onChange={handleChange} required />
            <FormField label="Medicine Name" name="name" value={form.name} onChange={handleChange} required />
            <FormField label="Generic Name" name="genericName" value={form.genericName} onChange={handleChange} />
            <FormField label="Brand" name="brand" value={form.brand} onChange={handleChange} />
            <FormField label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} />
            <FormField label="Category" name="category" value={form.category} onChange={handleChange} as="select" required>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </FormField>
          </div>

          <SectionTitle title="Classification" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Dosage Form" name="dosageForm" value={form.dosageForm} onChange={handleChange} as="select">
              {DOSAGE_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
            </FormField>
            <FormField label="Strength" name="strength" value={form.strength} onChange={handleChange} placeholder="e.g. 500mg" />
            <FormField label="Pack Size" name="packSize" value={form.packSize} onChange={handleChange} placeholder="e.g. 10x10" />
            <FormField label="Batch Number" name="batchNumber" value={form.batchNumber} onChange={handleChange} />
            <FormField label="Status" name="status" value={form.status} onChange={handleChange} as="select">
              <option value="Available">Available</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Discontinued">Discontinued</option>
            </FormField>
          </div>

          <SectionTitle title="Dates" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Manufacturing Date" name="manufacturingDate" type="date" value={form.manufacturingDate} onChange={handleChange} />
            <FormField label="Expiry Date" name="expiryDate" type="date" value={form.expiryDate} onChange={handleChange} required />
          </div>

          <SectionTitle title="Pricing & Tax" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Purchase Price (₹)" name="purchasePrice" type="number" value={form.purchasePrice} onChange={handleNumber("purchasePrice")} step="0.01" min="0" />
            <FormField label="Selling Price (₹)" name="sellingPrice" type="number" value={form.sellingPrice} onChange={handleNumber("sellingPrice")} step="0.01" min="0" />
            <FormField label="MRP (₹)" name="mrp" type="number" value={form.mrp} onChange={handleNumber("mrp")} step="0.01" min="0" />
            <FormField label="GST (%)" name="gst" type="number" value={form.gst} onChange={handleNumber("gst")} step="0.1" min="0" max="100" />
            <FormField label="Supplier" name="supplier" value={form.supplier} onChange={handleChange} />
          </div>
          {isProfitVisible && (
            <div className={`px-4 py-3 rounded-lg text-sm font-medium ${profit >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
              Profit: ₹{profit.toFixed(2)} ({profitMargin}% margin)
            </div>
          )}

          <SectionTitle title="Inventory" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Stock Quantity" name="stockQuantity" type="number" value={form.stockQuantity} onChange={handleNumber("stockQuantity")} min="0" required />
            <FormField label="Minimum Stock Level" name="minimumStock" type="number" value={form.minimumStock} onChange={handleNumber("minimumStock")} min="0" />
          </div>

          <SectionTitle title="Additional Details" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Storage Instructions" name="storageInstructions" value={form.storageInstructions} onChange={handleChange} as="textarea" />
            <FormField label="Notes" name="notes" value={form.notes} onChange={handleChange} as="textarea" />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button onClick={onSubmit} className={`px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition ${editingId ? "bg-blue-600 hover:bg-blue-700" : "bg-teal-600 hover:bg-teal-700"}`}>
              {editingId ? "Update Medicine" : "Add Medicine"}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
