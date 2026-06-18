import { useState,useEffect } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import PatientsPage from "./pages/PatientsPage";
import DoctorsPage from "./pages/DoctorsPage";
import DashboardPage from "./pages/DashboardPage";
import StaffPage from "./pages/StaffPage";
import MedicinesPage from "./pages/MedicinesPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import ContactPage from "./pages/ContactPage";
import { useToast } from "./hooks/useToast";
import Toast from "./components/Toast";

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
      <Navbar
        page={page}
        setPage={setPage}
        darkMode={false}
        setDarkMode={() => {}}
        user={{ name: "Mani", role: "Admin" }}
        onLogout={() => {}}
        canManage={true}
      /><Toast toasts={toasts} removeToast={removeToast} />

      {page === "Home" && <HomePage darkMode={false} setPage={setPage} />}

      {page === "Dashboard" && (
  <DashboardPage
    darkMode={darkMode}
    appointments={appointments}
    setAppointments={setAppointments}
   addToast={addToast}
    preselectedDoctor={selectedDoctorFromPage}
    clearPreselectedDoctor={() =>
      setSelectedDoctorFromPage(null)
    }
  />
)}

      {page === "Patients" && <PatientsPage darkMode={false} />}

      {page === "Doctors" && (
  <DoctorsPage
    darkMode={darkMode}
    setPage={setPage}
    setSelectedDoctorFromPage={setSelectedDoctorFromPage}
  />
)}{page === "Staff" && (
  <StaffPage darkMode={false} />
)}
{page === "Medicines" && (
  <MedicinesPage darkMode={false} />
)}
{page === "Complaints" && (
  <ComplaintsPage darkMode={false} addToast={() => {}} />
)}
{page === "Contact" && (
  <ContactPage darkMode={false} />
)}
    </div>
  );
}