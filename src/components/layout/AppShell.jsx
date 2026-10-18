// FILE PATH: src/components/layout/AppShell.jsx
// CREATE this new file.
//
// Top-level layout wrapper: Sidebar (left) + Topbar (top) + routed page
// content (right/below). This is what replaces standalone <Navbar />
// at the App.jsx level.
//
// HOW TO WIRE THIS IN (App.jsx):
//
//   import AppShell from "./components/layout/AppShell";
//
//   <BrowserRouter>
//     <AppShell>
//       <Routes>
//         <Route path="/dashboard" element={<DashboardPage />} />
//         ...all your existing routes, completely unchanged...
//       </Routes>
//     </AppShell>
//   </BrowserRouter>
//
// This is a MINIMAL change to App.jsx: wrap your existing <Routes> block
// in <AppShell>...</AppShell>. No routes are added, removed, or modified.
// Your Home/Login pages (which likely shouldn't show the sidebar) can be
// excluded — see the `noShellRoutes` note at the bottom of this file.

import { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { HOSPITAL_CONFIG } from "../../data/hospitalConfig";

// Routes that should render WITHOUT the sidebar/topbar shell
// (e.g. landing page, login page — full-bleed layouts).
// Add/remove paths here as needed; does not affect routing itself.
const NO_SHELL_ROUTES = ["/", "/login", "/hospital-info", "/about"];

// Optional: map route paths to a friendly page title shown in the Topbar.
// Falls back to no title if a route isn't listed — safe to leave incomplete.
const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/doctors": "Doctors",
  "/staff": "Staff",
  "/pharmacy": "Pharmacy",
  "/pharmacy-inventory": "Pharmacy",
  "/medicines": "Pharmacy",
  "/laboratory": "Laboratory",
  "/billing": "Billing",
  "/receipts": "Patient Receipts",
  "/patient-relations": "Patient Relations",
  "/reports": "Patient Relations",
  "/xray": "Laboratory",
  "/x-ray": "Laboratory",
  "/complaints": "Patient Relations",
  "/contact": "Patient Relations",
  "/settings": "Settings",
};

export default function AppShell({ children, darkMode, setDarkMode, user, onLogout }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const skipShell = NO_SHELL_ROUTES.includes(location.pathname);

  if (skipShell) {
    // Render children with no sidebar/topbar — e.g. Home/Login full-bleed pages
    return <>{children}</>;
  }

  const pageTitle = PAGE_TITLES[location.pathname] || "MediCare Pro";

  return (
    <div className="relative min-h-screen w-full transition-colors duration-300 bg-slate-100/90 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Full-Page Hospital Background Image — Fixed and Continuous Across Entire Document */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 pointer-events-none opacity-20"
        style={{ backgroundImage: `url(${HOSPITAL_CONFIG.heroBgImage})` }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-300 bg-slate-100/75 dark:bg-slate-950/80 backdrop-blur-[2px]" />

      <div className="relative z-10 flex min-h-screen w-full">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar
            onOpenMobileSidebar={() => setMobileOpen(true)}
            pageTitle={pageTitle}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            user={user}
            onLogout={onLogout}
          />
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}