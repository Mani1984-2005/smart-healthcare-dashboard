import { FormEvent, useState } from "react";
import Input from "../common/Input.jsx";
import Select from "../common/Select.jsx";
import Button from "../common/Button.jsx";
import { PrescriptionRecord, PrescriptionStatus, MedicineRecord } from "../../stores/pharmacyStore.ts";
import { PatientRecord } from "../../stores/patientStore.ts";
import { DoctorRecord } from "../../stores/doctorsStore.ts";

export type PrescriptionFormData = Omit<PrescriptionRecord, "id">;

type PrescriptionFormProps = {
  patients: PatientRecord[];
  doctors: DoctorRecord[];
  medicines: MedicineRecord[];
  initialValues?: PrescriptionFormData;
  onCancel: () => void;
  onSubmit: (data: PrescriptionFormData) => void;
  submitLabel: string;
};

const statuses: PrescriptionStatus[] = ["Active", "Completed", "Cancelled"];

export default function PrescriptionForm({ patients, doctors, medicines, initialValues, onCancel, onSubmit, submitLabel }: PrescriptionFormProps) {
  const defaultValues: PrescriptionFormData = {
    patientId: patients[0]?.id || "",
    patientName: patients[0]?.fullName || "",
    doctorName: doctors[0]?.name || "",
    medicineName: medicines[0]?.name || "",
    dosage: "",
    frequency: "",
    duration: "",
    prescriptionDate: new Date().toISOString().split("T")[0],
    status: "Active",
    notes: "",
  };

  const [form, setForm] = useState<PrescriptionFormData>(initialValues || defaultValues);
  const [error, setError] = useState("");

  const handleChange = <K extends keyof PrescriptionFormData>(key: K, value: PrescriptionFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handlePatientChange = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    setForm((current) => ({ ...current, patientId, patientName: patient?.fullName || "" }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.patientId || !form.medicineName || form.dosage.trim().length === 0) {
      setError("Select a patient and medicine, and enter a dosage.");
      return;
    }
    setError("");
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Patient" id="rx-patient" value={form.patientId} onChange={(event) => handlePatientChange(event.target.value)}>
          {patients.length === 0 && <option value="">No patients on file</option>}
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>{patient.fullName} ({patient.id})</option>
          ))}
        </Select>
        <Select label="Prescribing doctor" id="rx-doctor" value={form.doctorName} onChange={(event) => handleChange("doctorName", event.target.value)}>
          {doctors.length === 0 && <option value="">No doctors on file</option>}
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.name}>{doctor.name}</option>
          ))}
        </Select>
        <Select label="Medicine" id="rx-medicine" value={form.medicineName} onChange={(event) => handleChange("medicineName", event.target.value)}>
          {medicines.length === 0 && <option value="">No medicines on file</option>}
          {medicines.map((medicine) => (
            <option key={medicine.id} value={medicine.name}>{medicine.name} ({medicine.strength})</option>
          ))}
        </Select>
        <Input label="Prescription date" id="rx-date" type="date" value={form.prescriptionDate} onChange={(event) => handleChange("prescriptionDate", event.target.value)} />
        <Input label="Dosage" id="rx-dosage" placeholder="e.g. 500mg" value={form.dosage} onChange={(event) => handleChange("dosage", event.target.value)} />
        <Input label="Frequency" id="rx-frequency" placeholder="e.g. Twice daily" value={form.frequency} onChange={(event) => handleChange("frequency", event.target.value)} />
        <Input label="Duration" id="rx-duration" placeholder="e.g. 30 days" value={form.duration} onChange={(event) => handleChange("duration", event.target.value)} />
        <Select label="Status" id="rx-status" value={form.status} onChange={(event) => handleChange("status", event.target.value as PrescriptionStatus)}>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="rx-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Notes</label>
        <textarea
          id="rx-notes"
          rows={3}
          value={form.notes}
          onChange={(event) => handleChange("notes", event.target.value)}
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={patients.length === 0 || medicines.length === 0}>{submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
