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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),transparent_20%),linear-gradient(180deg,#f8fbff_0%,#f3f7fb_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),transparent_20%),linear-gradient(180deg,#020817_0%,#0f172a_100%)] dark:text-slate-100">
      <Navbar onMenuToggle={() => setSidebarOpen((open) => !open)} />
      <div className="flex min-h-[calc(100vh-80px)]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:ml-72 lg:p-8">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_16px_35px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/75">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">Operational view</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{breadcrumb.join(" / ")}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Network online</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">Secure session</span>
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
