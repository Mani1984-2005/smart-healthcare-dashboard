import { FileText } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import PaymentStatusBadge from "./PaymentStatusBadge";
import { formatINR, formatDate } from "../../utils/formatCurrency";
import type { Invoice } from "../../types/payment";

type InvoiceListProps = {
  invoices: Invoice[];
  onPay: (invoice: Invoice) => void;
};

export default function InvoiceList({ invoices, onPay }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8" aria-hidden="true" />}
        title="No invoices yet"
        description="Invoices from your appointments, lab work, and pharmacy orders will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => {
        const payable = invoice.status === "UNPAID" || invoice.status === "PARTIALLY_PAID";
        return (
          <Card key={invoice.id} className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Invoice {invoice.invoiceNumber}</p>
                  <PaymentStatusBadge status={invoice.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Billed {formatDate(invoice.billingDate)}
                  {invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ""}
                </p>
                <ul className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  {invoice.items.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      {item.serviceName} × {item.quantity}
                    </li>
                  ))}
                  {invoice.items.length > 3 && <li>+{invoice.items.length - 3} more</li>}
                </ul>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Amount Due</p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{formatINR(invoice.balanceDue)}</p>
                </div>
                {payable && (
                  <Button onClick={() => onPay(invoice)} className="w-full sm:w-auto">
                    Pay Now
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
