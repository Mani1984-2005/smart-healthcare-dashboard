import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, Stethoscope, UserCog, Pill, Warehouse,
  FlaskConical, Receipt, HeartPulse, Settings, BarChart3,
  ChevronsLeft, ChevronsRight, Microscope, CreditCard, Clipboard,
} from "lucide-react";

const NAV_GROUPS = [
  { label: "Overview", items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  ] },
  { label: "People", items: [
    { to: "/patients", label: "Patients", icon: Users, permission: "patient:read" },
    { to: "/doctors", label: "Doctors", icon: Stethoscope, permission: "patient:read" },
    { to: "/staff", label: "Staff", icon: UserCog, permission: "role:admin" },
  ] },
  { label: "Clinical & Diagnostics", items: [
    { to: "/laboratory", label: "Laboratory", icon: FlaskConical, permission: "lab:write" },
    { to: "/x-ray", label: "X-Ray", icon: Microscope, permission: "lab:write" },
  ] },
  { label: "Pharmacy", items: [
    { to: "/pharmacy", label: "Pharmacy", icon: Pill, permission: "pharmacy:dispense" },
    { to: "/inventory", label: "Inventory", icon: Warehouse, permission: "pharmacy:dispense" },
  ] },
  { label: "Billing", items: [
    { to: "/billing", label: "Invoicing", icon: Receipt, permission: "billing:read" },
  ] },
  { label: "Patient Services", items: [
    { to: "/patient-relations", label: "Patient Relations", icon: HeartPulse, permission: "patient:read" },
    { to: "/settings", label: "Settings", icon: Settings, permission: "settings:view" },
  ] },
];

export default function Sidebar({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) {
  const { identity, hasPermission, hasRole } = useAuth();
  const routeVisible = (item) => {
    if (identity?.authMode !== "test-fixture") return true;
    if (identity.roles.includes("super_admin") || identity.roles.includes("admin")) return true;
    if (item.permission) return hasPermission(item.permission);
    if (item.role) return hasRole(item.role);
    return true;
  };
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);
  const isCollapsed = collapsed ?? internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed((value) => !value);
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:sticky md:top-0 md:z-40 h-screen flex flex-col border-r border-slate-800/70 bg-slate-950 transition-transform duration-300 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "md:w-16" : "md:w-64"} w-64`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/70 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-md bg-primary-600 flex items-center justify-center shrink-0">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-100 leading-none truncate">MediCare Pro</p>
                <p className="text-xs text-slate-400 mt-1">Smart Healthcare</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-400"
            aria-label="Close sidebar"
          >
            <ChevronsLeft size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    title={item.label}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary-600 text-white shadow-sm"
                          : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                      } ${isCollapsed ? "justify-center" : ""}`
                    }
                  >
                    <Icon size={18} className="shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="hidden md:flex border-t border-slate-800/70 p-3">
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
