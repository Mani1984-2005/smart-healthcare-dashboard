// src/App.jsx
import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { getLS, setLS } from "./utils/localStorage";
import { useToast } from "./hooks/useToast";

import Navbar from "./components/Navbar";
import Toast from "./components/Toast";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import DoctorsPage from "./pages/DoctorsPage";
import StaffPage from "./pages/StaffPage";
import MedicinesPage from "./pages/MedicinesPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import ContactPage from "./pages/ContactPage";

export default function App() {
  const [user, setUser] = useState(() => getLS("healthcare_user", null));
  const [role, setRole] = useState("Patient");
  const [page, setPage] = useState("Home");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");
  const [appointments, setAppointments] = useState(() => getLS("appointments", []));
  const [selectedDoctorFromPage, setSelectedDoctorFromPage] = useState(null);

  const { toasts, addToast, removeToast } = useToast();

  // Persist state to localStorage
  useEffect(() => { setLS("appointments", appointments); }, [appointments]);
  useEffect(() => { setLS("healthcare_user", user); }, [user]);
  useEffect(() => { localStorage.setItem("theme", darkMode ? "dark" : "light"); }, [darkMode]);

  const navigateTo = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch { /* ignore */ }
    setUser(null);
    setPage("Home");
    addToast("Logged out", "You have been signed out.", "info");
  };

  const clearPreselectedDoctor = () => setSelectedDoctorFromPage(null);
  const canManage = user?.role === "Admin" || user?.role === "Hospital";

  // Show login if not authenticated
  if (!user) {
    return (
      <>
        <Toast toasts={toasts} removeToast={removeToast} />
        <LoginPage
          darkMode={darkMode}
          role={role}
          setRole={setRole}
          onLogin={setUser}
          addToast={addToast}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"}`}>
      <Toast toasts={toasts} removeToast={removeToast} />
      <Navbar
        page={page}
        setPage={navigateTo}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
        onLogout={handleLogout}
        canManage={canManage}
      />

      {page === "Home" && (
        <HomePage darkMode={darkMode} setPage={navigateTo} />
      )}
      {page === "Dashboard" && (
        <DashboardPage
          darkMode={darkMode}
          appointments={appointments}
          setAppointments={setAppointments}
          addToast={addToast}
          preselectedDoctor={selectedDoctorFromPage}
          clearPreselectedDoctor={clearPreselectedDoctor}
        />
      )}
      {page === "Doctors" && (
        <DoctorsPage
          darkMode={darkMode}
          setPage={navigateTo}
          setSelectedDoctorFromPage={setSelectedDoctorFromPage}
        />
      )}
      {page === "Medicines" && canManage && (
        <MedicinesPage darkMode={darkMode} />
      )}
      {page === "Staff" && canManage && (
        <StaffPage darkMode={darkMode} />
      )}
      {page === "Complaints" && canManage && (
        <ComplaintsPage darkMode={darkMode} addToast={addToast} />
      )}
      {page === "Contact" && (
        <ContactPage darkMode={darkMode} />
      )}
    </div>
  );
}






