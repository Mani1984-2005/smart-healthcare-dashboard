import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, AlertTriangle, TriangleAlert } from "lucide-react";
import { IconButton } from "../ui";
import { usePatientStore } from "../../stores/patientStore.ts";
import { useBillingStore } from "../../stores/billingStore.ts";
import { useLabStore } from "../../stores/labStore.ts";
import { usePharmacyStore, generatePharmacyInsights } from "../../stores/pharmacyStore.ts";

type NotificationItem = { id: string; message: string; tone: "warning" | "critical"; path: string };

export default function NotificationsMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { patients } = usePatientStore();
  const { invoices } = useBillingStore();
  const { tests } = useLabStore();
  const { medicines } = usePharmacyStore();

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    const critical = patients.filter((p) => p.status === "Critical");
    if (critical.length > 0) items.push({ id: "critical-patients", message: `${critical.length} patient${critical.length > 1 ? "s" : ""} marked critical`, tone: "critical", path: "/patients" });

    const overdue = invoices.filter((i) => i.status === "Overdue");
    if (overdue.length > 0) items.push({ id: "overdue-invoices", message: `${overdue.length} overdue invoice${overdue.length > 1 ? "s" : ""}`, tone: "warning", path: "/billing" });

    const pendingLab = tests.filter((t) => t.status === "Ordered" || t.status === "Sample Collected" || t.status === "In Progress");
    if (pendingLab.length > 0) items.push({ id: "pending-lab", message: `${pendingLab.length} lab test${pendingLab.length > 1 ? "s" : ""} awaiting review`, tone: "warning", path: "/laboratory" });

    const pharmacyInsights = generatePharmacyInsights(medicines).filter((i) => i.id !== "clear");
    pharmacyInsights.forEach((insight) => items.push({ id: `pharmacy-${insight.id}`, message: insight.message, tone: insight.tone === "critical" ? "critical" : "warning", path: "/pharmacy" }));

    return items;
  }, [patients, invoices, tests, medicines]);

  return (
    <div className="relative">
      <IconButton label={`Notifications${notifications.length > 0 ? ` (${notifications.length})` : ""}`} className="relative" onClick={() => setOpen((o) => !o)}>
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-600" />}
      </IconButton>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-950">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-900 dark:text-slate-100">Notifications</p>
          {notifications.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { navigate(item.path); setOpen(false); }}
                  className="flex w-full items-start gap-2 border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
                >
                  {item.tone === "critical" ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-300" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />}
                  <span className="text-slate-700 dark:text-slate-200">{item.message}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">You're all caught up.</p>
          )}
        </div>
      )}
    </div>
  );
}
