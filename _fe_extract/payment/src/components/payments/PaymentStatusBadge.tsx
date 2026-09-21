import Badge from "../ui/Badge";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  PAID: "success",
  SUCCESS: "success",
  PROCESSED: "success",
  PARTIALLY_PAID: "warning",
  PENDING: "warning",
  PROCESSING: "warning",
  UNPAID: "warning",
  ATTEMPTED: "warning",
  CREATED: "info",
  FAILED: "danger",
  CANCELLED: "danger",
  EXPIRED: "danger",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "neutral",
  DRAFT: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  PARTIALLY_PAID: "Partially paid",
  PARTIALLY_REFUNDED: "Partially refunded",
};

export default function PaymentStatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "neutral";
  const label = STATUS_LABEL[status] ?? status.charAt(0) + status.slice(1).toLowerCase();
  return <Badge variant={variant}>{label}</Badge>;
}
