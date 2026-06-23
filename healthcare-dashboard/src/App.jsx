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
import { useToast } from "./hooks/usetoast.jsx";
import Toast from "./components/Toast";
import ReportsPage from "./pages/ReportsPage";
import XRaySharingPage from "./pages/XRaySharingPage";
export default function App() {
  const { toasts, addToast, removeToast } = useToast();
  const [page, setPage] = useState("Home");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") !== "light"
  );
   const [userRole, setUserRole] = useState("Admin");
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctorFromPage, setSelectedDoctorFromPage] = useState(null);
   const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);
if (!isLoggedIn) {
  const roles = ["Patient", "Doctor", "Receptionist", "Admin", "Hospital"];

  return (
    <div className={darkMode ? "bg-slate-950 text-white min-h-screen" : "bg-slate-100 text-slate-900 min-h-screen"}>
      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold">🏥 MediCare Pro</h1>
        <p className="mt-3 text-slate-500">Choose your login role</p>

        <div className="mt-8 flex flex-col gap-3 max-w-sm mx-auto">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => {
                setUserRole(role);
                setIsLoggedIn(true);
                setPage(role === "Patient" ? "Home" : "Dashboard");
              }}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Login as {role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}return (
    <div>
      <div style={{ padding: "10px", background: "yellow" }}>
        Current Page: {page}
      </div>
        <Navbar
  page={page}
  setPage={setPage}
  darkMode={darkMode}
  setDarkMode={setDarkMode}
  user={{ name: "Mani", role: userRole }}
  onLogout={() => {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setIsLoggedIn(false);
    setPage("Home");
  }}
/>
<Toast
  toasts={toasts}
  removeToast={removeToast}
/>

      {page === "Home" && <HomePage darkMode={darkMode} setPage={setPage} />}

      {page === "Dashboard" && (
       <DashboardPage
  darkMode={darkMode}
  userRole={userRole}
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
    <LaboratoryPage />
  </div>
)}

      {page === "Staff" && <StaffPage darkMode={darkMode} />}

      {page === "Complaints" && (
        <ComplaintsPage darkMode={darkMode} addToast={addToast} />
      )}
        {page === "X-Ray" && <XRaySharingPage darkMode={darkMode} />}
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