import { FormEvent, useMemo, useState } from "react";
import Input from "../common/Input.jsx";
import Select from "../common/Select.jsx";
import Button from "../common/Button.jsx";

export type PatientFormData = {
  fullName: string;
  age: string;
  gender: "Female" | "Male" | "Other";
  phone: string;
  email: string;
  bloodGroup: string;
  address: string;
  medicalHistory: string;
  status: "Active" | "Inactive" | "Discharged" | "Under Observation" | "Critical";
};

type PatientFormProps = {
  initialValues?: PatientFormData;
  onCancel: () => void;
  onSubmit: (data: PatientFormData) => void;
  submitLabel: string;
  loading?: boolean;
};

const defaultValues: PatientFormData = {
  fullName: "",
  age: "",
  gender: "Female",
  phone: "",
  email: "",
  bloodGroup: "A+",
  address: "",
  medicalHistory: "",
  status: "Active",
};

export default function PatientForm({ initialValues, onCancel, onSubmit, submitLabel, loading }: PatientFormProps) {
  const [form, setForm] = useState<PatientFormData>(initialValues || defaultValues);
  const [error, setError] = useState("");

  const isValid = useMemo(() => {
    return (
      form.fullName.trim().length > 1 &&
      Number(form.age) > 0 &&
      form.phone.trim().length > 6 &&
      form.email.includes("@") &&
      form.address.trim().length > 5
    );
  }, [form]);

  const handleChange = (key: keyof PatientFormData, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) {
      setError("Please complete all required patient fields.");
      return;
    }
    setError("");
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Full name" id="patient-name" value={form.fullName} onChange={(event) => handleChange("fullName", event.target.value)} />
        <Input label="Age" id="patient-age" type="number" value={form.age} onChange={(event) => handleChange("age", event.target.value)} />
        <Select label="Gender" id="patient-gender" value={form.gender} onChange={(event) => handleChange("gender", event.target.value)}>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
          <option value="Other">Other</option>
        </Select>
        <Select label="Blood group" id="patient-blood-group" value={form.bloodGroup} onChange={(event) => handleChange("bloodGroup", event.target.value)}>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Phone" id="patient-phone" value={form.phone} onChange={(event) => handleChange("phone", event.target.value)} />
        <Input label="Email" id="patient-email" type="email" value={form.email} onChange={(event) => handleChange("email", event.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Address" id="patient-address" value={form.address} onChange={(event) => handleChange("address", event.target.value)} />
        <Select label="Status" id="patient-status" value={form.status} onChange={(event) => handleChange("status", event.target.value)}>
          <option value="Active">Active</option>
          <option value="Under Observation">Under Observation</option>
          <option value="Discharged">Discharged</option>
          <option value="Critical">Critical</option>
          <option value="Inactive">Inactive</option>
        </Select>
      </div>

      <div>
        <label htmlFor="patient-history" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Medical history</label>
        <textarea
          id="patient-history"
          rows={4}
          value={form.medicalHistory}
          onChange={(event) => handleChange("medicalHistory", event.target.value)}
          className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Use comma-separated values for medical conditions.</p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={loading || !isValid}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
