import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { fetchPatients, createPatient, updatePatient } from "../api/patients";
import { StatusBadge, SearchInput, DataTable, Button } from "../components/ui";

const EMPTY_FORM = {
  id: "",
  name: "",
  dob: "",
  gender: "unspecified",
  phone: "",
  email: "",
  address: "",
  bloodGroup: "",
  allergies: "",
  disease: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  primaryPhysician: "",
  isActive: true,
};

export default function PatientsPage({ darkMode }) {
  const { colorMode } = useTheme();
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadPatients = async (targetPage = pagination.page) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchPatients({
        page: targetPage,
        limit: 20,
        search: search.trim() || undefined,
        isActive: activeFilter === "all" ? undefined : activeFilter === "active",
      });
      const rows = Array.isArray(response) ? response : response?.data || [];
      setPatients(rows);
      setPagination(response?.pagination || { page: targetPage, limit: 20, total: rows.length, totalPages: 1 });
    } catch (err) {
      setPatients([]);
      setError(err.message || "Could not load patient records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients(1);
  }, [search, activeFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) =>
      patient.fullName?.toLowerCase().includes(term) ||
      patient.mrn?.toLowerCase().includes(term) ||
      patient.phone?.includes(term)
    );
  }, [patients, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (patient) => {
    setForm({
      id: patient.id,
      name: patient.fullName || "",
      dob: patient.dateOfBirth ? String(patient.dateOfBirth).slice(0, 10) : "",
      gender: patient.gender || "unspecified",
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      bloodGroup: patient.bloodType || "",
      allergies: (patient.knownAllergies || []).join(", "),
      disease: (patient.chronicConditions || []).join(", "),
      emergencyContactName: patient.emergencyContactName || "",
      emergencyContactPhone: patient.emergencyContactPhone || "",
      primaryPhysician: patient.primaryPhysician || "",
      isActive: patient.isActive !== false,
    });
    setFormOpen(true);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Patient name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        dob: form.dob || undefined,
        gender: form.gender,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        bloodGroup: form.bloodGroup || undefined,
        allergies: form.allergies,
        disease: form.disease,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        primaryPhysician: form.primaryPhysician || undefined,
        isActive: form.isActive,
      };
      if (form.id) await updatePatient(form.id, payload);
      else await createPatient(payload);
      setFormOpen(false);
      await loadPatients(pagination.page);
    } catch (err) {
      setError(err.message || "Patient save failed.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "mrn", label: "MRN", className: "font-semibold" },
    { key: "fullName", label: "Patient" },
    { key: "gender", label: "Gender" },
    { key: "phone", label: "Phone" },
    {
      key: "isActive",
      label: "Status",
      render: (patient) => (
        <StatusBadge status={patient.isActive ? "Active" : "Inactive"} size="sm" />
      ),
    },
  ];

  return (
    <main className={`min-h-screen ${colorMode === "dark" ? "bg-dark-background text-dark-text" : "bg-background text-text"} transition-colors duration-500`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Patient Management</h1>
            <p className="text-sm text-slate-500">Backend-backed patient registry</p>
          </div>
          <Button primary onClick={openCreate}>Add Patient</Button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, MRN or phone..." />
            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading patient records...</div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={filtered}
              emptyMessage="No patients found."
              onSelect={(patient) => openEdit(patient)}
            >
              {filtered.map((patient) => (
                <tr key={patient.id} className="cursor-pointer">
                  <td className="px-4 py-3 font-medium">{patient.mrn}</td>
                  <td className="px-4 py-3">{patient.fullName}</td>
                  <td className="px-4 py-3">{patient.gender}</td>
                  <td className="px-4 py-3">{patient.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={patient.isActive ? "Active" : "Inactive"} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(patient)} className="text-primary-600 text-sm font-medium">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </span>
          <div className="flex gap-2">
            <Button disabled={pagination.page <= 1} onClick={() => loadPatients(pagination.page - 1)}>Previous</Button>
            <Button disabled={pagination.page >= pagination.totalPages} onClick={() => loadPatients(pagination.page + 1)}>Next</Button>
          </div>
        </div>

        {formOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true">
            <form onSubmit={submit} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{form.id ? "Edit patient" : "Add patient"}</h2>
                <button type="button" onClick={() => setFormOpen(false)} aria-label="Close patient form">Close</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm">Full name *
                  <input required value={form.name} onChange={(event) => updateField("name", event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm">Date of birth
                  <input type="date" value={form.dob} onChange={(event) => updateField("dob", event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm">Gender
                  <select value={form.gender} onChange={(event) => updateField("gender", event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="unspecified">Unspecified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="text-sm">Blood type
                  <input value={form.bloodGroup} onChange={(event) => updateField("bloodGroup", event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm">Phone
                  <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm">Email
                  <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm sm:col-span-2">Address
                  <input value={form.address} onChange={(event) => updateField("address", event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm">Known allergies
                  <input value={form.allergies} onChange={(event) => updateField("allergies", event.target.value)} placeholder="Comma separated" className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm">Chronic conditions
                  <input value={form.disease} onChange={(event) => updateField("disease", event.target.value)} placeholder="Comma separated" className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="submit" primary disabled={saving}>{saving ? "Saving..." : "Save patient"}</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
