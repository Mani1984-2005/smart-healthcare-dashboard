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

// Routes that should render WITHOUT the sidebar/topbar shell
// (e.g. landing page, login page — full-bleed layouts).
// Add/remove paths here as needed; does not affect routing itself.
const NO_SHELL_ROUTES = ["/", "/login"];

// Optional: map route paths to a friendly page title shown in the Topbar.
// Falls back to no title if a route isn't listed — safe to leave incomplete.
const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/doctors": "Doctors",
  "/staff": "Staff",
  "/pharmacy": "Pharmacy",
  "/pharmacy-inventory": "Pharmacy Inventory",
  "/medicines": "Medicines",
  "/laboratory": "Laboratory",
  "/billing": "Billing",
  "/receipts": "Patient Receipts",
  "/reports": "Reports & Analytics",
  "/xray": "X-Ray & Imaging",
  "/complaints": "Complaints",
  "/contact": "Contact",
  "/settings": "Settings",
};

export default function AppShell({ children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const skipShell = NO_SHELL_ROUTES.includes(location.pathname);

  if (skipShell) {
    // Render children with no sidebar/topbar — e.g. Home/Login full-bleed pages
    return <>{children}</>;
  }

  const pageTitle = PAGE_TITLES[location.pathname];

  return (
    <div className="flex min-h-screen bg-neutral-50">
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
        />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}