import { AppointmentRecord, AppointmentStatus } from "../../stores/appointmentsStore.ts";
import { Badge, Button } from "../ui";

type AppointmentTableProps = {
  appointments: AppointmentRecord[];
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
};

const statusVariant: Record<AppointmentStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  Scheduled: "info",
  "Checked In": "warning",
  Completed: "success",
  Cancelled: "neutral",
  "No-show": "danger",
};

export default function AppointmentTable({ appointments, onEdit, onCancel, onDelete }: AppointmentTableProps) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-card dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No appointments found.</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the filters or book a new appointment.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-card dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Date &amp; time</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Patient</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Doctor</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Type</th>
            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</th>
            <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-950 dark:divide-slate-800">
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900">
              <td className="px-4 py-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{appointment.date}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{appointment.time}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-sm text-slate-700 dark:text-slate-200">{appointment.patientName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{appointment.patientId}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-sm text-slate-700 dark:text-slate-200">{appointment.doctorName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{appointment.department}</p>
              </td>
              <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{appointment.type}</td>
              <td className="px-4 py-4"><Badge variant={statusVariant[appointment.status]}>{appointment.status}</Badge></td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" onClick={() => onEdit(appointment.id)}>Edit</Button>
                  {appointment.status !== "Cancelled" && appointment.status !== "Completed" && (
                    <Button variant="secondary" onClick={() => onCancel(appointment.id)}>Cancel</Button>
                  )}
                  <Button variant="danger" onClick={() => onDelete(appointment.id)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
