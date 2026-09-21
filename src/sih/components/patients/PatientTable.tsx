import { PatientRecord } from "../../stores/patientStore.ts";
import Badge from "../common/Badge.jsx";
import Button from "../common/Button.jsx";

type PatientTableProps = {
  patients: PatientRecord[];
  loading: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function PatientTable({ patients, loading, onView, onEdit, onDelete }: PatientTableProps) {
  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-950">
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-12 rounded-3xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-12 text-center shadow-card dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No patient records found.</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the search or filters to find patients.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 shadow-card dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Patient</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Contact</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Registered</th>
            <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-950 dark:divide-slate-800">
          {patients.map((patient) => (
            <tr key={patient.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900">
              <td className="px-4 py-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{patient.fullName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{patient.id} · {patient.gender} · {patient.age} yrs · {patient.bloodGroup}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-sm text-slate-700 dark:text-slate-200">{patient.phone}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{patient.email}</p>
              </td>
              <td className="px-4 py-4">
                <Badge variant={patient.status === "Active" ? "success" : patient.status === "Critical" ? "danger" : patient.status === "Under Observation" ? "warning" : "neutral"}>
                  {patient.status}
                </Badge>
              </td>
              <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">{patient.registrationDate}</td>
              <td className="px-4 py-4 text-right space-x-2">
                <Button variant="ghost" onClick={() => onView(patient.id)} className="text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900">
                  View
                </Button>
                <Button variant="secondary" onClick={() => onEdit(patient.id)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => onDelete(patient.id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
