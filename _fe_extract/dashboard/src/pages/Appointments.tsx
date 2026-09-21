import { useEffect, useMemo, useState } from "react";
import { PageHeader, Button } from "../components/ui";
import Select from "../components/common/Select.jsx";
import Toast from "../components/common/Toast.jsx";
import Dialog from "../components/ui/Dialog.tsx";
import { useAppointmentsStore, AppointmentRecord } from "../stores/appointmentsStore.ts";
import { usePatientStore } from "../stores/patientStore.ts";
import { useDoctorsStore } from "../stores/doctorsStore.ts";
import AppointmentTable from "../components/appointments/AppointmentTable.tsx";
import AppointmentForm, { AppointmentFormData } from "../components/appointments/AppointmentForm.tsx";

const statusOptions = ["All", "Scheduled", "Checked In", "Completed", "Cancelled", "No-show"];
const dateOptions = ["All", "Today", "Upcoming", "Past"];

export default function Appointments() {
  const { appointments, filters, loading, error, loadAppointments, addAppointment, updateAppointment, cancelAppointment, deleteAppointment, filter } = useAppointmentsStore();
  const { patients, loadPatients } = usePatientStore();
  const { doctors } = useDoctorsStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "danger" | "info" } | null>(null);

  useEffect(() => {
    loadPatients();
    loadAppointments();
  }, [loadPatients, loadAppointments]);

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredAppointments = useMemo(() => {
    let list = appointments;
    if (filters.status !== "All") list = list.filter((a) => a.status === filters.status);
    if (filters.date === "Today") list = list.filter((a) => a.date === todayStr);
    if (filters.date === "Upcoming") list = list.filter((a) => a.date > todayStr);
    if (filters.date === "Past") list = list.filter((a) => a.date < todayStr);
    return [...list].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [appointments, filters, todayStr]);

  const handleAdd = () => {
    setEditingAppointment(null);
    setModalOpen(true);
  };

  const handleEdit = (id: string) => {
    const appointment = appointments.find((a) => a.id === id);
    if (!appointment) return;
    setEditingAppointment(appointment);
    setModalOpen(true);
  };

  const handleSave = (data: AppointmentFormData) => {
    if (editingAppointment) {
      updateAppointment(editingAppointment.id, data);
      setToast({ message: "Appointment updated.", variant: "success" });
    } else {
      addAppointment(data);
      setToast({ message: "Appointment booked.", variant: "success" });
    }
    setModalOpen(false);
    setEditingAppointment(null);
  };

  const handleCancel = (id: string) => {
    cancelAppointment(id);
    setToast({ message: "Appointment cancelled.", variant: "info" });
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deleteAppointment(deleteTargetId);
    setToast({ message: "Appointment removed.", variant: "success" });
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Scheduling"
        title="Appointments"
        description="Book, review, and manage appointments across every department."
        actions={<Button onClick={handleAdd} disabled={patients.length === 0 || doctors.length === 0 || loading}>Book appointment</Button>}
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950 dark:text-rose-100">
          <p className="font-semibold">Sync issue</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {patients.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          No patients on file yet — add a patient before booking appointments.
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Status" id="appointment-status-filter" value={filters.status} onChange={(event) => filter({ status: event.target.value })}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
          <Select label="When" id="appointment-date-filter" value={filters.date} onChange={(event) => filter({ date: event.target.value })}>
            {dateOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
        </div>
      </section>

      <AppointmentTable appointments={filteredAppointments} onEdit={handleEdit} onCancel={handleCancel} onDelete={(id) => setDeleteTargetId(id)} />

      <Dialog open={modalOpen} onClose={() => { setModalOpen(false); setEditingAppointment(null); }} title={editingAppointment ? "Edit appointment" : "Book appointment"}>
        <AppointmentForm
          patients={patients}
          doctors={doctors}
          initialValues={editingAppointment ? { ...editingAppointment } : undefined}
          onCancel={() => { setModalOpen(false); setEditingAppointment(null); }}
          onSubmit={handleSave}
          submitLabel={editingAppointment ? "Update appointment" : "Book appointment"}
        />
      </Dialog>

      <Dialog open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)} title="Confirm deletion">
        <div className="space-y-6">
          <p>Are you sure you want to permanently delete this appointment record?</p>
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
