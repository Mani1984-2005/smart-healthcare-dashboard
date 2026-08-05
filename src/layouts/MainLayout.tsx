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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar onMenuToggle={() => setSidebarOpen((open) => !open)} />
      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Workspace</p>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{breadcrumb.join(" / ")}</h1>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="hidden sm:inline">Enterprise Healthcare Platform</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Ready</span>
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
