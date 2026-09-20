import { FormEvent, useState } from "react";
import { Info, Pencil, Trash2 } from "lucide-react";
import Input from "../common/Input.jsx";
import Select from "../common/Select.jsx";
import { Badge, Button, Section } from "../ui";
import { ROLES } from "../../app/roles.js";
import { StaffRecord, StaffStatus, useAdminStore } from "../../stores/adminStore.ts";

const roleOptions = Object.values(ROLES);
const statusOptions: StaffStatus[] = ["Active", "Inactive"];

export default function StaffRolesPanel() {
  const { staff, addStaff, updateStaff, deleteStaff } = useAdminStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", role: roleOptions[0], department: "", email: "", status: "Active" as StaffStatus });

  const resetForm = () => {
    setForm({ name: "", role: roleOptions[0], department: "", email: "", status: "Active" });
    setEditingId(null);
  };

  const handleEdit = (member: StaffRecord) => {
    setEditingId(member.id);
    setForm({ name: member.name, role: member.role, department: member.department, email: member.email, status: member.status });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.name.trim().length < 2) return;
    if (editingId) {
      updateStaff(editingId, form);
    } else {
      addStaff(form);
    }
    resetForm();
  };

  return (
    <Section title="Staff &amp; roles" description="Role assignments referenced by route-level access control across the app.">
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        The app already restricts navigation by role client-side (each page checks the signed-in user's role). This directory is for reference and future backend sync — it doesn't yet change what a signed-in account can access, since there's no backend user table to connect it to.
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-5 sm:items-end">
        <Input label="Name" id="staff-name" value={form.name} onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))} />
        <Select label="Role" id="staff-role" value={form.role} onChange={(event) => setForm((f) => ({ ...f, role: event.target.value }))}>
          {roleOptions.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </Select>
        <Input label="Department" id="staff-department" value={form.department} onChange={(event) => setForm((f) => ({ ...f, department: event.target.value }))} />
        <Input label="Email" id="staff-email" type="email" value={form.email} onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))} />
        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Update" : "Add"}</Button>
          {editingId && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
        </div>
      </form>

      <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Role</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Department</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {staff.map((member) => (
              <tr key={member.id}>
                <td className="px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100">{member.name}<p className="text-xs font-normal text-slate-500 dark:text-slate-400">{member.email}</p></td>
                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{member.role}</td>
                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{member.department}</td>
                <td className="px-3 py-2">
                  <select
                    aria-label={`Status for ${member.name}`}
                    value={member.status}
                    onChange={(event) => updateStaff(member.id, { status: event.target.value as StaffStatus })}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" aria-label={`Edit ${member.name}`} onClick={() => handleEdit(member)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" aria-label={`Delete ${member.name}`} onClick={() => deleteStaff(member.id)}><Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-300" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {roleOptions.map((role) => (
          <Badge key={role} variant="neutral">{role}: {staff.filter((s) => s.role === role).length}</Badge>
        ))}
      </div>
    </Section>
  );
}
