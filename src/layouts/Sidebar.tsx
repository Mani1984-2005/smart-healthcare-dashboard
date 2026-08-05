import { NavLink } from "react-router-dom";
import { ROUTES } from "../app/routes.tsx";

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-20 w-72 transform border-r border-slate-200 bg-white shadow-lg transition duration-300 dark:border-slate-800 dark:bg-slate-950 ${open ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}`}>
      <div className="flex h-full flex-col justify-between p-4">
        <div>
          <div className="mb-6 px-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Navigation</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Hospital Operations</h2>
          </div>

          <nav className="space-y-1">
            {ROUTES.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-cyan-600 text-white shadow"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="rounded-3xl bg-slate-100 p-4 text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300">
          <p className="font-semibold">Enterprise workflow</p>
          <p className="mt-2 text-xs">Support multi-hospital operations, role-based access, and secure patient workflows.</p>
        </div>
      </div>
    </aside>
  );
}
