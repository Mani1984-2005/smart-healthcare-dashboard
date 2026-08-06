import { Activity, BarChart3, CalendarDays, FlaskConical, LayoutDashboard, Pill, ReceiptText, Settings, Stethoscope, UsersRound, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../app/routes.tsx";
import { useAuthStore } from "../store/authStore.js";
import IconButton from "../components/ui/IconButton.tsx";

type SidebarProps = { open: boolean; onClose: () => void };
const groupByPath: Record<string, string> = { "/dashboard": "Operations", "/patients": "Clinical", "/doctors": "Clinical", "/appointments": "Clinical", "/laboratory": "Clinical", "/pharmacy": "Clinical", "/billing": "Financial", "/reports": "Operations", "/admin": "Administration" };
const iconByPath = { "/dashboard": LayoutDashboard, "/patients": UsersRound, "/doctors": Stethoscope, "/appointments": CalendarDays, "/laboratory": FlaskConical, "/pharmacy": Pill, "/billing": ReceiptText, "/reports": BarChart3, "/admin": Settings };
const groups = ["Clinical", "Operations", "Financial", "Administration"];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const availableRoutes = ROUTES.filter((route) => user?.role && route.roles.includes(user.role));

  return <>
    {open && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden" onClick={onClose} />}
    <aside aria-label="Primary navigation" className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-white shadow-raised transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-700 text-white"><Activity className="h-5 w-5" aria-hidden="true" /></div><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">MediCare Pro</p><p className="text-xs text-slate-500 dark:text-slate-400">Healthcare operations</p></div></div>
          <IconButton label="Close navigation" onClick={onClose} className="lg:hidden"><X className="h-4 w-4" /></IconButton>
        </div>
        <nav className="mt-6 flex-1 overflow-y-auto">
          {groups.map((group) => { const routes = availableRoutes.filter((route) => groupByPath[route.path] === group); if (!routes.length) return null; return <div key={group} className="mb-6"><p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{group}</p><div className="space-y-1">{routes.map((route) => { const Icon = iconByPath[route.path as keyof typeof iconByPath]; return <NavLink key={route.path} to={route.path} onClick={onClose} className={({ isActive }) => `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${isActive ? "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"}`}><Icon className="h-4 w-4" aria-hidden="true" />{route.label}</NavLink>; })}</div></div>; })}
        </nav>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Clinical workspace</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Use patient and care workflows to keep every handoff visible.</p></div>
      </div>
    </aside>
  </>;
}
