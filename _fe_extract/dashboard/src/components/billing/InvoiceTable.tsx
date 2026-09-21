import { InvoiceRecord, InvoiceStatus } from "../../stores/billingStore.ts";
import Badge from "../common/Badge.jsx";
import Button from "../common/Button.jsx";

type InvoiceTableProps = {
  invoices: InvoiceRecord[];
  loading: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onRecordPayment: (id: string) => void;
  onDelete: (id: string) => void;
};

const statusVariant: Record<InvoiceStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  Paid: "success",
  "Partially Paid": "warning",
  Unpaid: "info",
  Overdue: "danger",
  Draft: "neutral",
  Cancelled: "neutral",
};

const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function InvoiceTable({ invoices, loading, onView, onEdit, onRecordPayment, onDelete }: InvoiceTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-950">
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-card dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No invoices found.</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the search or filters, or create a new invoice.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-card dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Invoice</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Patient</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Amount</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Due date</th>
            <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-950 dark:divide-slate-800">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900">
              <td className="px-4 py-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{invoice.department} · {invoice.billingDate}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-sm text-slate-700 dark:text-slate-200">{invoice.patientName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{invoice.patientId} · {invoice.phone}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(invoice.grandTotal)}</p>
                {invoice.balanceDue > 0 && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{formatCurrency(invoice.balanceDue)} due</p>
                )}
              </td>
              <td className="px-4 py-4">
                <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
              </td>
              <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">{invoice.dueDate}</td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" onClick={() => onView(invoice.id)}>View</Button>
                  <Button variant="secondary" onClick={() => onEdit(invoice.id)}>Edit</Button>
                  {invoice.balanceDue > 0 && (
                    <Button variant="secondary" onClick={() => onRecordPayment(invoice.id)}>Record payment</Button>
                  )}
                  <Button variant="danger" onClick={() => onDelete(invoice.id)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
