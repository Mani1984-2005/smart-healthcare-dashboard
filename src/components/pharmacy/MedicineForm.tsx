import { FormEvent, useState } from "react";
import Input from "../common/Input.jsx";
import Select from "../common/Select.jsx";
import Button from "../common/Button.jsx";
import { MedicineRecord } from "../../stores/pharmacyStore.ts";

export type MedicineFormData = Omit<MedicineRecord, "id">;

type MedicineFormProps = {
  initialValues?: MedicineFormData;
  onCancel: () => void;
  onSubmit: (data: MedicineFormData) => void;
  submitLabel: string;
};

const categories = ["Antibiotic", "Antidiabetic", "Analgesic", "Statin", "Bronchodilator", "Antihypertensive", "Other"];
const forms = ["Tablet", "Capsule", "Injection pen", "Inhaler", "Syrup", "Ointment"];

const defaultValues: MedicineFormData = {
  name: "", category: categories[0], form: forms[0], strength: "", manufacturer: "",
  stockQuantity: 0, reorderLevel: 20, unitPrice: 0, expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  requiresPrescription: true,
};

export default function MedicineForm({ initialValues, onCancel, onSubmit, submitLabel }: MedicineFormProps) {
  const [form, setForm] = useState<MedicineFormData>(initialValues || defaultValues);
  const [error, setError] = useState("");

  const handleChange = <K extends keyof MedicineFormData>(key: K, value: MedicineFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      setError("Enter a medicine name.");
      return;
    }
    setError("");
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Name" id="medicine-name" value={form.name} onChange={(event) => handleChange("name", event.target.value)} />
        <Input label="Strength" id="medicine-strength" placeholder="e.g. 500mg" value={form.strength} onChange={(event) => handleChange("strength", event.target.value)} />
        <Select label="Category" id="medicine-category" value={form.category} onChange={(event) => handleChange("category", event.target.value)}>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </Select>
        <Select label="Form" id="medicine-form" value={form.form} onChange={(event) => handleChange("form", event.target.value)}>
          {forms.map((formOption) => (
            <option key={formOption} value={formOption}>{formOption}</option>
          ))}
        </Select>
        <Input label="Manufacturer" id="medicine-manufacturer" value={form.manufacturer} onChange={(event) => handleChange("manufacturer", event.target.value)} />
        <Input label="Expiry date" id="medicine-expiry" type="date" value={form.expiryDate} onChange={(event) => handleChange("expiryDate", event.target.value)} />
        <Input label="Stock quantity" id="medicine-stock" type="number" min={0} value={form.stockQuantity} onChange={(event) => handleChange("stockQuantity", Number(event.target.value))} />
        <Input label="Reorder level" id="medicine-reorder" type="number" min={0} value={form.reorderLevel} onChange={(event) => handleChange("reorderLevel", Number(event.target.value))} />
        <Input label="Unit price (₹)" id="medicine-price" type="number" min={0} value={form.unitPrice} onChange={(event) => handleChange("unitPrice", Number(event.target.value))} />
        <Select label="Requires prescription" id="medicine-rx-required" value={form.requiresPrescription ? "yes" : "no"} onChange={(event) => handleChange("requiresPrescription", event.target.value === "yes")}>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
