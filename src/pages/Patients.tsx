import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePatientStore, PatientRecord } from "../stores/patientStore.ts";
import { Button, PageHeader } from "../components/ui";
import Toast from "../components/common/Toast.jsx";
import Pagination from "../components/common/Pagination.jsx";
import PatientDataGrid from "../components/patients/PatientDataGrid.tsx";
import PatientFilterBar from "../components/patients/PatientFilterBar.tsx";
import PatientForm, { PatientFormData } from "../components/patients/PatientForm.tsx";
import PatientKpiGrid from "../components/patients/PatientKpiGrid.tsx";
import PatientModal from "../components/patients/PatientModal.tsx";
import { getPatientPresentation } from "../components/patients/patientPresentation.ts";

export default function Patients() {
  const navigate = useNavigate();
  const { patients, loading, error, searchTerm, filters, page, pageSize, loadPatients, addPatient, updatePatient, deletePatient, searchPatients, filterPatients, setPage, clearError } = usePatientStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "danger" | "info" } | null>(null);
  useEffect(() => { loadPatients(); }, [loadPatients]);
  const filteredPatients = useMemo(() => patients.filter((patient) => { const presentation = getPatientPresentation(patient); const searchable = [patient.fullName, patient.id, patient.phone, patient.email, patient.bloodGroup, patient.status, patient.medicalHistory.join(" "), presentation.doctor, presentation.department].join(" ").toLowerCase(); return (!searchTerm.trim() || searchable.includes(searchTerm.toLowerCase())) && (filters.status === "All" || patient.status === filters.status) && (filters.gender === "All" || patient.gender === filters.gender) && (!startDate || patient.registrationDate >= startDate) && (!endDate || patient.registrationDate <= endDate); }), [endDate, filters, patients, searchTerm, startDate]);
  const totalPages = Math.max(Math.ceil(filteredPatients.length / pageSize), 1);
  const pagePatients = filteredPatients.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, setPage, totalPages]);
  const openAdd = () => { setEditingPatient(null); setModalOpen(true); };
  const openEdit = (id: string) => { const patient = patients.find((item) => item.id === id); if (patient) { setEditingPatient(patient); setModalOpen(true); } };
  const savePatient = async (form: PatientFormData) => { const payload = { fullName: form.fullName, age: Number(form.age), gender: form.gender, phone: form.phone, email: form.email, bloodGroup: form.bloodGroup, address: form.address, medicalHistory: form.medicalHistory.split(",").map((entry) => entry.trim()).filter(Boolean), status: form.status }; if (editingPatient) { await updatePatient(editingPatient.id, payload); setToast({ message: "Patient record updated successfully.", variant: "success" }); } else { await addPatient(payload); setToast({ message: "Patient added successfully.", variant: "success" }); } setModalOpen(false); setEditingPatient(null); };
  const deletePatientRecord = async () => { if (!deleteTargetId) return; await deletePatient(deleteTargetId); setToast({ message: "Patient removed successfully.", variant: "success" }); setDeleteTargetId(null); };
  const resetFilters = () => { searchPatients(""); filterPatients({ status: "All", gender: "All" }); setStartDate(""); setEndDate(""); setPage(1); };
  return <div className="space-y-6"><PageHeader eyebrow="Patient operations center" title="Manage patients and clinical records" description="Search, triage, register, and review patient records through a unified clinical workspace." actions={<Button onClick={openAdd}><Plus className="h-4 w-4" />Register patient</Button>} /><PatientKpiGrid patients={patients} loading={loading} /><PatientFilterBar query={searchTerm} status={filters.status} gender={filters.gender} startDate={startDate} endDate={endDate} onQueryChange={searchPatients} onStatusChange={(status) => filterPatients({ status })} onGenderChange={(gender) => filterPatients({ gender })} onStartDateChange={setStartDate} onEndDateChange={setEndDate} onReset={resetFilters} />{error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100"><p className="font-semibold">Unable to load patient data</p><p className="mt-1">{error}</p><Button variant="secondary" className="mt-3" onClick={() => { clearError(); loadPatients(); }}>Retry</Button></div>}<PatientDataGrid patients={pagePatients} loading={loading} onView={(id) => navigate(`/patients/${id}`)} onEdit={openEdit} onDelete={setDeleteTargetId} onBulkAction={(count) => setToast({ message: `Bulk workflow prepared for ${count} patients.`, variant: "info" })} /><div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-slate-500 dark:text-slate-400">Showing {pagePatients.length} of {filteredPatients.length} patients</p><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div><PatientModal open={modalOpen} title={editingPatient ? "Edit patient" : "Register patient"} onClose={() => { setModalOpen(false); setEditingPatient(null); }}><PatientForm initialValues={editingPatient ? { fullName: editingPatient.fullName, age: String(editingPatient.age), gender: editingPatient.gender, phone: editingPatient.phone, email: editingPatient.email, bloodGroup: editingPatient.bloodGroup, address: editingPatient.address, medicalHistory: editingPatient.medicalHistory.join(", "), status: editingPatient.status } : undefined} onCancel={() => { setModalOpen(false); setEditingPatient(null); }} onSubmit={savePatient} submitLabel={editingPatient ? "Update patient" : "Register patient"} loading={loading} /></PatientModal><PatientModal open={Boolean(deleteTargetId)} title="Confirm deletion" onClose={() => setDeleteTargetId(null)} confirmLabel="Delete" onConfirm={deletePatientRecord} loading={loading}><p>Are you sure you want to permanently delete this patient record? This action cannot be undone.</p></PatientModal>{toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}</div>;
}
