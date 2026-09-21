import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  CalendarDays,
  FlaskConical,
  LayoutDashboard,
  Pill,
  ReceiptText,
  Settings,
  Stethoscope,
  UsersRound,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../app/routes.tsx";
import { useAuthStore } from "../store/authStore.js";
import IconButton from "../components/ui/IconButton.tsx";

type SidebarProps = { open: boolean; onClose: () => void };

const groupByPath: Record<string, string> = {
  "/dashboard": "Overview",
  "/patients": "Patient Care",
  "/appointments": "Patient Care",
  "/queue": "Patient Care",
  "/clinical": "Patient Care",
  "/clinical-encounter": "Patient Care",
  "/clinical-intelligence": "Patient Care",
  "/physician-workspace": "Patient Care",
  "/medical-documents": "Patient Care",
  "/doctors": "Patient Care",
  "/laboratory": "Diagnostics",
  "/pharmacy": "Diagnostics",
  "/billing": "Finance",
  "/payments": "Finance",
  "/analytics": "Intelligence",
  "/reports": "Intelligence",
  "/notifications": "Communication",
  "/admin": "Administration",
};

const iconByPath = {
  "/dashboard": LayoutDashboard,
  "/patients": UsersRound,
  "/appointments": CalendarDays,
  "/queue": Activity,
  "/clinical": Stethoscope,
  "/clinical-encounter": AlertCircle,
  "/clinical-intelligence": BarChart3,
  "/physician-workspace": Stethoscope,
  "/medical-documents": ReceiptText,
  "/doctors": Stethoscope,
  "/laboratory": FlaskConical,
  "/pharmacy": Pill,
  "/billing": ReceiptText,
  "/payments": ReceiptText,
  "/analytics": BarChart3,
  "/reports": BarChart3,
  "/notifications": Bell,
  "/admin": Settings,
};

const groups = ["Overview", "Patient Care", "Diagnostics", "Finance", "Intelligence", "Communication", "Administration"];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const availableRoutes = ROUTES.filter((route) => user?.role && route.roles.includes(user.role));

  return (
    <>
      {open && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden" onClick={onClose} />}
      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-white/95 backdrop-blur-xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950/95 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex h-full flex-col p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg shadow-cyan-600/20">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">MediCare Pro</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hospital OS</p>
              </div>
            </div>
            <IconButton label="Close navigation" onClick={onClose} className="lg:hidden">
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <nav className="mt-6 flex-1 space-y-5 overflow-y-auto">
            {groups.map((group) => {
              const routes = availableRoutes.filter((route) => groupByPath[route.path] === group);
              if (!routes.length) return null;

              return (
                <div key={group}>
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{group}</p>
                  <div className="space-y-1">
                    {routes.map((route) => {
                      const Icon = iconByPath[route.path as keyof typeof iconByPath] ?? LayoutDashboard;
                      return (
                        <NavLink
                          key={route.path}
                          to={route.path}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${
                              isActive
                                ? "bg-cyan-50 text-cyan-800 shadow-sm ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-900"
                                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white"
                            }`
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{route.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="mt-4 space-y-2">
            <NavLink
              to="/kiosk"
              onClick={onClose}
              className="flex min-h-10 items-center gap-3 rounded-xl border border-dashed border-cyan-300 px-3 py-2 text-sm font-medium text-cyan-800 transition hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 dark:border-cyan-800 dark:text-cyan-200 dark:hover:bg-cyan-950/40"
            >
              <Activity className="h-4 w-4" aria-hidden="true" />
              Start Kiosk Intake
            </NavLink>
            <NavLink
              to="/part6"
              onClick={onClose}
              className="flex min-h-10 items-center gap-3 rounded-xl border border-dashed border-cyan-300 px-3 py-2 text-sm font-medium text-cyan-800 transition hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 dark:border-cyan-800 dark:text-cyan-200 dark:hover:bg-cyan-950/40"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Part 6 · ABDM / FHIR / Consent
            </NavLink>
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 dark:border-cyan-900/40 dark:bg-cyan-950/30">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Connected care workflow</p>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
              Patient, queue, lab, pharmacy, and billing updates remain aligned to the same clinical journey.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
