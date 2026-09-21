import { FormEvent, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Input from "../common/Input.jsx";
import { Button, Section } from "../ui";
import { ServiceCharge, useAdminStore } from "../../stores/adminStore.ts";

export default function ServiceChargesPanel() {
  const { serviceCharges, addServiceCharge, updateServiceCharge, deleteServiceCharge } = useAdminStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "", description: "", defaultRate: 0 });

  const resetForm = () => {
    setForm({ category: "", description: "", defaultRate: 0 });
    setEditingId(null);
  };

  const handleEdit = (charge: ServiceCharge) => {
    setEditingId(charge.id);
    setForm({ category: charge.category, description: charge.description, defaultRate: charge.defaultRate });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.category.trim().length < 2) return;
    if (editingId) {
      updateServiceCharge(editingId, form);
    } else {
      addServiceCharge(form);
    }
    resetForm();
  };

  return (
    <Section title="Service &amp; charge defaults" description="Reference rates for Billing's line-item categories. Editing an invoice always allows overriding these.">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_1fr_auto] sm:items-end">
        <Input label="Category" id="charge-category" value={form.category} onChange={(event) => setForm((f) => ({ ...f, category: event.target.value }))} />
        <Input label="Description" id="charge-description" value={form.description} onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))} />
        <Input label="Default rate (₹)" id="charge-rate" type="number" min={0} value={form.defaultRate} onChange={(event) => setForm((f) => ({ ...f, defaultRate: Number(event.target.value) }))} />
        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Update" : "Add"}</Button>
          {editingId && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
        </div>
      </form>

      <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Category</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Description</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Default rate</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {serviceCharges.map((charge) => (
              <tr key={charge.id}>
                <td className="px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100">{charge.category}</td>
                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{charge.description}</td>
                <td className="px-3 py-2 text-right text-sm text-slate-700 dark:text-slate-200">₹{charge.defaultRate.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" aria-label={`Edit ${charge.category}`} onClick={() => handleEdit(charge)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" aria-label={`Delete ${charge.category}`} onClick={() => deleteServiceCharge(charge.id)}><Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-300" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
