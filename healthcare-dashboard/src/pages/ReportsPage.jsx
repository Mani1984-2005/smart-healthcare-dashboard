import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";

export default function ReportsPage({ darkMode, appointments = [] }) {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [billing, setBilling] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [medicines, setMedicines] = useState([]);
useEffect(() => {
  setPatients(JSON.parse(localStorage.getItem("patients")) || []);
  setDoctors(JSON.parse(localStorage.getItem("doctors")) || []);
  setStaff(JSON.parse(localStorage.getItem("staff")) || []);
  setBilling(JSON.parse(localStorage.getItem("billing_invoices")) || []);
  setLabTests(JSON.parse(localStorage.getItem("lab_tests")) || []);
  setMedicines(JSON.parse(localStorage.getItem("pharmacy_medicines")) || []);
}, []);

  const pending = appointments.filter((a) => a.status === "Pending").length;
  const confirmed = appointments.filter((a) => a.status === "Confirmed").length;
  const completed = appointments.filter((a) => a.status === "Completed").length;
  const cancelled = appointments.filter((a) => a.status === "Cancelled").length;

const reports = [
  { title: "Total Appointments", value: appointments.length, icon: "📅" },
  { title: "Pending", value: pending, icon: "⏳" },
  { title: "Confirmed", value: confirmed, icon: "✅" },
  { title: "Completed", value: completed, icon: "🏁" },
  { title: "Cancelled", value: cancelled, icon: "❌" },

  { title: "Patients", value: patients.length, icon: "🧑‍⚕️" },
  { title: "Doctors", value: doctors.length, icon: "👨‍⚕️" },
  { title: "Staff", value: staff.length, icon: "👥" },

  { title: "Invoices", value: billing.length, icon: "💳" },
  { title: "Lab Tests", value: labTests.length, icon: "🔬" },
  { title: "Medicines", value: medicines.length, icon: "💊" },
];
    function downloadReportPDF() {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("MediCare Pro - Hospital Report", 20, 20);

  doc.text(`Patients: ${patients.length}`, 20, 50);
  doc.text(`Doctors: ${doctors.length}`, 20, 60);
  doc.text(`Staff: ${staff.length}`, 20, 70);
  doc.text(`Invoices: ${billing.length}`, 20, 80);
  doc.text(`Lab Tests: ${labTests.length}`, 20, 90);
  doc.text(`Medicines: ${medicines.length}`, 20, 100);
  doc.text(`Appointments: ${appointments.length}`, 20, 110);

  doc.save("hospital_report.pdf");
}
  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <div className="flex justify-between items-center">
  <div>
    <h1 className="text-2xl font-bold">Reports</h1>
    <p className="text-slate-500 mt-2">
      Hospital performance and appointment analytics.
    </p>
  </div>

  <button
    onClick={downloadReportPDF}
    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
  >
    📄 Export Report PDF
  </button>
</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        {reports.map((item) => (
          <div key={item.title} className={`p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
            <div className="text-3xl">{item.icon}</div>
            <p className="text-sm text-slate-500 mt-3">{item.title}</p>
            <h2 className="text-3xl font-bold mt-1">{item.value}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}