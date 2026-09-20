import { InvoiceRecord } from "../../stores/billingStore.ts";
import MetricCard from "../ui/MetricCard.tsx";

type BillingSummaryCardsProps = {
  invoices: InvoiceRecord[];
};

const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function BillingSummaryCards({ invoices }: BillingSummaryCardsProps) {
  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
  const pendingAmount = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
  const overdueCount = invoices.filter((invoice) => invoice.status === "Overdue").length;
  const insuranceClaims = invoices.filter((invoice) => invoice.insuranceCoverage > 0).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Revenue collected" value={formatCurrency(totalRevenue)} description={`Across ${invoices.length} invoices`} />
      <MetricCard label="Outstanding balance" value={formatCurrency(pendingAmount)} description="Unpaid + partially paid" />
      <MetricCard label="Overdue invoices" value={overdueCount} description="Past due date" trend={overdueCount > 0 ? "Needs follow-up" : undefined} />
      <MetricCard label="Insurance claims" value={insuranceClaims} description="Invoices with coverage applied" />
    </div>
  );
}
