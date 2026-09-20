import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Input from "../common/Input.jsx";
import Select from "../common/Select.jsx";
import Button from "../common/Button.jsx";
import { BillingCategory, InvoiceItem, InvoiceStatus, PaymentMethod } from "../../stores/billingStore.ts";

export type InvoiceFormData = {
  patientId: string;
  patientName: string;
  phone: string;
  doctorName: string;
  department: string;
  items: InvoiceItem[];
  discount: string;
  tax: string;
  insuranceCoverage: string;
  insuranceProvider: string;
  amountPaid: string;
  paymentMethod: PaymentMethod;
  status: InvoiceStatus;
  dueDate: string;
  notes: string;
};

type InvoiceFormProps = {
  initialValues?: InvoiceFormData;
  onCancel: () => void;
  onSubmit: (data: InvoiceFormData) => void;
  submitLabel: string;
  loading?: boolean;
};

const categories: BillingCategory[] = ["Consultation", "Laboratory", "Pharmacy", "Procedure", "Room", "ICU", "Emergency", "Surgery", "Other"];
const paymentMethods: PaymentMethod[] = ["Cash", "Card", "UPI", "Insurance", "Pending"];
const statuses: InvoiceStatus[] = ["Draft", "Unpaid", "Partially Paid", "Paid", "Overdue", "Cancelled"];

function createItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `LI-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const emptyItem = (): InvoiceItem => ({ id: createItemId(), description: "", category: "Consultation", quantity: 1, unitPrice: 0, amount: 0 });

const defaultValues: InvoiceFormData = {
  patientId: "",
  patientName: "",
  phone: "",
  doctorName: "",
  department: "",
  items: [emptyItem()],
  discount: "0",
  tax: "5",
  insuranceCoverage: "0",
  insuranceProvider: "",
  amountPaid: "0",
  paymentMethod: "Pending",
  status: "Draft",
  dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  notes: "",
};

export default function InvoiceForm({ initialValues, onCancel, onSubmit, submitLabel, loading }: InvoiceFormProps) {
  const [form, setForm] = useState<InvoiceFormData>(initialValues || defaultValues);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + item.amount, 0);
    const discount = Number(form.discount) || 0;
    const tax = Number(form.tax) || 0;
    const insuranceCoverage = Number(form.insuranceCoverage) || 0;
    const taxable = Math.max(subtotal - discount, 0);
    const taxAmount = Math.round(taxable * (tax / 100));
    const grandTotal = Math.max(taxable + taxAmount - insuranceCoverage, 0);
    return { subtotal, taxAmount, grandTotal };
  }, [form.items, form.discount, form.tax, form.insuranceCoverage]);

  const isValid = useMemo(() => {
    return (
      form.patientName.trim().length > 1 &&
      form.patientId.trim().length > 0 &&
      form.items.length > 0 &&
      form.items.every((item) => item.description.trim().length > 0 && item.quantity > 0 && item.unitPrice >= 0)
    );
  }, [form]);

  const handleChange = <K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleItemChange = (id: string, key: keyof InvoiceItem, value: string | number) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [key]: value } as InvoiceItem;
        if (key === "quantity" || key === "unitPrice") {
          updated.amount = Number(updated.quantity) * Number(updated.unitPrice);
        }
        return updated;
      }),
    }));
  };

  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  const removeItem = (id: string) => setForm((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) {
      setError("Add a patient, doctor, and at least one valid line item before saving.");
      return;
    }
    setError("");
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Patient ID" id="invoice-patient-id" value={form.patientId} onChange={(event) => handleChange("patientId", event.target.value)} />
        <Input label="Patient name" id="invoice-patient-name" value={form.patientName} onChange={(event) => handleChange("patientName", event.target.value)} />
        <Input label="Phone" id="invoice-phone" value={form.phone} onChange={(event) => handleChange("phone", event.target.value)} />
        <Input label="Doctor" id="invoice-doctor" value={form.doctorName} onChange={(event) => handleChange("doctorName", event.target.value)} />
        <Input label="Department" id="invoice-department" value={form.department} onChange={(event) => handleChange("department", event.target.value)} />
        <Input label="Due date" id="invoice-due-date" type="date" value={form.dueDate} onChange={(event) => handleChange("dueDate", event.target.value)} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Line items</p>
          <Button type="button" variant="secondary" onClick={addItem} className="gap-1">
            <Plus className="h-4 w-4" /> Add item
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {form.items.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-4">
                <Input label="Description" id={`item-desc-${item.id}`} value={item.description} onChange={(event) => handleItemChange(item.id, "description", event.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <Select label="Category" id={`item-cat-${item.id}`} value={item.category} onChange={(event) => handleItemChange(item.id, "category", event.target.value)}>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Input label="Qty" id={`item-qty-${item.id}`} type="number" min={1} value={item.quantity} onChange={(event) => handleItemChange(item.id, "quantity", Number(event.target.value))} />
              </div>
              <div className="sm:col-span-2">
                <Input label="Unit price (₹)" id={`item-price-${item.id}`} type="number" min={0} value={item.unitPrice} onChange={(event) => handleItemChange(item.id, "unitPrice", Number(event.target.value))} />
              </div>
              <div className="flex items-center justify-between gap-2 sm:col-span-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">₹{item.amount.toLocaleString("en-IN")}</p>
                <Button type="button" variant="ghost" onClick={() => removeItem(item.id)} disabled={form.items.length === 1} aria-label="Remove line item">
                  <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-300" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input label="Discount (₹)" id="invoice-discount" type="number" min={0} value={form.discount} onChange={(event) => handleChange("discount", event.target.value)} />
        <Input label="Tax (%)" id="invoice-tax" type="number" min={0} value={form.tax} onChange={(event) => handleChange("tax", event.target.value)} />
        <Input label="Insurance coverage (₹)" id="invoice-insurance" type="number" min={0} value={form.insuranceCoverage} onChange={(event) => handleChange("insuranceCoverage", event.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Insurance provider" id="invoice-insurance-provider" value={form.insuranceProvider} onChange={(event) => handleChange("insuranceProvider", event.target.value)} />
        <Input label="Amount paid (₹)" id="invoice-amount-paid" type="number" min={0} value={form.amountPaid} onChange={(event) => handleChange("amountPaid", event.target.value)} />
        <Select label="Payment method" id="invoice-payment-method" value={form.paymentMethod} onChange={(event) => handleChange("paymentMethod", event.target.value as PaymentMethod)}>
          {paymentMethods.map((method) => (
            <option key={method} value={method}>{method}</option>
          ))}
        </Select>
        <Select label="Status" id="invoice-status" value={form.status} onChange={(event) => handleChange("status", event.target.value as InvoiceStatus)}>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="invoice-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Notes</label>
        <textarea
          id="invoice-notes"
          rows={3}
          value={form.notes}
          onChange={(event) => handleChange("notes", event.target.value)}
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span>Subtotal</span>
          <span>₹{totals.subtotal.toLocaleString("en-IN")}</span>
        </div>
        <div className="mt-1 flex justify-between text-slate-600 dark:text-slate-400">
          <span>Tax</span>
          <span>₹{totals.taxAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
          <span>Grand total</span>
          <span>₹{totals.grandTotal.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={loading || !isValid}>{submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
