// APP SHELL — Premium cinematic layout wrapper
// ==============================================
// Top-level layout: Sidebar (left) + Topbar (top) + routed page content (right/below).
// Replaces standalone Navbar at the App.jsx level.
// Provides consistent design language across all application pages.
//
// HOW TO WIRE THIS IN (App.jsx):
//
//   import AppShell from "./components/layout/AppShell";
//   import Navbar from "./components/layout/Navbar"; // Only for login/full-bleed pages
//
//   function App() {
//     return (
//       <BrowserRouter>
//         <AppShell>
//           <Routes>
//             <Route path="/" element={<HomePage {...pageProps} />} />
//             <Route path="/login" element={<LoginPage {...pageProps} />} />
//             <Route path="/dashboard" element={<DashboardPage {...pageProps} />} />
//             ...all existing routes unchanged...
//           </Routes>
//         </AppShell>
//       </BrowserRouter>
//     );
//   }
//
// This wraps your existing <Routes> block in <AppShell>...</AppShell>.
// Routes in NO_SHELL_ROUTES render children full-bleed (no sidebar/topbar).
//

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";

// Routes that should render WITHOUT the sidebar/topbar shell
// (e.g. landing page, login page — full-bleed layouts).
const NO_SHELL_ROUTES = ["/", "/login", "/register", "/forgot-password"];

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
  "/x-ray": "Laboratory",
  "/xray": "Laboratory",
  "/billing": "Billing",
  "/invoices": "Billing",
  "/patient-relations": "Patient Relations",
  "/reports": "Patient Relations",
  "/complaints": "Patient Relations",
  "/contact": "Patient Relations",
  "/settings": "Settings",
  "/analytics": "Analytics",
};

export default function AppShell({ children }) {
  const location = useLocation();
  const { user } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Initialize dark mode state from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setDarkMode(savedTheme !== "light");
    }
  }, [setDarkMode]);

  const skipShell = NO_SHELL_ROUTES.includes(location.pathname);

  if (skipShell) {
    // Render children with no sidebar/topbar — e.g. Landing/Login full-bleed pages
    return <>{children}</>;
  }

  // Determine if we're in dark mode for styling
  const isDark = darkMode || localStorage.getItem("theme") === "dark";

  const pageTitle = PAGE_TITLES[location.pathname] || "";

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-dark-background" : "bg-background"}
        transition-colors duration-500`}
      >
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        darkMode={isDark}
      />
      <div className={`flex-1 min-w-0 ${collapsed ? "md:pl-16" : "md:pl-64"} transition-[padding] duration-300`}>
        <Topbar
          pageTitle={pageTitle}
          darkMode={isDark}
          onMenuToggle={() => setMobileOpen((value) => !value)}
        />
        <main className="min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

// Export hook for dark mode
export const useAppShellDarkMode = () => {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") !== "light"
  );

  const toggle = () => {
    setDarkMode((v) => !v);
    localStorage.setItem("theme", darkMode ? "light" : "dark");
  };

  return { darkMode, setDarkMode, toggle };
};