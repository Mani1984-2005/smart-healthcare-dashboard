import { useState, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "./components/Navbar";
import Toast from "./components/Toast";
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

import { useToast } from "./hooks/usetoast.jsx";

import { useAuth } from "./context/AuthContext";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

function LoginScreen({ darkMode, onLogin }) {
  const roles = ["Patient", "Doctor", "Receptionist", "Admin", "Hospital"];

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 transition-all ${
        darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"
      }`}
    >
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl border ${
        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      } text-center`}>
        <div className="text-4xl mb-2">🏥</div>
        <h1 className="text-3xl font-bold">MediCare Pro</h1>
        <p className="mt-2 text-sm text-slate-500">Smart Healthcare Management System</p>
        <p className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Role to Enter</p>

        <div className="mt-4 flex flex-col gap-2.5">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => onLogin(role)}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow"
            >
              Continue as {role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const { user, logout, loginAsGuest, loading } = useAuth();

  const { toasts, addToast, removeToast } = useToast();

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") !== "light"
  );

  const [userRole, setUserRole] = useState(
    () => localStorage.getItem("role") || "Admin"
  );

  const [appointments, setAppointments] = useState([]);
  const [selectedDoctorFromPage, setSelectedDoctorFromPage] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("role", userRole);
  }, [userRole]);

  // ✅ LOGIN FUNCTION WITH GRACEFUL FALLBACK FOR PREVIEW IFRAME
  const handleLogin = async (role) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      localStorage.setItem("role", role);
      setUserRole(role);

      addToast(
        "Login successful",
        `Welcome ${result.user?.displayName || role}`,
        "success"
      );
    } catch (err) {
      console.warn("Google popup sign-in blocked or unavailable in iframe, using role session:", err);
      loginAsGuest(role);
      localStorage.setItem("role", role);
      setUserRole(role);
      addToast(
        "Logged in as " + role,
        "Welcome to MediCare Pro",
        "success"
      );
    }
  };

  // ✅ LOGOUT FIXED
  const handleLogout = async () => {
    await logout();
    addToast("Logged out", "You have been signed out.", "info");
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
    if (cleaned === "laboratory" || cleaned === "x-ray" || cleaned === "xray") {
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
    userRole,
    appointments,
    setAppointments,
    addToast,
    preselectedDoctor: selectedDoctorFromPage,
    clearPreselectedDoctor: () => setSelectedDoctorFromPage(null),
  };

  // ⛔ LOADING
  if (loading) {
    return <div className="p-10 text-white">Loading...</div>;
  }

  // ⛔ NOT LOGGED IN
  if (!user) {
    return <LoginScreen darkMode={darkMode} onLogin={handleLogin} />;
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <Navbar
        page={page}
        setPage={handleNavigatePage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={{
          name: user?.name || user?.email || "Mani",
          role: userRole,
        }}
        onLogout={handleLogout}
      />

      <Toast toasts={toasts} removeToast={removeToast} />

      <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading module...</div>}>
        <Routes>
          <Route path="/" element={<HomePage {...pageProps} />} />
          <Route path="/dashboard" element={<DashboardPage {...pageProps} />} />
          <Route path="/patients" element={<PatientsPage darkMode={darkMode} />} />
          <Route path="/doctors" element={<DoctorsPage {...pageProps} />} />

          {/* Unified Pharmacy Module with backward-compatible deep links */}
          <Route path="/pharmacy" element={<PharmacyPage darkMode={darkMode} />} />
          <Route path="/medicines" element={<PharmacyPage darkMode={darkMode} initialTab="medicines" />} />
          <Route path="/inventory" element={<PharmacyPage darkMode={darkMode} initialTab="inventory" />} />
          <Route path="/pharmacy-inventory" element={<PharmacyPage darkMode={darkMode} initialTab="inventory" />} />
          <Route path="/dispensing" element={<PharmacyPage darkMode={darkMode} initialTab="dispensing" />} />
          <Route path="/prescriptions" element={<PharmacyPage darkMode={darkMode} initialTab="dispensing" />} />

          {/* Unified Laboratory Module with X-Ray integration */}
          <Route path="/laboratory" element={<LaboratoryPage darkMode={darkMode} />} />
          <Route path="/x-ray" element={<LaboratoryPage darkMode={darkMode} initialTab="xray" />} />
          <Route path="/xray" element={<LaboratoryPage darkMode={darkMode} initialTab="xray" />} />

          <Route path="/billing" element={<BillingPage />} />
          <Route path="/staff" element={<StaffPage darkMode={darkMode} />} />

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

          <Route path="*" element={<Navigate to="/" replace />} />
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