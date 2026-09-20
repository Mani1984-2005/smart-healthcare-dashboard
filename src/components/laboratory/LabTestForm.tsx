import { FormEvent, useState } from "react";
import Input from "../common/Input.jsx";
import Select from "../common/Select.jsx";
import Button from "../common/Button.jsx";
import { LabTestRecord, LabTestStatus } from "../../stores/labStore.ts";
import { PatientRecord } from "../../stores/patientStore.ts";
import { DoctorRecord } from "../../stores/doctorsStore.ts";

export type LabTestFormData = Omit<LabTestRecord, "id">;

type LabTestFormProps = {
  patients: PatientRecord[];
  doctors: DoctorRecord[];
  initialValues?: LabTestFormData;
  onCancel: () => void;
  onSubmit: (data: LabTestFormData) => void;
  submitLabel: string;
};

const statuses: LabTestStatus[] = ["Ordered", "Sample Collected", "In Progress", "Completed", "Cancelled"];
const categories = ["Biochemistry", "Hematology", "Cardiology", "Pulmonology", "Microbiology", "Radiology", "Other"];

export default function LabTestForm({ patients, doctors, initialValues, onCancel, onSubmit, submitLabel }: LabTestFormProps) {
  const defaultValues: LabTestFormData = {
    patientId: patients[0]?.id || "",
    patientName: patients[0]?.fullName || "",
    doctorName: doctors[0]?.name || "",
    testName: "",
    category: categories[0],
    orderDate: new Date().toISOString().split("T")[0],
    resultDate: null,
    status: "Ordered",
    result: "",
    referenceRange: "",
    notes: "",
  };

  const [form, setForm] = useState<LabTestFormData>(initialValues || defaultValues);
  const [error, setError] = useState("");

  const handleChange = <K extends keyof LabTestFormData>(key: K, value: LabTestFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handlePatientChange = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    setForm((current) => ({ ...current, patientId, patientName: patient?.fullName || "" }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.patientId || form.testName.trim().length < 2) {
      setError("Select a patient and enter a test name.");
      return;
    }
    setError("");
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Patient" id="lab-patient" value={form.patientId} onChange={(event) => handlePatientChange(event.target.value)}>
          {patients.length === 0 && <option value="">No patients on file</option>}
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>{patient.fullName} ({patient.id})</option>
          ))}
        </Select>
        <Select label="Ordering doctor" id="lab-doctor" value={form.doctorName} onChange={(event) => handleChange("doctorName", event.target.value)}>
          {doctors.length === 0 && <option value="">No doctors on file</option>}
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.name}>{doctor.name}</option>
          ))}
        </Select>
        <Input label="Test name" id="lab-test-name" value={form.testName} onChange={(event) => handleChange("testName", event.target.value)} />
        <Select label="Category" id="lab-category" value={form.category} onChange={(event) => handleChange("category", event.target.value)}>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </Select>
        <Input label="Order date" id="lab-order-date" type="date" value={form.orderDate} onChange={(event) => handleChange("orderDate", event.target.value)} />
        <Select label="Status" id="lab-status" value={form.status} onChange={(event) => handleChange("status", event.target.value as LabTestStatus)}>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
        <Input label="Result" id="lab-result" value={form.result} onChange={(event) => handleChange("result", event.target.value)} />
        <Input label="Reference range" id="lab-reference-range" value={form.referenceRange} onChange={(event) => handleChange("referenceRange", event.target.value)} />
      </div>

      <div>
        <label htmlFor="lab-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Notes</label>
        <textarea
          id="lab-notes"
          rows={3}
          value={form.notes}
          onChange={(event) => handleChange("notes", event.target.value)}
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={patients.length === 0}>{submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
