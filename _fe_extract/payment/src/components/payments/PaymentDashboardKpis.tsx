import { IndianRupee, CheckCircle2, Clock, XCircle, RotateCcw, Wallet } from "lucide-react";
import MetricCard from "../ui/MetricCard";
import { formatINR } from "../../utils/formatCurrency";
import type { DashboardSummary } from "../../types/payment";

export default function PaymentDashboardKpis({ summary }: { summary: DashboardSummary | null }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <MetricCard label="Today's Revenue" value={formatINR(summary.todaysRevenue)} icon={<IndianRupee className="h-5 w-5" />} />
      <MetricCard label="Successful Payments" value={summary.successfulPayments} icon={<CheckCircle2 className="h-5 w-5" />} />
      <MetricCard label="Pending Payments" value={summary.pendingPayments} icon={<Clock className="h-5 w-5" />} />
      <MetricCard label="Failed Payments" value={summary.failedPayments} icon={<XCircle className="h-5 w-5" />} />
      <MetricCard label="Refunds" value={formatINR(summary.totalRefunded)} icon={<RotateCcw className="h-5 w-5" />} />
      <MetricCard label="Outstanding Amount" value={formatINR(summary.outstandingAmount)} icon={<Wallet className="h-5 w-5" />} />
    </div>
  );
}
