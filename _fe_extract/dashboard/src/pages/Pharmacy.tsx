import { useEffect, useMemo, useState } from "react";
import { PageHeader, Button } from "../components/ui";
import Input from "../components/common/Input.jsx";
import Select from "../components/common/Select.jsx";
import Toast from "../components/common/Toast.jsx";
import TabList from "../components/common/TabList.tsx";
import Dialog from "../components/ui/Dialog.tsx";
import { usePharmacyStore, generatePharmacyInsights, MedicineRecord, PrescriptionRecord } from "../stores/pharmacyStore.ts";
import { usePatientStore } from "../stores/patientStore.ts";
import { useDoctorsStore } from "../stores/doctorsStore.ts";
import PharmacyInsights from "../components/pharmacy/PharmacyInsights.tsx";
import MedicineTable from "../components/pharmacy/MedicineTable.tsx";
import MedicineForm, { MedicineFormData } from "../components/pharmacy/MedicineForm.tsx";
import PrescriptionTable from "../components/pharmacy/PrescriptionTable.tsx";
import PrescriptionForm, { PrescriptionFormData } from "../components/pharmacy/PrescriptionForm.tsx";

type Tab = "inventory" | "prescriptions";

export default function Pharmacy() {
  const {
    medicines, prescriptions, searchTerm, filters, loading, error,
    loadMedicines, loadPrescriptions,
    addMedicine, updateMedicine, deleteMedicine,
    addPrescription, updatePrescription, deletePrescription,
    search, filter,
  } = usePharmacyStore();
  const { patients, loadPatients } = usePatientStore();
  const { doctors } = useDoctorsStore();

  const [tab, setTab] = useState<Tab>("inventory");
  const [medicineModalOpen, setMedicineModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineRecord | null>(null);
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [editingRx, setEditingRx] = useState<PrescriptionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "medicine" | "prescription"; id: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "danger" | "info" } | null>(null);

  useEffect(() => {
    loadPatients();
    loadMedicines();
    loadPrescriptions();
  }, [loadPatients, loadMedicines, loadPrescriptions]);

  const categoryOptions = useMemo(() => ["All", ...Array.from(new Set(medicines.map((m) => m.category)))], [medicines]);

  const filteredMedicines = useMemo(() => {
    let list = medicines;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(term) || m.category.toLowerCase().includes(term));
    }
    if (filters.category !== "All") list = list.filter((m) => m.category === filters.category);
    if (filters.stockLevel === "Low") list = list.filter((m) => m.stockQuantity <= m.reorderLevel);
    return list;
  }, [medicines, searchTerm, filters]);

  const insights = useMemo(() => generatePharmacyInsights(medicines), [medicines]);

  const handleSaveMedicine = (data: MedicineFormData) => {
    if (editingMedicine) {
      updateMedicine(editingMedicine.id, data);
      setToast({ message: "Medicine updated.", variant: "success" });
    } else {
      addMedicine(data);
      setToast({ message: "Medicine added to inventory.", variant: "success" });
    }
    setMedicineModalOpen(false);
    setEditingMedicine(null);
  };

  const handleSaveRx = (data: PrescriptionFormData) => {
    if (editingRx) {
      updatePrescription(editingRx.id, data);
      setToast({ message: "Prescription updated.", variant: "success" });
    } else {
      addPrescription(data);
      setToast({ message: "Prescription created.", variant: "success" });
    }
    setRxModalOpen(false);
    setEditingRx(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "medicine") deleteMedicine(deleteTarget.id);
    else deletePrescription(deleteTarget.id);
    setToast({ message: "Record removed.", variant: "success" });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pharmacy"
        title="Inventory & prescriptions"
        description="Track medicine stock levels and patient prescriptions in one place."
        actions={
          tab === "inventory"
            ? <Button onClick={() => { setEditingMedicine(null); setMedicineModalOpen(true); }} disabled={loading}>Add medicine</Button>
            : <Button onClick={() => { setEditingRx(null); setRxModalOpen(true); }} disabled={patients.length === 0 || loading}>New prescription</Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950 dark:text-rose-100">
          <p className="font-semibold">Sync issue</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <PharmacyInsights insights={insights} />

      <TabList
        label="Pharmacy sections"
        options={[{ id: "inventory", label: "Inventory" }, { id: "prescriptions", label: "Prescriptions" }]}
        activeId={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === "inventory" ? (
        <div role="tabpanel" id="tabpanel-inventory" aria-labelledby="tab-inventory" className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Search" id="medicine-search" placeholder="Medicine or category" value={searchTerm} onChange={(event) => search(event.target.value)} />
              <Select label="Category" id="medicine-category-filter" value={filters.category} onChange={(event) => filter({ category: event.target.value })}>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
              <Select label="Stock level" id="medicine-stock-filter" value={filters.stockLevel} onChange={(event) => filter({ stockLevel: event.target.value })}>
                <option value="All">All</option>
                <option value="Low">Low stock only</option>
              </Select>
            </div>
          </section>
          <MedicineTable
            medicines={filteredMedicines}
            onEdit={(id) => { setEditingMedicine(medicines.find((m) => m.id === id) || null); setMedicineModalOpen(true); }}
            onDelete={(id) => setDeleteTarget({ type: "medicine", id })}
          />
        </div>
      ) : (
        <div role="tabpanel" id="tabpanel-prescriptions" aria-labelledby="tab-prescriptions">
          <PrescriptionTable
            prescriptions={prescriptions}
            onEdit={(id) => { setEditingRx(prescriptions.find((p) => p.id === id) || null); setRxModalOpen(true); }}
            onDelete={(id) => setDeleteTarget({ type: "prescription", id })}
          />
        </div>
      )}

      <Dialog open={medicineModalOpen} onClose={() => { setMedicineModalOpen(false); setEditingMedicine(null); }} title={editingMedicine ? "Edit medicine" : "Add medicine"}>
        <MedicineForm
          initialValues={editingMedicine ? { ...editingMedicine } : undefined}
          onCancel={() => { setMedicineModalOpen(false); setEditingMedicine(null); }}
          onSubmit={handleSaveMedicine}
          submitLabel={editingMedicine ? "Update medicine" : "Add medicine"}
        />
      </Dialog>

      <Dialog open={rxModalOpen} onClose={() => { setRxModalOpen(false); setEditingRx(null); }} title={editingRx ? "Edit prescription" : "New prescription"}>
        <PrescriptionForm
          patients={patients}
          doctors={doctors}
          medicines={medicines}
          initialValues={editingRx ? { ...editingRx } : undefined}
          onCancel={() => { setRxModalOpen(false); setEditingRx(null); }}
          onSubmit={handleSaveRx}
          submitLabel={editingRx ? "Update prescription" : "Create prescription"}
        />
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Confirm deletion">
        <div className="space-y-6">
          <p>Are you sure you want to permanently delete this record?</p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Dialog>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}
