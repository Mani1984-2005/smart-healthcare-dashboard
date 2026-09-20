import { InvoiceRecord } from "../../stores/billingStore.ts";
import Badge from "../common/Badge.jsx";
import Button from "../common/Button.jsx";
import { Printer } from "lucide-react";
import QRCodeCard from "../common/QRCodeCard.tsx";
import { encodeQrReference } from "../../lib/qr/qrReference.ts";

type InvoiceDetailProps = {
  invoice: InvoiceRecord;
};

const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  return (
    <div>
      <div className="flex items-start justify-between print:hidden">
        <div />
        <Button variant="secondary" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <div id="invoice-print-area" className="mt-4 space-y-6 text-sm text-slate-700 dark:text-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">MediCare Pro Hospital</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Registration No. MCP-HOSP-0042 · Emergency: +91 1800 200 1000</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Billed {invoice.billingDate} · Due {invoice.dueDate}</p>
            <div className="mt-1"><Badge variant={invoice.status === "Paid" ? "success" : invoice.status === "Overdue" ? "danger" : "warning"}>{invoice.status}</Badge></div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Patient</p>
            <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{invoice.patientName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{invoice.patientId} · {invoice.phone}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Attending doctor</p>
            <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{invoice.doctorName || "—"}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{invoice.department}</p>
          </div>
        </div>

        <div className="print:hidden">
          <QRCodeCard value={encodeQrReference("INVOICE", invoice.id)} label="Verify this bill" filename={`invoice-${invoice.invoiceNumber}`} />
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Item</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Category</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Qty</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Unit price</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{item.category}</td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto max-w-xs space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(invoice.discount)}</span></div>
          <div className="flex justify-between"><span>Tax ({invoice.tax}%)</span><span>{formatCurrency(Math.round((invoice.subtotal - invoice.discount) * (invoice.tax / 100)))}</span></div>
          {invoice.insuranceCoverage > 0 && (
            <div className="flex justify-between"><span>Insurance coverage {invoice.insuranceProvider && `(${invoice.insuranceProvider})`}</span><span>-{formatCurrency(invoice.insuranceCoverage)}</span></div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100"><span>Grand total</span><span>{formatCurrency(invoice.grandTotal)}</span></div>
          <div className="flex justify-between text-emerald-700 dark:text-emerald-300"><span>Amount paid</span><span>{formatCurrency(invoice.amountPaid)}</span></div>
          <div className="flex justify-between font-semibold text-rose-700 dark:text-rose-300"><span>Balance due</span><span>{formatCurrency(invoice.balanceDue)}</span></div>
        </div>

        {invoice.notes && (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Notes</p>
            <p className="mt-1">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
