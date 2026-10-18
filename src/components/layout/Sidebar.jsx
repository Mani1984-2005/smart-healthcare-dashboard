// FILE PATH: src/components/layout/Sidebar.jsx
// CREATE this new file.
//
// Replaces the horizontal Navbar with a left sidebar — standard, trustworthy
// healthcare SaaS pattern, with room for grouped sections and an active-state
// pill (avoids the generic "row of pills" competitor look).
//
// All routes from every module built in this project are preserved below.
// If you have routes not listed here, add them to NAV_GROUPS — nothing
// about routing logic changes, this is purely the navigation UI.
//
// Collapsible on desktop (icon-only mode), slide-over drawer on mobile.

import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Stethoscope, UserCog, Pill, Warehouse,
  FlaskConical, Receipt, FileText, BarChart3, ScanLine, MessageSquareWarning,
  Phone, Settings, ChevronsLeft, ChevronsRight, X, HeartPulse,
} from "lucide-react";

// ── Nav structure — grouped by clinical area ─────────────────────────────────
// Edit labels/icons freely; routes (`to`) match what's been built so far.

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/patients", label: "Patients", icon: Users },
      { to: "/doctors", label: "Doctors", icon: Stethoscope },
      { to: "/staff", label: "Staff", icon: UserCog },
    ],
  },
  {
    label: "Clinical & Diagnostics",
    items: [
      { to: "/laboratory", label: "Laboratory", icon: FlaskConical },
      { to: "/emergency", label: "Emergency Triage", icon: HeartPulse },
    ],
  },
  {
    label: "Pharmacy",
    items: [
      { to: "/pharmacy", label: "Pharmacy", icon: Pill },
    ],
  },
  {
    label: "Billing",
    items: [
      { to: "/billing", label: "Invoicing", icon: Receipt },
    ],
  },
  {
    label: "Patient Services",
    items: [
      { to: "/patient-relations", label: "Patient Relations", icon: HeartPulse },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-[2px] md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50 md:z-auto
          h-screen bg-white dark:bg-slate-900 border-r border-neutral-200/70 dark:border-slate-800
          flex flex-col
          transition-all duration-200
          ${collapsed ? "md:w-18" : "md:w-64"}
          w-72
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* ── Brand ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center shrink-0 shadow-sm">
              <HeartPulse size={18} className="text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-base font-black text-neutral-800 dark:text-white leading-none truncate tracking-tight">MediCare Pro</p>
                <p className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">Smart Healthcare</p>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden w-8 h-8 inline-flex items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Nav groups ─────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 dark:text-slate-500 px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-xl
                      text-sm font-bold
                      transition-all duration-150
                      ${collapsed ? "justify-center" : ""}
                      ${isActive
                        ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-extrabold shadow-sm"
                        : "text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 dark:hover:text-white"}
                    `}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Collapse toggle (desktop only) ────────────────────────────── */}
        <div className="hidden md:flex items-center justify-center border-t border-neutral-100 dark:border-slate-800 p-3 shrink-0">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-neutral-500 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:text-neutral-800 dark:hover:text-white transition-colors text-xs font-bold"
          >
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
          </button>
        </div>
      </aside>
    </>
  );
}