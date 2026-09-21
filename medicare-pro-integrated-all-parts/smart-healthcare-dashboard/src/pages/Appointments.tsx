import EmptyState from "../components/common/EmptyState.jsx";

export default function Appointments() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Appointment Scheduling</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Coordinate patient appointments, practitioner availability, and telehealth sessions.</p>
      </section>

      <EmptyState title="Scheduling dashboard" description="Appointment management will display live sessions and open slots." />
    </div>
  );
}
