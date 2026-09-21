import { MedicineRecord } from "../../stores/pharmacyStore.ts";
import { Badge, Button } from "../ui";

type MedicineTableProps = {
  medicines: MedicineRecord[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function MedicineTable({ medicines, onEdit, onDelete }: MedicineTableProps) {
  if (medicines.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-card dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No medicines found.</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the filters or add a new medicine.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-card dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Medicine</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Category</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Stock</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Price</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Expiry</th>
            <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-950 dark:divide-slate-800">
          {medicines.map((medicine) => {
            const lowStock = medicine.stockQuantity <= medicine.reorderLevel;
            return (
              <tr key={medicine.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900">
                <td className="px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{medicine.name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{medicine.strength} · {medicine.form} · {medicine.manufacturer}</p>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{medicine.category}</td>
                <td className="px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{medicine.stockQuantity} units</p>
                  {lowStock && <Badge variant="danger">Reorder</Badge>}
                </td>
                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">₹{medicine.unitPrice.toLocaleString("en-IN")}</td>
                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{medicine.expiryDate}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" onClick={() => onEdit(medicine.id)}>Edit</Button>
                    <Button variant="danger" onClick={() => onDelete(medicine.id)}>Delete</Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
