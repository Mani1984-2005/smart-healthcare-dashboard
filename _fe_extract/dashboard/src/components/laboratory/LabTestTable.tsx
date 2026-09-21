import { LabTestRecord, LabTestStatus } from "../../stores/labStore.ts";
import { Badge, Button } from "../ui";

type LabTestTableProps = {
  tests: LabTestRecord[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

const statusVariant: Record<LabTestStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  Ordered: "info",
  "Sample Collected": "warning",
  "In Progress": "warning",
  Completed: "success",
  Cancelled: "neutral",
};

export default function LabTestTable({ tests, onEdit, onDelete }: LabTestTableProps) {
  if (tests.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-card dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No lab tests found.</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the filters or order a new test.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-card dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Test</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Patient</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Ordered by</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Result</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</th>
            <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-950 dark:divide-slate-800">
          {tests.map((test) => (
            <tr key={test.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900">
              <td className="px-4 py-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{test.testName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{test.category} · Ordered {test.orderDate}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-sm text-slate-700 dark:text-slate-200">{test.patientName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{test.patientId}</p>
              </td>
              <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{test.doctorName}</td>
              <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                {test.result ? (
                  <>
                    <p>{test.result}</p>
                    {test.referenceRange && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Ref: {test.referenceRange}</p>}
                  </>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">Pending</span>
                )}
              </td>
              <td className="px-4 py-4"><Badge variant={statusVariant[test.status]}>{test.status}</Badge></td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" onClick={() => onEdit(test.id)}>Edit</Button>
                  <Button variant="danger" onClick={() => onDelete(test.id)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
