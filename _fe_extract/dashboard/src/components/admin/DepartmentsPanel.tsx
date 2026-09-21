import { FormEvent, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Input from "../common/Input.jsx";
import { Button, Section } from "../ui";
import { DepartmentRecord, useAdminStore } from "../../stores/adminStore.ts";

export default function DepartmentsPanel() {
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useAdminStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", headDoctor: "", description: "" });

  const resetForm = () => {
    setForm({ name: "", headDoctor: "", description: "" });
    setEditingId(null);
  };

  const handleEdit = (department: DepartmentRecord) => {
    setEditingId(department.id);
    setForm({ name: department.name, headDoctor: department.headDoctor, description: department.description });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.name.trim().length < 2) return;
    if (editingId) {
      updateDepartment(editingId, form);
    } else {
      addDepartment(form);
    }
    resetForm();
  };

  return (
    <Section title="Departments" description="Departments referenced across Doctors, Appointments, and Reports.">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <Input label="Name" id="dept-name" value={form.name} onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))} />
        <Input label="Head doctor" id="dept-head" value={form.headDoctor} onChange={(event) => setForm((f) => ({ ...f, headDoctor: event.target.value }))} />
        <Input label="Description" id="dept-description" value={form.description} onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))} />
        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Update" : "Add"}</Button>
          {editingId && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {departments.map((department) => (
          <div key={department.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">{department.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{department.headDoctor} · {department.description}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" aria-label={`Edit ${department.name}`} onClick={() => handleEdit(department)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" aria-label={`Delete ${department.name}`} onClick={() => deleteDepartment(department.id)}><Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-300" /></Button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
