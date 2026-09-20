import { FormEvent, useState } from "react";
import Input from "../common/Input.jsx";
import Select from "../common/Select.jsx";
import Button from "../common/Button.jsx";
import { AppointmentRecord, AppointmentStatus, AppointmentType } from "../../stores/appointmentsStore.ts";
import { PatientRecord } from "../../stores/patientStore.ts";
import { DoctorRecord } from "../../stores/doctorsStore.ts";

export type AppointmentFormData = Omit<AppointmentRecord, "id">;

type AppointmentFormProps = {
  patients: PatientRecord[];
  doctors: DoctorRecord[];
  initialValues?: AppointmentFormData;
  onCancel: () => void;
  onSubmit: (data: AppointmentFormData) => void;
  submitLabel: string;
};

const types: AppointmentType[] = ["Consultation", "Follow-up", "Lab review", "Procedure", "Emergency"];
const statuses: AppointmentStatus[] = ["Scheduled", "Checked In", "Completed", "Cancelled", "No-show"];

export default function AppointmentForm({ patients, doctors, initialValues, onCancel, onSubmit, submitLabel }: AppointmentFormProps) {
  const defaultValues: AppointmentFormData = {
    patientId: patients[0]?.id || "",
    patientName: patients[0]?.fullName || "",
    doctorId: doctors[0]?.id || "",
    doctorName: doctors[0]?.name || "",
    department: doctors[0]?.department || "",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    type: "Consultation",
    status: "Scheduled",
    notes: "",
  };

  const [form, setForm] = useState<AppointmentFormData>(initialValues || defaultValues);
  const [error, setError] = useState("");

  const handleChange = <K extends keyof AppointmentFormData>(key: K, value: AppointmentFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handlePatientChange = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    setForm((current) => ({ ...current, patientId, patientName: patient?.fullName || "" }));
  };

  const handleDoctorChange = (doctorId: string) => {
    const doctor = doctors.find((d) => d.id === doctorId);
    setForm((current) => ({ ...current, doctorId, doctorName: doctor?.name || "", department: doctor?.department || current.department }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.patientId || !form.doctorId || !form.date || !form.time) {
      setError("Select a patient, doctor, date, and time.");
      return;
    }
    setError("");
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Patient" id="appointment-patient" value={form.patientId} onChange={(event) => handlePatientChange(event.target.value)}>
          {patients.length === 0 && <option value="">No patients on file</option>}
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>{patient.fullName} ({patient.id})</option>
          ))}
        </Select>
        <Select label="Doctor" id="appointment-doctor" value={form.doctorId} onChange={(event) => handleDoctorChange(event.target.value)}>
          {doctors.length === 0 && <option value="">No doctors on file</option>}
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>{doctor.name} — {doctor.department}</option>
          ))}
        </Select>
        <Input label="Date" id="appointment-date" type="date" value={form.date} onChange={(event) => handleChange("date", event.target.value)} />
        <Input label="Time" id="appointment-time" type="time" value={form.time} onChange={(event) => handleChange("time", event.target.value)} />
        <Select label="Type" id="appointment-type" value={form.type} onChange={(event) => handleChange("type", event.target.value as AppointmentType)}>
          {types.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
        <Select label="Status" id="appointment-status" value={form.status} onChange={(event) => handleChange("status", event.target.value as AppointmentStatus)}>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="appointment-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Notes</label>
        <textarea
          id="appointment-notes"
          rows={3}
          value={form.notes}
          onChange={(event) => handleChange("notes", event.target.value)}
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={patients.length === 0 || doctors.length === 0}>{submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
