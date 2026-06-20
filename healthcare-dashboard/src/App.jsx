import { useState, useEffect } from "react";
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
import { useToast } from "./hooks/usetoast";
import Toast from "./components/Toast";
import ReportsPage from "./pages/ReportsPage";

export default function App() {
  const { toasts, addToast, removeToast } = useToast();
  const [page, setPage] = useState("Home");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") !== "light"
  );
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctorFromPage, setSelectedDoctorFromPage] = useState(null);

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div>
      <div style={{ padding: "10px", background: "yellow" }}>
        Current Page: {page}
      </div>

      <Navbar
  page={page}
  setPage={setPage}
  darkMode={darkMode}
  setDarkMode={setDarkMode}
  user={{ name: "Mani", role: "Admin" }}
  onLogout={() => {}}
  canManage={true}
/>

<Toast
  toasts={toasts}
  removeToast={removeToast}
/>

      {page === "Home" && <HomePage darkMode={darkMode} setPage={setPage} />}

      {page === "Dashboard" && (
        <DashboardPage
          darkMode={darkMode}
          appointments={appointments}
          setAppointments={setAppointments}
          addToast={addToast}
          preselectedDoctor={selectedDoctorFromPage}
          clearPreselectedDoctor={() => setSelectedDoctorFromPage(null)}
        />
      )}

      {page === "Patients" && <PatientsPage darkMode={darkMode} />}

      {page === "Doctors" && (
        <DoctorsPage
          darkMode={darkMode}
          setPage={setPage}
          setSelectedDoctorFromPage={setSelectedDoctorFromPage}
        />
      )}

      {page === "Medicines" && <MedicinesPage darkMode={darkMode} />}

      {page === "Pharmacy" && <PharmacyPage darkMode={darkMode} />}

      {page === "Billing" && <BillingPage darkMode={darkMode} />}

      {page === "Laboratory" && (
  <div>
    <h1>APP REACHED LAB PAGE</h1>
    <LaboratoryPage />
  </div>
)}

      {page === "Staff" && <StaffPage darkMode={darkMode} />}

      {page === "Complaints" && (
        <ComplaintsPage darkMode={darkMode} addToast={addToast} />
      )}

      {page === "Contact" && <ContactPage darkMode={darkMode} />}
     {page === "Reports" && (
  <ReportsPage
    darkMode={darkMode}
    appointments={appointments}
  />
)}
    </div>
  );
}