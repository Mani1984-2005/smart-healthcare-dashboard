import { useState, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Toast from "./components/Toast";
import AppShell from "./components/layout/AppShell";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
const HomePage = lazy(() => import("./pages/HomePage"));
const PatientsPage = lazy(() => import("./pages/PatientsPage"));
const LaboratoryPage = lazy(() => import("./pages/LaboratoryPage"));
const DoctorsPage = lazy(() => import("./pages/DoctorsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const StaffPage = lazy(() => import("./pages/StaffPage"));
const MedicinesPage = lazy(() => import("./pages/MedicinesPage"));
const ComplaintsPage = lazy(() => import("./pages/ComplaintsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const PharmacyPage = lazy(() => import("./pages/PharmacyPage"));
const PharmacyInventoryPage = lazy(() => import("./pages/PharmacyInventoryPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const XRaySharingPage = lazy(() => import("./pages/XRaySharingPage"));
const PatientRelationsPage = lazy(() => import("./pages/PatientRelationsPage"));
const EmergencyPage = lazy(() => import("./pages/EmergencyPage"));

import { useToast } from "./hooks/usetoast.jsx";

import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
// Phase 2D: Firebase/Google sign-in was removed from the session path on
// purpose. The backend only verifies Keycloak RS256 or local HS256 JWTs
// (backend/src/services/keycloakAdapter.service.js), so a Firebase ID token
// could never authorise an API call here. See docs/LOCAL_DEV_AUTHENTICATION.md
import {
  resolveBackendRole,
  subscribeSessionExpired,
} from "./services/authToken";
import { canAccessRoute } from "./services/navigationPolicy";

import MedicalLogo from "./components/MedicalLogo";

import { HOSPITAL_CONFIG } from "./data/hospitalConfig";
import { DOCTORS } from "./data/doctors";



function LoginScreen({ darkMode, onLogin }) {
  const navigate = useNavigate();
  const [loginDark, setLoginDark] = useState(false); // Default to Light Mode
  const { lang, setLang, t, languages } = useLanguage();

  const roles = [
    {
      role: "Patient",
      title: t("portal_patient_title"),
      desc: t("portal_patient_desc"),
      photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      badge: "Self Service"
    },
    {
      role: "Doctor",
      title: t("portal_doctor_title"),
      desc: t("portal_doctor_desc"),
      photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
      badge: "Clinical"
    },
    {
      role: "Receptionist",
      title: t("portal_receptionist_title"),
      desc: t("portal_receptionist_desc"),
      photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      badge: "Front Office"
    },
    {
      role: "Admin",
      title: t("portal_admin_title"),
      desc: t("portal_admin_desc"),
      photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
      badge: "Operations"
    },
    {
      role: "Hospital",
      title: t("portal_hospital_title"),
      desc: t("portal_hospital_desc"),
      photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
      badge: "Executive"
    },
  ];

  return (
    <div className={`w-full min-h-screen min-h-[100dvh] relative flex flex-col justify-between p-4 sm:p-6 lg:p-8 transition-colors duration-300 box-border overflow-x-hidden ${
      loginDark ? "bg-slate-950 text-white" : "bg-slate-900 text-slate-900"
    }`}>
      {/* Full-Viewport Hospital Background Image with Subtle Gradient Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: `url(${HOSPITAL_CONFIG.heroBgImage})` }}
      />
      <div className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-300 ${
        loginDark 
          ? "bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/70" 
          : "bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-slate-900/40"
      }`} />

      {/* Top Header */}
      <header className="relative z-20 max-w-7xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/15">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="p-2.5 rounded-2xl bg-cyan-600/30 backdrop-blur-md border border-cyan-400/30 shadow-lg">
            <MedicalLogo className="w-9 h-9 sm:w-11 sm:h-11" />
          </div>
          <div>
            <div className="font-black text-white text-xl sm:text-2xl lg:text-3xl tracking-tight leading-tight">{HOSPITAL_CONFIG.hospitalName}</div>
            <div className="text-xs sm:text-sm text-cyan-300 font-semibold">{t("powered_by")}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              try {
                if (window.history.length > 2) navigate(-1);
                else navigate('/');
              } catch {
                navigate('/');
              }
            }}
            className="px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 shadow-sm transition-all"
            title="Go Back"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <button
            onClick={() => navigate('/hospital-info')}
            className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-cyan-600/40 hover:bg-cyan-600/60 text-white backdrop-blur-md border border-cyan-400/40 shadow-sm transition-all"
            title="View Hospital Information"
          >
            <span>🏥 Hospital Info</span>
          </button>

          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 shadow-sm cursor-pointer outline-none"
            aria-label="Select language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                {l.native} — {l.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Welcome Content & Full-Width Role Cards */}
      <main className="relative z-20 max-w-7xl mx-auto w-full py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-300 text-xs sm:text-sm font-bold uppercase tracking-wider mb-4 border border-cyan-400/30 backdrop-blur-md">
            ✨ Healthcare starts with you
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight mb-5 leading-[1.1]">
            {t("select_role_title")}
          </h1>
          <p className="text-slate-100 text-lg sm:text-xl lg:text-2xl font-medium max-w-2xl mx-auto leading-relaxed">
            {t("select_role_desc")}
          </p>
          {/* Phase 2D: honest labelling of what this login screen actually does */}
          <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 text-amber-300 text-xs sm:text-sm font-bold border border-amber-400/30 backdrop-blur-md">
            ⚠ Local development authentication — demo only, not for real patient operations
          </p>
        </div>

        {/* Premium Translucent Role Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-6 w-full max-w-7xl mx-auto" role="region" aria-label="Role selection options">
          {roles.map(({ role, title, desc, photo, badge }) => (
            <button
              key={role}
              onClick={() => onLogin(role)}
              className={`group text-left rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col justify-between backdrop-blur-xl focus:outline-none focus:ring-4 focus:ring-cyan-500 shadow-2xl hover:-translate-y-2 hover:shadow-3xl ${
                loginDark
                  ? "bg-slate-900/90 border-slate-800 hover:border-cyan-500 text-white"
                  : "bg-white/95 border-white/50 hover:border-cyan-400 text-slate-900"
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
                <img
                  src={photo}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-xs font-bold text-cyan-300 border border-slate-700">
                  {badge}
                </div>
              </div>

              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">{role}</div>
                  <h3 className="font-extrabold text-xl sm:text-2xl leading-snug mb-2.5">{title}</h3>
                  <p className={`text-sm sm:text-base leading-relaxed ${loginDark ? "text-slate-300" : "text-slate-600"}`}>{desc}</p>
                  {!resolveBackendRole(role) && (
                    <p className="mt-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      No backend identity — cannot sign in here
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-sm sm:text-base font-bold text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span>{t("access_portal")}</span>
                  <span>&rarr;</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 max-w-7xl mx-auto w-full pt-6 border-t border-white/15 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>© {new Date().getFullYear()} {HOSPITAL_CONFIG.hospitalName}. {t("all_rights_reserved")}</div>
        <div>{HOSPITAL_CONFIG.accreditation} • {t("secure_workspace")}</div>
      </footer>
    </div>
  );
}

// Phase 2D — UI-only route guard. Cosmetic navigation aid; backend routes
// still run authenticate + requirePermission, so this grants nothing.
function AccessDenied() {
  return (
    <div className="p-10 max-w-2xl mx-auto text-center">
      <div className="text-4xl font-black mb-3">Access denied</div>
      <p className="text-slate-400 leading-relaxed">
        Your backend-issued role does not include the permission this page requires.
        The server would reject the same request anyway — sign in with a different
        portal role if you need this module.
      </p>
    </div>
  );
}

function RequirePermission({ children }) {
  const { permissions, roles } = useAuth();
  const location = useLocation();
  // Role-gated pages (/staff) check the backend-issued ROLES; the rest check
  // permissions. Either way this is cosmetic — the backend re-checks every
  // request with authenticate + requireRole/requirePermission.
  if (!canAccessRoute(location.pathname, permissions, roles)) return <AccessDenied />;
  return children;
}

function AppLayout() {
  const { user, roleLabel, permissions, loading, login, logout } = useAuth();

  const { toasts, addToast, removeToast } = useToast();

  const [darkMode, setDarkMode] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [selectedDoctorFromPage, setSelectedDoctorFromPage] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem("theme", "light");
  }, []);

  // Cached query data belongs to one signed-in user: drop it whenever the
  // session ends, whether explicitly (logout) or by 401 (token invalidated).
  useEffect(() => subscribeSessionExpired(() => queryClient.clear()), []);

  // LOGIN — every path here goes through the backend's dev-token endpoint.
  // Nothing fabricates a user, a role or a token, and every failure leaves the
  // user logged out with a visible error.
  const handleLogin = async (portalRole) => {
    try {
      const identity = await login(portalRole);
      queryClient.clear();
      addToast(
        "Signed in (local development)",
        `Authenticated as ${identity?.user?.full_name || identity?.user?.email || portalRole}.`,
        "success"
      );
      navigate("/dashboard");
    } catch (err) {
      // Unsupported portal card, dev tokens disabled, wrong environment, or a
      // backend that is not running — all reported, none of them "logged in".
      addToast("Sign-in failed", err?.message || "Could not obtain a development token.", "error");
    }
  };

  const handleLogout = () => {
    logout();
    queryClient.clear();
    addToast("Logged out", "You have been signed out.", "info");
    navigate("/");
  };

  const formatCurrentPage = (path) => {
    if (path === "/" || path === "") return "Home";
    const cleaned = path.replace(/^\//, "").split("?")[0];
    if (
      cleaned === "patient-relations" ||
      cleaned === "reports" ||
      cleaned === "complaints" ||
      cleaned === "contact"
    ) {
      return "Patient Relations";
    }
    if (
      cleaned === "pharmacy" ||
      cleaned === "medicines" ||
      cleaned === "inventory" ||
      cleaned === "pharmacy-inventory" ||
      cleaned === "dispensing" ||
      cleaned === "prescriptions"
    ) {
      return "Pharmacy";
    }
    if (
      cleaned === "laboratory" ||
      cleaned === "x-ray" ||
      cleaned === "xray" ||
      cleaned === "specimens" ||
      cleaned === "specimen-intake" ||
      cleaned === "specimen"
    ) {
      return "Laboratory";
    }
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };
  const page = formatCurrentPage(location.pathname);

  const handleNavigatePage = (p) => {
    if (p === "Home") navigate("/");
    else if (p === "Patient Relations") navigate("/patient-relations");
    else navigate(`/${p.toLowerCase().replace(/\s+/g, "-")}`);
  };

  const pageProps = {
    darkMode,
    // Backend-issued role label (derived from /api/auth/me), never a card choice
    userRole: roleLabel,
    user: user ? { name: user.name || user.email, role: roleLabel, email: user.email } : null,
    permissions,
    appointments,
    setAppointments,
    addToast,
    preselectedDoctor: selectedDoctorFromPage,
    setSelectedDoctorFromPage,
    clearPreselectedDoctor: () => setSelectedDoctorFromPage(null),
    setPage: handleNavigatePage,
  };

  // ⛔ LOADING
  if (loading) {
    return <div className="p-10 text-white">Loading...</div>;
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <Toast toasts={toasts} removeToast={removeToast} />
      <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading module...</div>}>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginScreen darkMode={darkMode} onLogin={handleLogin} />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginScreen darkMode={darkMode} onLogin={handleLogin} />} />
          <Route path="/hospital-info" element={<HomePage {...pageProps} />} />
          <Route path="/about" element={<HomePage {...pageProps} />} />

          {/* Protected AppShell Routes */}
          <Route path="/*" element={
            user ? (
              <AppShell
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                user={{
                  name: user?.name || user?.email,
                  role: roleLabel,
                  email: user?.email,
                }}
                onLogout={handleLogout}
              >
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage {...pageProps} />} />
                  <Route path="/patients" element={<RequirePermission><PatientsPage darkMode={darkMode} /></RequirePermission>} />
                  <Route path="/doctors" element={<DoctorsPage {...pageProps} />} />

                  {/* Unified Pharmacy Module with backward-compatible deep links */}
                  <Route path="/pharmacy" element={<RequirePermission><PharmacyPage darkMode={darkMode} /></RequirePermission>} />
                  <Route path="/medicines" element={<RequirePermission><PharmacyPage darkMode={darkMode} initialTab="medicines" /></RequirePermission>} />
                  <Route path="/inventory" element={<RequirePermission><PharmacyPage darkMode={darkMode} initialTab="inventory" /></RequirePermission>} />
                  <Route path="/pharmacy-inventory" element={<RequirePermission><PharmacyPage darkMode={darkMode} initialTab="inventory" /></RequirePermission>} />
                  <Route path="/dispensing" element={<RequirePermission><PharmacyPage darkMode={darkMode} initialTab="dispensing" /></RequirePermission>} />
                  <Route path="/prescriptions" element={<RequirePermission><PharmacyPage darkMode={darkMode} initialTab="dispensing" /></RequirePermission>} />

                  {/* Unified Laboratory Module with X-Ray and Specimen Intake integration */}
                  <Route path="/laboratory" element={<RequirePermission><LaboratoryPage darkMode={darkMode} /></RequirePermission>} />
                  <Route path="/x-ray" element={<RequirePermission><LaboratoryPage darkMode={darkMode} initialTab="xray" /></RequirePermission>} />
                  <Route path="/xray" element={<RequirePermission><LaboratoryPage darkMode={darkMode} initialTab="xray" /></RequirePermission>} />
                  <Route path="/specimens" element={<RequirePermission><LaboratoryPage darkMode={darkMode} initialTab="specimens" /></RequirePermission>} />
                  <Route path="/specimen-intake" element={<RequirePermission><LaboratoryPage darkMode={darkMode} initialTab="specimens" /></RequirePermission>} />
                  <Route path="/specimen" element={<RequirePermission><LaboratoryPage darkMode={darkMode} initialTab="specimens" /></RequirePermission>} />
                  <Route path="/emergency" element={<EmergencyPage darkMode={darkMode} />} />

                  <Route path="/billing" element={<RequirePermission><BillingPage /></RequirePermission>} />
                  <Route path="/staff" element={<RequirePermission><StaffPage darkMode={darkMode} /></RequirePermission>} />

                  {/* Unified Patient Relations Module with legacy deep links */}
                  <Route
                    path="/patient-relations"
                    element={<PatientRelationsPage darkMode={darkMode} appointments={appointments} addToast={addToast} />}
                  />
                  <Route
                    path="/reports"
                    element={<PatientRelationsPage darkMode={darkMode} appointments={appointments} addToast={addToast} initialTab="reports" />}
                  />
                  <Route
                    path="/complaints"
                    element={<PatientRelationsPage darkMode={darkMode} appointments={appointments} addToast={addToast} initialTab="complaints" />}
                  />
                  <Route
                    path="/contact"
                    element={<PatientRelationsPage darkMode={darkMode} appointments={appointments} addToast={addToast} initialTab="contact" />}
                  />
                  <Route
                    path="/settings"
                    element={<PatientRelationsPage darkMode={darkMode} appointments={appointments} addToast={addToast} initialTab="settings" />}
                  />

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppShell>
            ) : (
              <Navigate to="/login" replace />
            )
          } />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}