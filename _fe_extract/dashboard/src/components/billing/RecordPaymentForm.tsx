import { FormEvent, useState } from "react";
import Input from "../common/Input.jsx";
import Select from "../common/Select.jsx";
import Button from "../common/Button.jsx";
import { InvoiceRecord, PaymentMethod } from "../../stores/billingStore.ts";

type RecordPaymentFormProps = {
  invoice: InvoiceRecord;
  onCancel: () => void;
  onSubmit: (amount: number, method: PaymentMethod) => void;
  loading?: boolean;
};

const paymentMethods: PaymentMethod[] = ["Cash", "Card", "UPI", "Insurance"];

export default function RecordPaymentForm({ invoice, onCancel, onSubmit, loading }: RecordPaymentFormProps) {
  const [amount, setAmount] = useState(String(invoice.balanceDue));
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0 || value > invoice.balanceDue) {
      setError(`Enter an amount between ₹1 and ₹${invoice.balanceDue.toLocaleString("en-IN")}.`);
      return;
    }
    setError("");
    onSubmit(value, method);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Balance due on {invoice.invoiceNumber}: <span className="font-semibold text-slate-900 dark:text-slate-100">₹{invoice.balanceDue.toLocaleString("en-IN")}</span>
      </p>
      <Input label="Payment amount (₹)" id="payment-amount" type="number" min={1} max={invoice.balanceDue} value={amount} onChange={(event) => setAmount(event.target.value)} />
      <Select label="Payment method" id="payment-method" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
        {paymentMethods.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </Select>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={loading}>Record payment</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
