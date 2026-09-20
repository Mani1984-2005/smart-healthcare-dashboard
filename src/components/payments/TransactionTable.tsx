import { useState } from "react";
import Table from "../common/Table.jsx";
import Button from "../ui/Button";
import PaymentStatusBadge from "./PaymentStatusBadge";
import { formatINR, formatDate } from "../../utils/formatCurrency";
import { usePaymentStore } from "../../stores/paymentStore";
import type { Payment } from "../../types/payment";

type TransactionTableProps = {
  transactions: Payment[];
  canRefund: boolean;
};

export default function TransactionTable({ transactions, canRefund }: TransactionTableProps) {
  const { refundPayment } = usePaymentStore();
  const [refundingId, setRefundingId] = useState<string | null>(null);

  async function handleRefund(payment: Payment) {
    if (!window.confirm(`Refund ${formatINR(payment.amount)} for this transaction?`)) return;
    setRefundingId(payment.id);
    try {
      await refundPayment(payment.id);
    } finally {
      setRefundingId(null);
    }
  }

  const columns = [
    { key: "id", title: "Transaction ID", render: (row: Payment) => <span className="font-mono text-xs">{row.id.slice(0, 8)}</span> },
    { key: "patient", title: "Patient", render: (row: Payment) => row.paymentOrder?.patient?.fullName ?? "—" },
    { key: "invoice", title: "Invoice", render: (row: Payment) => row.paymentOrder?.invoice?.invoiceNumber ?? "—" },
    { key: "amount", title: "Amount", render: (row: Payment) => formatINR(row.amount) },
    { key: "method", title: "Method", render: (row: Payment) => row.method },
    { key: "status", title: "Status", render: (row: Payment) => <PaymentStatusBadge status={row.status} /> },
    { key: "date", title: "Date", render: (row: Payment) => formatDate(row.createdAt) },
    ...(canRefund
      ? [
          {
            key: "actions",
            title: "Actions",
            render: (row: Payment) =>
              row.status === "SUCCESS" || row.status === "PARTIALLY_REFUNDED" ? (
                <Button variant="secondary" onClick={() => handleRefund(row)} loading={refundingId === row.id}>
                  Refund
                </Button>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              ),
          },
        ]
      : []),
  ];

  return <Table columns={columns} data={transactions} />;
}
