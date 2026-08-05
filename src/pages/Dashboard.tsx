import { useMemo } from "react";
import { useAuthStore } from "../store/authStore.js";

export default function Dashboard() {
  const { user } = useAuthStore();

  const welcomeMessage = useMemo(() => {
    if (!user) return "Welcome to MediCare Pro";
    return `Welcome back, ${user.name}`;
  }, [user]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{welcomeMessage}</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Use the navigation to manage patients, appointments, clinical workflows, billing, and reports.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active patients", value: 1283 },
          { label: "Open appointments", value: 56 },
          { label: "Pending lab orders", value: 14 },
          { label: "Invoice drafts", value: 22 },
        ].map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">{metric.label}</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-100">{metric.value}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
