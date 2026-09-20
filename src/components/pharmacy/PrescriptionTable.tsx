import { PrescriptionRecord, PrescriptionStatus } from "../../stores/pharmacyStore.ts";
import { Badge, Button } from "../ui";

type PrescriptionTableProps = {
  prescriptions: PrescriptionRecord[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

const statusVariant: Record<PrescriptionStatus, "success" | "warning" | "neutral"> = {
  Active: "success",
  Completed: "neutral",
  Cancelled: "warning",
};

export default function PrescriptionTable({ prescriptions, onEdit, onDelete }: PrescriptionTableProps) {
  if (prescriptions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-card dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No prescriptions found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-card dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Medicine</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Patient</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Prescribed by</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Dosage</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</th>
            <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-950 dark:divide-slate-800">
          {prescriptions.map((rx) => (
            <tr key={rx.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900">
              <td className="px-4 py-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rx.medicineName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Prescribed {rx.prescriptionDate}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-sm text-slate-700 dark:text-slate-200">{rx.patientName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{rx.patientId}</p>
              </td>
              <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{rx.doctorName}</td>
              <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{rx.dosage} · {rx.frequency} · {rx.duration}</td>
              <td className="px-4 py-4"><Badge variant={statusVariant[rx.status]}>{rx.status}</Badge></td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" onClick={() => onEdit(rx.id)}>Edit</Button>
                  <Button variant="danger" onClick={() => onDelete(rx.id)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
