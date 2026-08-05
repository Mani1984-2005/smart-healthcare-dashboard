import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePatientStore, PatientRecord } from "../stores/patientStore.ts";
import Input from "../components/common/Input.jsx";
import Select from "../components/common/Select.jsx";
import Button from "../components/common/Button.jsx";
import Toast from "../components/common/Toast.jsx";
import PatientTable from "../components/patients/PatientTable.tsx";
import PatientModal from "../components/patients/PatientModal.tsx";
import PatientForm, { PatientFormData } from "../components/patients/PatientForm.tsx";
import PatientCard from "../components/patients/PatientCard.tsx";
import Pagination from "../components/common/Pagination.jsx";

const statusOptions = ["All", "Active", "Under Observation", "Discharged", "Critical", "Inactive"];
const genderOptions = ["All", "Female", "Male", "Other"];

export default function Patients() {
  const navigate = useNavigate();
  const {
    patients,
    loading,
    error,
    searchTerm,
    filters,
    page,
    pageSize,
    loadPatients,
    addPatient,
    updatePatient,
    deletePatient,
    searchPatients,
    filterPatients,
    setPage,
    clearError,
  } = usePatientStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "danger" | "info" } | null>(null);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = useMemo(() => {
    let list = patients;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (patient) =>
          patient.fullName.toLowerCase().includes(term) ||
          patient.phone.includes(term) ||
          patient.email.toLowerCase().includes(term) ||
          patient.id.toLowerCase().includes(term)
      );
    }
    if (filters.status !== "All") {
      list = list.filter((patient) => patient.status === filters.status);
    }
    if (filters.gender !== "All") {
      list = list.filter((patient) => patient.gender === filters.gender);
    }
    return list;
  }, [patients, searchTerm, filters]);

  const totalPages = Math.max(Math.ceil(filteredPatients.length / pageSize), 1);
  const pagePatients = filteredPatients.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  const handleAddPatient = () => {
    setEditingPatient(null);
    setModalOpen(true);
  };

  const handleEditPatient = (id: string) => {
    const patient = patients.find((item) => item.id === id);
    if (!patient) return;
    setEditingPatient(patient);
    setModalOpen(true);
  };

  const handleSavePatient = async (form: PatientFormData) => {
    if (editingPatient) {
      await updatePatient(editingPatient.id, {
        fullName: form.fullName,
        age: Number(form.age),
        gender: form.gender,
        phone: form.phone,
        email: form.email,
        bloodGroup: form.bloodGroup,
        address: form.address,
        medicalHistory: form.medicalHistory.split(",").map((entry) => entry.trim()).filter(Boolean),
        status: form.status,
      });
      setToast({ message: "Patient record updated successfully.", variant: "success" });
    } else {
      await addPatient({
        fullName: form.fullName,
        age: Number(form.age),
        gender: form.gender,
        phone: form.phone,
        email: form.email,
        bloodGroup: form.bloodGroup,
        address: form.address,
        medicalHistory: form.medicalHistory.split(",").map((entry) => entry.trim()).filter(Boolean),
        status: form.status,
      });
      setToast({ message: "Patient added successfully.", variant: "success" });
    }
    setModalOpen(false);
    setEditingPatient(null);
  };

  const handleDeletePatient = async () => {
    if (!deleteTargetId) return;
    await deletePatient(deleteTargetId);
    setToast({ message: "Patient removed successfully.", variant: "success" });
    setDeleteTargetId(null);
  };

  const patientCount = patients.length;
  const activeCount = patients.filter((patient) => patient.status === "Active").length;
  const criticalCount = patients.filter((patient) => patient.status === "Critical").length;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Patient registry</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Manage patients and clinical records</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Search, filter, add, edit, and review patient records with audit-ready workflows.
            </p>
          </div>
          <Button onClick={handleAddPatient}>Add patient</Button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <PatientCard label="Total patients" value={patientCount} description="Active and archived patient records." />
        <PatientCard label="Active care" value={activeCount} description="Patients currently under active management." />
        <PatientCard label="Critical cases" value={criticalCount} description="Patients needing urgent attention." delta={`${criticalCount} cases`} />
      </div>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 xl:grid-cols-[minmax(180px,320px)_1fr] xl:items-center">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Input
              label="Search patients"
              id="patient-search"
              value={searchTerm}
              onChange={(event) => searchPatients(event.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Status" id="patient-status-filter" value={filters.status} onChange={(event) => filterPatients({ status: event.target.value })}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
              <Select label="Gender" id="patient-gender-filter" value={filters.gender} onChange={(event) => filterPatients({ gender: event.target.value })}>
                {genderOptions.map((gender) => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => { searchPatients(""); filterPatients({ status: "All", gender: "All" }); setPage(1); }}>
              Reset filters
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-card dark:border-rose-900/40 dark:bg-rose-950 dark:text-rose-100">
          <p className="font-semibold">Unable to load patient data</p>
          <p className="mt-1">{error}</p>
          <Button variant="secondary" onClick={() => { clearError(); loadPatients(); }}>
            Retry
          </Button>
        </div>
      )}

      <PatientTable
        patients={pagePatients}
        loading={loading}
        onView={(id) => navigate(`/patients/${id}`)}
        onEdit={handleEditPatient}
        onDelete={(id) => setDeleteTargetId(id)}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Showing {pagePatients.length} of {filteredPatients.length} patients</p>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <PatientModal
        open={modalOpen}
        title={editingPatient ? "Edit patient" : "New patient"}
        onClose={() => { setModalOpen(false); setEditingPatient(null); }}
      >
        <PatientForm
          initialValues={editingPatient ? {
            fullName: editingPatient.fullName,
            age: String(editingPatient.age),
            gender: editingPatient.gender,
            phone: editingPatient.phone,
            email: editingPatient.email,
            bloodGroup: editingPatient.bloodGroup,
            address: editingPatient.address,
            medicalHistory: editingPatient.medicalHistory.join(", "),
            status: editingPatient.status,
          } : undefined}
          onCancel={() => { setModalOpen(false); setEditingPatient(null); }}
          onSubmit={handleSavePatient}
          submitLabel={editingPatient ? "Update patient" : "Create patient"}
          loading={loading}
        />
      </PatientModal>

      <PatientModal
        open={Boolean(deleteTargetId)}
        title="Confirm deletion"
        onClose={() => setDeleteTargetId(null)}
        confirmLabel="Delete"
        onConfirm={handleDeletePatient}
        loading={loading}
      >
        <p>Are you sure you want to permanently delete this patient record? This action cannot be undone.</p>
      </PatientModal>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}
