import { useEffect, useMemo, useState } from "react";
import { PageHeader, Button } from "../components/ui";
import Select from "../components/common/Select.jsx";
import Input from "../components/common/Input.jsx";
import Toast from "../components/common/Toast.jsx";
import Dialog from "../components/ui/Dialog.tsx";
import { useLabStore, LabTestRecord } from "../stores/labStore.ts";
import { usePatientStore } from "../stores/patientStore.ts";
import { useDoctorsStore } from "../stores/doctorsStore.ts";
import LabTestTable from "../components/laboratory/LabTestTable.tsx";
import LabTestForm, { LabTestFormData } from "../components/laboratory/LabTestForm.tsx";

const statusOptions = ["All", "Ordered", "Sample Collected", "In Progress", "Completed", "Cancelled"];

export default function Laboratory() {
  const { tests, searchTerm, filters, loading, error, loadTests, addTest, updateTest, deleteTest, search, filter } = useLabStore();
  const { patients, loadPatients } = usePatientStore();
  const { doctors } = useDoctorsStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTestRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "danger" | "info" } | null>(null);

  useEffect(() => {
    loadPatients();
    loadTests();
  }, [loadPatients, loadTests]);

  const categoryOptions = useMemo(() => ["All", ...Array.from(new Set(tests.map((t) => t.category)))], [tests]);

  const filteredTests = useMemo(() => {
    let list = tests;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((t) => t.testName.toLowerCase().includes(term) || t.patientName.toLowerCase().includes(term) || t.doctorName.toLowerCase().includes(term));
    }
    if (filters.status !== "All") list = list.filter((t) => t.status === filters.status);
    if (filters.category !== "All") list = list.filter((t) => t.category === filters.category);
    return list;
  }, [tests, searchTerm, filters]);

  const pendingCount = tests.filter((t) => t.status === "Ordered" || t.status === "Sample Collected" || t.status === "In Progress").length;

  const handleAdd = () => {
    setEditingTest(null);
    setModalOpen(true);
  };

  const handleEdit = (id: string) => {
    const test = tests.find((t) => t.id === id);
    if (!test) return;
    setEditingTest(test);
    setModalOpen(true);
  };

  const handleSave = (data: LabTestFormData) => {
    if (editingTest) {
      updateTest(editingTest.id, data);
      setToast({ message: "Lab test updated.", variant: "success" });
    } else {
      addTest(data);
      setToast({ message: "Lab test ordered.", variant: "success" });
    }
    setModalOpen(false);
    setEditingTest(null);
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deleteTest(deleteTargetId);
    setToast({ message: "Lab test removed.", variant: "success" });
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Diagnostics"
        title="Laboratory"
        description={`Track test orders end to end. ${pendingCount} test${pendingCount === 1 ? "" : "s"} currently pending.`}
        actions={<Button onClick={handleAdd} disabled={patients.length === 0 || loading}>Order test</Button>}
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950 dark:text-rose-100">
          <p className="font-semibold">Sync issue</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Search" id="lab-search" placeholder="Test, patient, or doctor" value={searchTerm} onChange={(event) => search(event.target.value)} />
          <Select label="Status" id="lab-status-filter" value={filters.status} onChange={(event) => filter({ status: event.target.value })}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
          <Select label="Category" id="lab-category-filter" value={filters.category} onChange={(event) => filter({ category: event.target.value })}>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
        </div>
      </section>

      <LabTestTable tests={filteredTests} onEdit={handleEdit} onDelete={(id) => setDeleteTargetId(id)} />

      <Dialog open={modalOpen} onClose={() => { setModalOpen(false); setEditingTest(null); }} title={editingTest ? "Edit lab test" : "Order lab test"}>
        <LabTestForm
          patients={patients}
          doctors={doctors}
          initialValues={editingTest ? { ...editingTest } : undefined}
          onCancel={() => { setModalOpen(false); setEditingTest(null); }}
          onSubmit={handleSave}
          submitLabel={editingTest ? "Update test" : "Order test"}
        />
      </Dialog>

      <Dialog open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)} title="Confirm deletion">
        <div className="space-y-6">
          <p>Are you sure you want to permanently delete this lab test record?</p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Dialog>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}
