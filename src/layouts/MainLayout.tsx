import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar.tsx";
import Sidebar from "./Sidebar.tsx";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const breadcrumb = useMemo(() => {
    const path = location.pathname.replace(/^\//, "");
    if (!path) return ["Dashboard"];
    return path.split("/").map((segment) => segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar onMenuToggle={() => setSidebarOpen((open) => !open)} />
      <div className="flex min-h-[calc(100vh-80px)]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 rounded-[1.5rem] border border-slate-200 bg-white/95 p-6 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Overview</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{breadcrumb.join(" / ")}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">Network status: Online</span>
                <span className="rounded-full bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200">Data secure</span>
                <span className="rounded-full bg-sky-100 px-3 py-2 text-sm text-sky-700 dark:bg-sky-900/20 dark:text-sky-200">Enterprise edition</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
