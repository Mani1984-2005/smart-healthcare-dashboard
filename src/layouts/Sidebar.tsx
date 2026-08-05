import { NavLink } from "react-router-dom";
import { ROUTES } from "../app/routes.tsx";

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-72 transform border-r border-slate-200 bg-white shadow-soft transition duration-300 dark:border-slate-800 dark:bg-slate-950 ${open ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}`}>
      <div className="flex h-full flex-col justify-between p-5">
        <div>
          <div className="mb-6 px-1">
            <p className="text-[0.65rem] uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Hospital network</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Operations</h2>
          </div>

          <div className="mb-6 rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-700 shadow-card dark:bg-slate-900 dark:text-slate-300">
            <p className="font-semibold">Health center</p>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Centralized overview for hospital workflows, capacity, and on-duty teams.</p>
          </div>

          <nav className="space-y-2">
            {ROUTES.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `block rounded-3xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-cyan-600 text-white shadow-lg"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <p className="font-semibold">Quick start</p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            <li>• Review patient flow</li>
            <li>• Check doctor schedules</li>
            <li>• Monitor bed occupancy</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
