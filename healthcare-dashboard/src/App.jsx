import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import PatientsPage from "./pages/PatientsPage";
import LaboratoryPage from "./pages/LaboratoryPage";
import DoctorsPage from "./pages/DoctorsPage";
import DashboardPage from "./pages/DashboardPage";
import StaffPage from "./pages/StaffPage";
import MedicinesPage from "./pages/MedicinesPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import ContactPage from "./pages/ContactPage";
import BillingPage from "./pages/BillingPage";
import PharmacyPage from "./pages/PharmacyPage";
import PharmacyInventoryPage from "./pages/PharmacyInventoryPage";
import { useToast } from "./hooks/usetoast.jsx";
import Toast from "./components/Toast";
import ReportsPage from "./pages/ReportsPage";
import XRaySharingPage from "./pages/XRaySharingPage";

function LoginScreen({ darkMode, onLogin }) {
  const roles = ["Patient", "Doctor", "Receptionist", "Admin", "Hospital"];
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-all ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"}`}>
      <h1 className="text-3xl font-bold">MediCare Pro</h1>
      <p className="mt-3 text-slate-500">Choose your login role</p>
      <div className="mt-8 flex flex-col gap-3 max-w-sm mx-auto">
        {roles.map((role) => (
          <button key={role} onClick={() => onLogin(role)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-semibold">
            Login as {role}
          </button>
        ))}
      </div>
    </div>
  );
}

function AppLayout() {
  const { toasts, addToast, removeToast } = useToast();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");
  const [userRole, setUserRole] = useState(() => localStorage.getItem("role") || "Admin");
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctorFromPage, setSelectedDoctorFromPage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { localStorage.setItem("theme", darkMode ? "dark" : "light"); }, [darkMode]);
  useEffect(() => { localStorage.setItem("role", userRole); }, [userRole]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setUserRole("Admin");
    navigate("/");
  };

  const currentPage = location.pathname.replace("/", "") || "Home";
  const page = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

  const pageProps = {
    darkMode, userRole, appointments, setAppointments, addToast,
    preselectedDoctor: selectedDoctorFromPage,
    clearPreselectedDoctor: () => setSelectedDoctorFromPage(null),
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <Navbar page={page} setPage={(p) => navigate(p === "Home" ? "/" : `/${p.toLowerCase()}`)}
        darkMode={darkMode} setDarkMode={setDarkMode}
        user={{ name: "Mani", role: userRole }}
        onLogout={handleLogout} />
      <Toast toasts={toasts} removeToast={removeToast} />

      <Routes>
        <Route path="/" element={<HomePage {...pageProps} setPage={(p) => navigate(p === "Home" ? "/" : `/${p.toLowerCase()}`)} />} />
        <Route path="/dashboard" element={<DashboardPage {...pageProps} />} />
        <Route path="/patients" element={<PatientsPage darkMode={darkMode} />} />
        <Route path="/doctors" element={<DoctorsPage {...pageProps} setSelectedDoctorFromPage={setSelectedDoctorFromPage} setPage={(p) => navigate(p === "Home" ? "/" : `/${p.toLowerCase()}`)} />} />
        <Route path="/medicines" element={<MedicinesPage darkMode={darkMode} />} />
        <Route path="/pharmacy" element={<PharmacyPage darkMode={darkMode} />} />
        <Route path="/inventory" element={<PharmacyInventoryPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/laboratory" element={<LaboratoryPage />} />
        <Route path="/staff" element={<StaffPage darkMode={darkMode} />} />
        <Route path="/complaints" element={<ComplaintsPage darkMode={darkMode} addToast={addToast} />} />
        <Route path="/x-ray" element={<XRaySharingPage darkMode={darkMode} />} />
        <Route path="/contact" element={<ContactPage darkMode={darkMode} />} />
        <Route path="/reports" element={<ReportsPage darkMode={darkMode} appointments={appointments} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function AppRouter() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("loggedIn"));
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");
  const navigate = useNavigate();

  const handleLogin = (role) => {
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("role", role);
    setIsLoggedIn(true);
    navigate(role === "Patient" ? "/" : "/dashboard");
  };

  if (!isLoggedIn) {
    return <LoginScreen darkMode={darkMode} onLogin={handleLogin} />;
  }

  return <AppLayout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
