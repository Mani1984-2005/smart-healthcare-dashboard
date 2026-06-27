// src/pages/PatientsPage.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import jsPDF from "jspdf";

// ─── Initial Seed Data ────────────────────────────────────────────────────────
const initialPatients = [
  {
    id: "PAT-1001",
    name: "Ravi Kumar",
    age: "32",
    gender: "Male",
    bloodGroup: "O+",
    phone: "9876543210",
    disease: "Fever",
    address: "Davangere",
    status: "Waiting",
    registeredDate: "2026-06-15",
    photo: "",
    timeline: [
      { id: 1, date: "2026-06-15", type: "Registration", title: "Patient Registered", details: "Patient record created in MediCare Pro." },
      { id: 2, date: "2026-06-16", type: "Consultation", title: "Doctor Consultation", details: "Visited for fever and general checkup." },
    ],
  },
];

// ─── Hospital-wide sync helper ────────────────────────────────────────────────
const dispatchUpdate = () => window.dispatchEvent(new Event("patientsUpdated"));

// ─── Helper Functions (Part 14) ───────────────────────────────────────────────
const calculateBMI = (height, weight) => {
  const h = parseFloat(height);
  const w = parseFloat(weight);
  if (!h || !w || h <= 0) return null;
  const bmi = w / ((h / 100) * (h / 100));
  return bmi.toFixed(1);
};

const getBMICategory = (bmi) => {
  if (!bmi) return "";
  const b = parseFloat(bmi);
  if (b < 18.5) return "Underweight";
  if (b < 25) return "Normal";
  if (b < 30) return "Overweight";
  return "Obese";
};

const calculateAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const getPatientLabReports = (patientId, patientName) => {
  try {
    const all = JSON.parse(localStorage.getItem("lab_tests") || "[]");
    return all.filter((l) => l.patientId === patientId || l.patientName === patientName);
  } catch { return []; }
};

const getLatestVisit = (timeline) => {
  if (!timeline || timeline.length === 0) return null;
  const consultations = timeline.filter((t) => t.type === "Consultation");
  if (consultations.length === 0) return null;
  return consultations[consultations.length - 1];
};

const getRiskLevel = (patient) => {
  const chronic = (patient.chronicDiseases || "").toLowerCase();
  const allergies = (patient.allergies || "").toLowerCase();
  if (
    chronic.includes("cancer") ||
    chronic.includes("icu") ||
    patient.status === "Critical"
  ) return "Critical";
  if (
    chronic.includes("diabetes") ||
    chronic.includes("heart") ||
    chronic.includes("hypertension") ||
    allergies.includes("penicillin")
  ) return "High";
  if (chronic || allergies) return "Medium";
  return "Low";
};

const getOutstandingBalance = (patientId) => {
  try {
    const bills = JSON.parse(localStorage.getItem("billing") || "[]");
    const patientBills = bills.filter((b) => b.patientId === patientId);
    return patientBills.reduce((acc, b) => acc + (parseFloat(b.pending) || 0), 0);
  } catch { return 0; }
};

const getClinicalAlerts = (patient) => {
  const alerts = [];
  const chronic = (patient.chronicDiseases || "").toLowerCase();
  const allergies = (patient.allergies || "").toLowerCase();
  if (chronic.includes("diabetes")) alerts.push({ label: "Diabetic", color: "bg-orange-500" });
  if (chronic.includes("hypertension") || chronic.includes("bp")) alerts.push({ label: "Hypertension", color: "bg-red-500" });
  if (allergies.includes("penicillin") || allergies.includes("sulfa") || allergies) alerts.push({ label: "Drug Allergy", color: "bg-pink-600" });
  if ((patient.pregnancyStatus || "").toLowerCase() === "pregnant") alerts.push({ label: "Pregnancy", color: "bg-purple-500" });
  if (chronic.includes("fall") || parseInt(patient.age) > 70) alerts.push({ label: "Fall Risk", color: "bg-yellow-600" });
  if (patient.status === "Critical") alerts.push({ label: "Critical", color: "bg-red-700" });
  return alerts;
};

const getLatestDoctor = (patient) => {
  return patient.primaryDoctor || "Not Assigned";
};

// ─── Timeline icons ───────────────────────────────────────────────────────────
const TIMELINE_ICONS = {
  Registration: { icon: "🏥", color: "bg-cyan-500" },
  Consultation: { icon: "👨‍⚕️", color: "bg-blue-500" },
  "Lab Test": { icon: "🔬", color: "bg-yellow-500" },
  Prescription: { icon: "💊", color: "bg-green-500" },
  Billing: { icon: "💳", color: "bg-purple-500" },
  Discharge: { icon: "🚪", color: "bg-gray-500" },
  "Follow-up": { icon: "📅", color: "bg-indigo-500" },
  "X-Ray": { icon: "🩻", color: "bg-slate-500" },
};

const getTimelineStyle = (type) => TIMELINE_ICONS[type] || { icon: "📋", color: "bg-slate-400" };

// ─── Status badge colors ──────────────────────────────────────────────────────
const statusColor = (status) => {
  switch (status) {
    case "Waiting": return "bg-green-500";
    case "In Consultation": return "bg-blue-500";
    case "Lab Test": return "bg-yellow-500";
    case "Billing": return "bg-purple-500";
    case "Completed": return "bg-gray-500";
    case "Critical": return "bg-red-600";
    default: return "bg-slate-400";
  }
};

const riskColor = (level) => {
  switch (level) {
    case "Critical": return "bg-red-700 text-white";
    case "High": return "bg-orange-500 text-white";
    case "Medium": return "bg-yellow-500 text-white";
    default: return "bg-green-600 text-white";
  }
};

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = () => ({
  name: "", age: "", gender: "Male", bloodGroup: "O+", phone: "",
  disease: "", status: "Waiting", address: "",
  emergencyContact: "", allergies: "", medicalHistory: "", visitNotes: "",
  photo: "", photoSource: "Browse Photo",
  // Extended fields (Part 1)
  height: "", weight: "", bloodPressure: "", pulse: "", temperature: "",
  respiratoryRate: "", oxygenSaturation: "", maritalStatus: "",
  occupation: "", insuranceProvider: "", insuranceNumber: "",
  primaryDoctor: "", department: "", chronicDiseases: "",
  currentMedications: "", lifestyleNotes: "", smoking: "No",
  alcohol: "No", pregnancyStatus: "N/A", organDonor: "No",
  disability: "", emergencyNotes: "",
  timeline: [],
});

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PatientsPage({ darkMode }) {
  const [patients, setPatients] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("patients") || "null");
    if (Array.isArray(saved) && saved.length > 0) return saved;
    localStorage.setItem("patients", JSON.stringify(initialPatients));
    return initialPatients;
  });

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showForm, setShowForm] = useState(false);
  const [timelineForm, setTimelineForm] = useState({ type: "Consultation", title: "", details: "" });
  const [form, setForm] = useState(emptyForm());

  // Persist + broadcast
  useEffect(() => {
    localStorage.setItem("patients", JSON.stringify(patients));
    dispatchUpdate();
  }, [patients]);

  // Sync listener
  useEffect(() => {
    const loadPatients = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("patients")) || [];
        setPatients(saved);
      } catch (e) { console.error("Sync error:", e); }
    };
    window.addEventListener("patientsUpdated", loadPatients);
    window.addEventListener("storage", loadPatients);
    return () => {
      window.removeEventListener("patientsUpdated", loadPatients);
      window.removeEventListener("storage", loadPatients);
    };
  }, []);

  // ─── Computed values ────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => ({
    total: patients.length,
    active: patients.filter((p) => p.status !== "Completed").length,
    waiting: patients.filter((p) => p.status === "Waiting").length,
    inConsultation: patients.filter((p) => p.status === "In Consultation").length,
    labTest: patients.filter((p) => p.status === "Lab Test").length,
    billing: patients.filter((p) => p.status === "Billing").length,
    critical: patients.filter((p) => p.status === "Critical" || getRiskLevel(p) === "Critical").length,
    todayReg: patients.filter((p) => p.registeredDate === today).length,
  }), [patients, today]);

  const filteredPatients = useMemo(() => patients.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q);
    const matchGender = genderFilter === "All" || p.gender === genderFilter;
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchGender && matchStatus;
  }), [patients, search, genderFilter, statusFilter]);

  const selectedPatientLabReports = useMemo(() => {
    if (!selectedPatient) return [];
    return getPatientLabReports(selectedPatient.id, selectedPatient.name);
  }, [selectedPatient]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const inputClass = `border p-3 rounded-lg text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block";

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  const resetForm = useCallback(() => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.phone || !form.disease || !form.address) {
      alert("Please fill all required fields: Name, Age, Phone, Condition, Address.");
      return;
    }
    if (editingId) {
      setPatients((prev) => prev.map((p) => p.id === editingId ? { ...p, ...form } : p));
    } else {
      const newPatient = {
        ...form,
        id: `PAT-${Date.now()}`,
        registeredDate: today,
        timeline: [{
          id: Date.now(),
          date: today,
          type: "Registration",
          title: "Patient Registered",
          details: "New patient record created in MediCare Pro EMR.",
        }],
      };
      setPatients((prev) => [newPatient, ...prev]);
    }
    resetForm();
  };

  const handleEdit = useCallback((patient) => {
    setEditingId(patient.id);
    setForm({
      name: patient.name || "", age: patient.age || "", gender: patient.gender || "Male",
      bloodGroup: patient.bloodGroup || "O+", phone: patient.phone || "",
      disease: patient.disease || "", status: patient.status || "Waiting",
      address: patient.address || "", emergencyContact: patient.emergencyContact || "",
      allergies: patient.allergies || "", medicalHistory: patient.medicalHistory || "",
      visitNotes: patient.visitNotes || "", photo: patient.photo || "",
      photoSource: patient.photoSource || "Browse Photo",
      height: patient.height || "", weight: patient.weight || "",
      bloodPressure: patient.bloodPressure || "", pulse: patient.pulse || "",
      temperature: patient.temperature || "", respiratoryRate: patient.respiratoryRate || "",
      oxygenSaturation: patient.oxygenSaturation || "", maritalStatus: patient.maritalStatus || "",
      occupation: patient.occupation || "", insuranceProvider: patient.insuranceProvider || "",
      insuranceNumber: patient.insuranceNumber || "", primaryDoctor: patient.primaryDoctor || "",
      department: patient.department || "", chronicDiseases: patient.chronicDiseases || "",
      currentMedications: patient.currentMedications || "", lifestyleNotes: patient.lifestyleNotes || "",
      smoking: patient.smoking || "No", alcohol: patient.alcohol || "No",
      pregnancyStatus: patient.pregnancyStatus || "N/A", organDonor: patient.organDonor || "No",
      disability: patient.disability || "", emergencyNotes: patient.emergencyNotes || "",
      timeline: patient.timeline || [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDelete = useCallback((id) => {
    if (!window.confirm("Delete this patient record? This cannot be undone.")) return;
    setPatients((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addTimelineEvent = useCallback(() => {
    if (!selectedPatient || !timelineForm.title || !timelineForm.details) {
      alert("Please fill timeline title and details.");
      return;
    }
    const newEvent = { id: Date.now(), date: today, type: timelineForm.type, title: timelineForm.title, details: timelineForm.details };
    const updated = patients.map((p) =>
      p.id === selectedPatient.id ? { ...p, timeline: [...(p.timeline || []), newEvent] } : p
    );
    setPatients(updated);
    setSelectedPatient((sp) => ({ ...sp, timeline: [...(sp.timeline || []), newEvent] }));
    setTimelineForm({ type: "Consultation", title: "", details: "" });
  }, [selectedPatient, timelineForm, patients, today]);

  // ─── PDF Export (Part 13) ──────────────────────────────────────────────────
  const generatePatientPDF = useCallback((patient) => {
    const doc = new jsPDF();
    const labReports = getPatientLabReports(patient.id, patient.name);
    const risk = getRiskLevel(patient);
    const alerts = getClinicalAlerts(patient);
    const bmi = calculateBMI(patient.height, patient.weight);

    // Header
    doc.setFillColor(6, 182, 212);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("MediCare Pro", 14, 12);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("Enterprise Electronic Medical Record System", 14, 19);
    doc.text("Smart Healthcare Dashboard", 14, 25);

    // Patient ID Block
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Patient ID: ${patient.id}`, 14, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 49);
    doc.text(`Risk Level: ${risk}`, 120, 42);
    doc.text(`Status: ${patient.status || "N/A"}`, 120, 49);

    // Divider
    doc.setDrawColor(6, 182, 212);
    doc.setLineWidth(0.5);
    doc.line(14, 54, 196, 54);

    // Section A – Patient Details
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("PATIENT INFORMATION", 14, 62);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const details = [
      [`Name: ${patient.name}`, `Age: ${patient.age}`],
      [`Gender: ${patient.gender}`, `Blood Group: ${patient.bloodGroup}`],
      [`Phone: ${patient.phone}`, `Marital Status: ${patient.maritalStatus || "Not Recorded"}`],
      [`Address: ${patient.address || "Not Recorded"}`, `Occupation: ${patient.occupation || "Not Recorded"}`],
      [`Emergency Contact: ${patient.emergencyContact || "Not Recorded"}`, `Insurance: ${patient.insuranceProvider || "Not Recorded"}`],
      [`Insurance No: ${patient.insuranceNumber || "Not Recorded"}`, `Primary Doctor: ${patient.primaryDoctor || "Not Recorded"}`],
      [`Department: ${patient.department || "Not Recorded"}`, ``],
    ];
    details.forEach(([left, right], i) => {
      doc.text(left, 14, 70 + i * 7);
      if (right) doc.text(right, 110, 70 + i * 7);
    });

    // Section B – Vital Signs
    let y = 122;
    doc.line(14, y - 2, 196, y - 2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("VITAL SIGNS", 14, y + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const vitals = [
      [`Height: ${patient.height ? patient.height + " cm" : "Not Recorded"}`, `Weight: ${patient.weight ? patient.weight + " kg" : "Not Recorded"}`],
      [`BMI: ${bmi ? `${bmi} (${getBMICategory(bmi)})` : "Not Recorded"}`, `Blood Pressure: ${patient.bloodPressure || "Not Recorded"}`],
      [`Pulse: ${patient.pulse ? patient.pulse + " bpm" : "Not Recorded"}`, `Temperature: ${patient.temperature ? patient.temperature + " °F" : "Not Recorded"}`],
      [`Respiratory Rate: ${patient.respiratoryRate ? patient.respiratoryRate + " /min" : "Not Recorded"}`, `O₂ Saturation: ${patient.oxygenSaturation ? patient.oxygenSaturation + " %" : "Not Recorded"}`],
    ];
    vitals.forEach(([left, right], i) => {
      doc.text(left, 14, y + 13 + i * 7);
      if (right) doc.text(right, 110, y + 13 + i * 7);
    });

    // Section C – Medical Summary
    y = 180;
    doc.line(14, y - 2, 196, y - 2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("MEDICAL SUMMARY", 14, y + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`Disease/Condition: ${patient.disease || "Not Recorded"}`, 14, y + 13);
    doc.text(`Allergies: ${patient.allergies || "None"}`, 14, y + 20);
    doc.text(`Medical History: ${patient.medicalHistory || "None"}`, 14, y + 27);
    doc.text(`Chronic Diseases: ${patient.chronicDiseases || "None"}`, 14, y + 34);
    doc.text(`Current Medications: ${patient.currentMedications || "None"}`, 14, y + 41);
    doc.text(`Organ Donor: ${patient.organDonor || "No"} | Smoking: ${patient.smoking || "No"} | Alcohol: ${patient.alcohol || "No"}`, 14, y + 48);

    // Clinical Alerts
    if (alerts.length > 0) {
      y += 56;
      doc.setFont("helvetica", "bold");
      doc.text(`Clinical Alerts: ${alerts.map((a) => a.label).join(", ")}`, 14, y);
    }

    // Latest Lab Summary
    if (labReports.length > 0) {
      y += 15;
      doc.line(14, y - 2, 196, y - 2);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("LATEST LABORATORY REPORTS", 14, y + 5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      labReports.slice(0, 3).forEach((lab, i) => {
        doc.text(`${i + 1}. ${lab.testName || lab.profileName || "Test"} — ${lab.status || "N/A"} — ${lab.requestDate || ""}`, 14, y + 13 + i * 7);
      });
    }

    // Doctor Notes
    if (patient.visitNotes) {
      y += 50;
      if (y > 240) { doc.addPage(); y = 20; }
      doc.line(14, y - 2, 196, y - 2);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("DOCTOR NOTES", 14, y + 5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const lines = doc.splitTextToSize(patient.visitNotes, 180);
      doc.text(lines, 14, y + 13);
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text("MediCare Pro — Confidential Medical Record — Not for public disclosure", 14, 285);
      doc.text(`Page ${i} of ${pageCount}`, 170, 285);
      doc.text("Doctor Signature: _________________ | QR: [Future]", 14, 290);
    }

    doc.setTextColor(0, 0, 0);
    doc.save(`${patient.id}_MedicalRecord.pdf`);
  }, []);

  // ─── Reusable UI ───────────────────────────────────────────────────────────
  const Card = ({ color, label, value, icon }) => (
    <div className={`${color} text-white p-4 rounded-xl flex items-center gap-3 shadow`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );

  const InfoRow = ({ label, value }) => (
    <div className={`flex flex-col gap-0.5 p-3 rounded-lg ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-medium">{value || <span className="text-slate-400">Not Recorded</span>}</span>
    </div>
  );

  const SectionHeader = ({ title, icon }) => (
    <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
      <span className="text-lg">{icon}</span>
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
    </div>
  );

  const Tab = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeTab === id
          ? "bg-cyan-600 text-white"
          : darkMode ? "text-slate-400 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {icon} {label}
    </button>
  );

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const bg = darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900";
  const cardBg = darkMode ? "bg-slate-900" : "bg-white";

  return (
    <div className={`p-6 min-h-screen ${bg}`}>

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Enterprise Electronic Medical Record System</p>
        </div>
        <div className="flex items-center gap-3 mt-3 md:mt-0">
          <span className="text-sm font-medium text-cyan-600">
            {filteredPatients.length} of {patients.length} patients
          </span>
          <button
            onClick={() => { setEditingId(null); setForm(emptyForm()); setShowForm(!showForm); }}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {showForm ? "✕ Close Form" : "+ Register Patient"}
          </button>
        </div>
      </div>

      {/* ── Part 2: Dashboard Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <Card color="bg-cyan-600" label="Total" value={stats.total} icon="👥" />
        <Card color="bg-blue-600" label="Active" value={stats.active} icon="✅" />
        <Card color="bg-green-600" label="Waiting" value={stats.waiting} icon="⏳" />
        <Card color="bg-indigo-600" label="In Consult." value={stats.inConsultation} icon="👨‍⚕️" />
        <Card color="bg-yellow-600" label="Lab Tests" value={stats.labTest} icon="🔬" />
        <Card color="bg-purple-600" label="Billing" value={stats.billing} icon="💳" />
        <Card color="bg-red-600" label="Critical" value={stats.critical} icon="🚨" />
        <Card color="bg-teal-600" label="Today" value={stats.todayReg} icon="📅" />
      </div>

      {/* ── Part 1: Registration Form ── */}
      {showForm && (
        <div className={`mb-6 rounded-2xl shadow-lg p-6 ${cardBg}`}>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            🏥 {editingId ? "Edit Patient Record" : "New Patient Registration"}
          </h2>
          <form onSubmit={handleSubmit}>

            {/* Core Fields */}
            <div className="mb-4">
              <p className={labelClass}>Basic Information <span className="text-red-500">*Required</span></p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div><label className={labelClass}>Full Name *</label><input className={`${inputClass} w-full`} placeholder="Patient full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className={labelClass}>Age *</label><input className={`${inputClass} w-full`} placeholder="Age in years" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
                <div><label className={labelClass}>Gender *</label>
                  <select className={`${inputClass} w-full`} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div><label className={labelClass}>Blood Group</label>
                  <select className={`${inputClass} w-full`} value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
                    <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>Unknown</option>
                  </select>
                </div>
                <div><label className={labelClass}>Phone *</label><input className={`${inputClass} w-full`} placeholder="10-digit number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className={labelClass}>Condition / Disease *</label><input className={`${inputClass} w-full`} placeholder="Primary complaint" value={form.disease} onChange={(e) => setForm({ ...form, disease: e.target.value })} /></div>
                <div><label className={labelClass}>Status</label>
                  <select className={`${inputClass} w-full`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="Waiting">Waiting</option>
                    <option value="In Consultation">In Consultation</option>
                    <option value="Lab Test">Lab Test</option>
                    <option value="Billing">Billing</option>
                    <option value="Critical">Critical</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div><label className={labelClass}>Address *</label><input className={`${inputClass} w-full`} placeholder="Full address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
            </div>

            {/* Vitals */}
            <div className="mb-4">
              <p className={labelClass}>Vital Signs</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className={labelClass}>Height (cm)</label><input className={`${inputClass} w-full`} placeholder="170" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></div>
                <div><label className={labelClass}>Weight (kg)</label><input className={`${inputClass} w-full`} placeholder="70" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
                <div><label className={labelClass}>Blood Pressure</label><input className={`${inputClass} w-full`} placeholder="120/80 mmHg" value={form.bloodPressure} onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })} /></div>
                <div><label className={labelClass}>Pulse (bpm)</label><input className={`${inputClass} w-full`} placeholder="72" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} /></div>
                <div><label className={labelClass}>Temperature (°F)</label><input className={`${inputClass} w-full`} placeholder="98.6" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} /></div>
                <div><label className={labelClass}>Resp. Rate (/min)</label><input className={`${inputClass} w-full`} placeholder="16" value={form.respiratoryRate} onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} /></div>
                <div><label className={labelClass}>O₂ Saturation (%)</label><input className={`${inputClass} w-full`} placeholder="98" value={form.oxygenSaturation} onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })} /></div>
                {form.height && form.weight && (
                  <div className={`p-3 rounded-lg ${darkMode ? "bg-cyan-900" : "bg-cyan-50"} flex flex-col justify-center`}>
                    <span className={labelClass}>BMI (Auto)</span>
                    <span className="text-lg font-bold text-cyan-600">{calculateBMI(form.height, form.weight)}</span>
                    <span className="text-xs text-slate-500">{getBMICategory(calculateBMI(form.height, form.weight))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Personal & Admin */}
            <div className="mb-4">
              <p className={labelClass}>Personal & Administrative</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className={labelClass}>Marital Status</label>
                  <select className={`${inputClass} w-full`} value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}>
                    <option value="">Select</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                  </select>
                </div>
                <div><label className={labelClass}>Occupation</label><input className={`${inputClass} w-full`} placeholder="Profession" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></div>
                <div><label className={labelClass}>Insurance Provider</label><input className={`${inputClass} w-full`} placeholder="Provider name" value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} /></div>
                <div><label className={labelClass}>Insurance Number</label><input className={`${inputClass} w-full`} placeholder="Policy number" value={form.insuranceNumber} onChange={(e) => setForm({ ...form, insuranceNumber: e.target.value })} /></div>
                <div><label className={labelClass}>Primary Doctor</label><input className={`${inputClass} w-full`} placeholder="Dr. Name" value={form.primaryDoctor} onChange={(e) => setForm({ ...form, primaryDoctor: e.target.value })} /></div>
                <div><label className={labelClass}>Department</label><input className={`${inputClass} w-full`} placeholder="e.g. Cardiology" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                <div><label className={labelClass}>Emergency Contact</label><input className={`${inputClass} w-full`} placeholder="Name & phone" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} /></div>
                <div><label className={labelClass}>Emergency Notes</label><input className={`${inputClass} w-full`} placeholder="Critical notes" value={form.emergencyNotes} onChange={(e) => setForm({ ...form, emergencyNotes: e.target.value })} /></div>
              </div>
            </div>

            {/* Medical History */}
            <div className="mb-4">
              <p className={labelClass}>Medical History & Lifestyle</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className={labelClass}>Allergies</label><input className={`${inputClass} w-full`} placeholder="Drug / food allergies" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></div>
                <div><label className={labelClass}>Medical History</label><input className={`${inputClass} w-full`} placeholder="Past conditions" value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} /></div>
                <div><label className={labelClass}>Chronic Diseases</label><input className={`${inputClass} w-full`} placeholder="Diabetes, Hypertension..." value={form.chronicDiseases} onChange={(e) => setForm({ ...form, chronicDiseases: e.target.value })} /></div>
                <div><label className={labelClass}>Current Medications</label><input className={`${inputClass} w-full`} placeholder="Ongoing medicines" value={form.currentMedications} onChange={(e) => setForm({ ...form, currentMedications: e.target.value })} /></div>
                <div><label className={labelClass}>Lifestyle Notes</label><input className={`${inputClass} w-full`} placeholder="Diet, exercise..." value={form.lifestyleNotes} onChange={(e) => setForm({ ...form, lifestyleNotes: e.target.value })} /></div>
                <div><label className={labelClass}>Smoking</label>
                  <select className={`${inputClass} w-full`} value={form.smoking} onChange={(e) => setForm({ ...form, smoking: e.target.value })}>
                    <option>No</option><option>Yes</option><option>Former</option>
                  </select>
                </div>
                <div><label className={labelClass}>Alcohol</label>
                  <select className={`${inputClass} w-full`} value={form.alcohol} onChange={(e) => setForm({ ...form, alcohol: e.target.value })}>
                    <option>No</option><option>Occasional</option><option>Regular</option>
                  </select>
                </div>
                <div><label className={labelClass}>Pregnancy Status</label>
                  <select className={`${inputClass} w-full`} value={form.pregnancyStatus} onChange={(e) => setForm({ ...form, pregnancyStatus: e.target.value })}>
                    <option value="N/A">N/A</option><option>Pregnant</option><option>Post-partum</option>
                  </select>
                </div>
                <div><label className={labelClass}>Organ Donor</label>
                  <select className={`${inputClass} w-full`} value={form.organDonor} onChange={(e) => setForm({ ...form, organDonor: e.target.value })}>
                    <option>No</option><option>Yes</option>
                  </select>
                </div>
                <div><label className={labelClass}>Disability</label><input className={`${inputClass} w-full`} placeholder="If any" value={form.disability} onChange={(e) => setForm({ ...form, disability: e.target.value })} /></div>
                <div className="md:col-span-2"><label className={labelClass}>Visit / Doctor Notes</label><input className={`${inputClass} w-full`} placeholder="Clinical observations" value={form.visitNotes} onChange={(e) => setForm({ ...form, visitNotes: e.target.value })} /></div>
              </div>
            </div>

            {/* Photo */}
            <div className="mb-5">
              <p className={labelClass}>Patient Photo</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className={labelClass}>Photo Source</label>
                  <select className={`${inputClass} w-full`} value={form.photoSource} onChange={(e) => setForm({ ...form, photoSource: e.target.value })}>
                    <option>Browse Photo</option><option>Live Camera</option><option>Scanned Photo Copy</option><option>WhatsApp Pending</option>
                  </select>
                </div>
                {form.photoSource === "Browse Photo" && (
                  <div><label className={labelClass}>Upload Photo</label><input className={`${inputClass} w-full`} type="file" accept="image/*" onChange={handlePhotoUpload} /></div>
                )}
                {form.photoSource === "Live Camera" && (
                  <div><label className={labelClass}>Take Photo</label><input className={`${inputClass} w-full`} type="file" accept="image/*" capture="user" onChange={handlePhotoUpload} /></div>
                )}
                {form.photoSource === "Scanned Photo Copy" && (
                  <div><label className={labelClass}>Upload Scan</label><input className={`${inputClass} w-full`} type="file" accept="image/*,.pdf" onChange={handlePhotoUpload} /></div>
                )}
                {form.photoSource === "WhatsApp Pending" && (
                  <p className="p-3 rounded-lg bg-yellow-100 text-yellow-800 text-sm col-span-2">📱 Remind patient to share photo via WhatsApp. Upload later when received.</p>
                )}
                {form.photo && (
                  <div className="flex items-center gap-2">
                    <img src={form.photo} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500" />
                    <span className="text-xs text-slate-500">Photo ready</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 flex-wrap">
              <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">
                {editingId ? "✓ Update Patient Record" : "✓ Register Patient"}
              </button>
              <button type="button" onClick={resetForm} className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors ${darkMode ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Search & Filters ── */}
      <div className={`flex flex-wrap gap-3 mb-4 p-4 rounded-xl ${cardBg} shadow`}>
        <input
          className={`${inputClass} flex-1 min-w-[200px]`}
          placeholder="🔍 Search by name, ID or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${inputClass} min-w-[150px]`} value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
          <option value="All">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <select className={`${inputClass} min-w-[160px]`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Waiting">Waiting</option>
          <option value="In Consultation">In Consultation</option>
          <option value="Lab Test">Lab Test</option>
          <option value="Billing">Billing</option>
          <option value="Critical">Critical</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* ── Part 3: Patient Table ── */}
      <div className={`rounded-2xl shadow overflow-x-auto ${cardBg}`}>
        <table className="w-full text-sm min-w-[1400px]">
          <thead className={`${darkMode ? "bg-slate-800" : "bg-slate-50"} border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
            <tr>
              {["Photo", "Patient ID", "Name", "Age/Gender", "Blood", "Contact", "Condition", "Status", "Risk", "Doctor", "Last Visit", "Lab Reports", "Registered", "Actions"].map((h) => (
                <th key={h} className="p-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => {
              const riskLevel = getRiskLevel(patient);
              const labCount = getPatientLabReports(patient.id, patient.name).length;
              const lastVisit = getLatestVisit(patient.timeline);
              return (
                <tr key={patient.id} className={`border-b transition-colors ${darkMode ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-50"}`}>
                  <td className="p-3">
                    {patient.photo
                      ? <img src={patient.photo} alt={patient.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200" />
                      : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">{patient.name?.charAt(0) || "?"}</div>
                    }
                  </td>
                  <td className="p-3"><span className="font-mono font-bold text-cyan-500 text-xs">{patient.id}</span></td>
                  <td className="p-3 font-semibold">{patient.name}</td>
                  <td className="p-3 text-xs">{patient.age}y / {patient.gender}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border">{patient.bloodGroup || "?"}</span>
                  </td>
                  <td className="p-3 text-xs">{patient.phone}</td>
                  <td className="p-3 text-xs max-w-[120px] truncate">{patient.disease}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${statusColor(patient.status)}`}>
                      {patient.status || "Unknown"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${riskColor(riskLevel)}`}>
                      {riskLevel}
                    </span>
                  </td>
                  <td className="p-3 text-xs">{patient.primaryDoctor || <span className="text-slate-400">—</span>}</td>
                  <td className="p-3 text-xs">{lastVisit ? lastVisit.date : <span className="text-slate-400">—</span>}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${labCount > 0 ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500"}`}>
                      {labCount} report{labCount !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{patient.registeredDate}</td>
                  <td className="p-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => { setSelectedPatient(patient); setActiveTab("overview"); }} className="bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors">View</button>
                      <button onClick={() => handleEdit(patient)} className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors">Edit</button>
                      <button onClick={() => generatePatientPDF(patient)} className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors">PDF</button>
                      <button onClick={() => handleDelete(patient.id)} className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors">Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredPatients.length === 0 && (
              <tr>
                <td colSpan="14" className="p-10 text-center text-slate-400">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="font-medium">No patients found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Part 4–13: Patient Profile Modal ── */}
      {selectedPatient && (() => {
        const bmi = calculateBMI(selectedPatient.height, selectedPatient.weight);
        const riskLevel = getRiskLevel(selectedPatient);
        const alerts = getClinicalAlerts(selectedPatient);
        const labReports = selectedPatientLabReports;
        const balance = getOutstandingBalance(selectedPatient.id);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
            <div className={`w-full max-w-5xl rounded-2xl shadow-2xl my-6 ${darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}>

              {/* Section A: Patient Header */}
              <div className={`p-6 rounded-t-2xl ${darkMode ? "bg-slate-800" : "bg-gradient-to-r from-cyan-600 to-blue-700"} text-white`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-5">
                    {selectedPatient.photo
                      ? <img src={selectedPatient.photo} alt={selectedPatient.name} className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-lg" />
                      : <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold shadow-lg">{selectedPatient.name?.charAt(0) || "?"}</div>
                    }
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{selectedPatient.name}</h2>
                      <p className="text-sm opacity-80 mt-0.5 font-mono">{selectedPatient.id}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">{selectedPatient.gender}</span>
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">{selectedPatient.age} yrs</span>
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">{selectedPatient.bloodGroup}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(selectedPatient.status)} text-white`}>{selectedPatient.status || "Unknown"}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${riskColor(riskLevel)}`}>⚠ {riskLevel} Risk</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => generatePatientPDF(selectedPatient)} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">📄 PDF</button>
                    <button onClick={() => setSelectedPatient(null)} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">✕ Close</button>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-0 border-b border-slate-200 dark:border-slate-700">
                {[
                  { label: "Lab Reports", value: labReports.length, icon: "🔬", color: "text-blue-600" },
                  { label: "Outstanding", value: `₹${balance}`, icon: "💳", color: "text-purple-600" },
                  { label: "Timeline Events", value: (selectedPatient.timeline || []).length, icon: "📋", color: "text-cyan-600" },
                  { label: "Registered", value: selectedPatient.registeredDate, icon: "📅", color: "text-green-600" },
                ].map((s) => (
                  <div key={s.label} className={`p-4 text-center border-r last:border-r-0 ${darkMode ? "border-slate-700" : "border-slate-100"}`}>
                    <div className="text-xl mb-1">{s.icon}</div>
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className={`flex flex-wrap gap-2 px-6 pt-4 pb-0 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <Tab id="overview" label="Overview" icon="🗂" />
                <Tab id="vitals" label="Vital Signs" icon="💓" />
                <Tab id="medical" label="Medical" icon="🩺" />
                <Tab id="laboratory" label="Laboratory" icon="🔬" />
                <Tab id="timeline" label="Timeline" icon="📋" />
                <Tab id="medications" label="Medications" icon="💊" />
                <Tab id="visits" label="Visit History" icon="📅" />
                <Tab id="billing" label="Billing" icon="💳" />
                <Tab id="alerts" label="Alerts" icon="🚨" />
                <Tab id="notes" label="Doctor Notes" icon="📝" />
                <Tab id="ai" label="AI Summary" icon="🤖" />
              </div>

              {/* Tab Content */}
              <div className="p-6">

                {/* OVERVIEW */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Section B: Patient Info */}
                    <div>
                      <SectionHeader title="Patient Information" icon="👤" />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <InfoRow label="Address" value={selectedPatient.address} />
                        <InfoRow label="Phone" value={selectedPatient.phone} />
                        <InfoRow label="Email" value={selectedPatient.email || "Not Recorded"} />
                        <InfoRow label="Aadhaar / National ID" value="Not Recorded (Future)" />
                        <InfoRow label="Insurance Provider" value={selectedPatient.insuranceProvider} />
                        <InfoRow label="Insurance Number" value={selectedPatient.insuranceNumber} />
                        <InfoRow label="Emergency Contact" value={selectedPatient.emergencyContact} />
                        <InfoRow label="Occupation" value={selectedPatient.occupation} />
                        <InfoRow label="Marital Status" value={selectedPatient.maritalStatus} />
                        <InfoRow label="Primary Doctor" value={selectedPatient.primaryDoctor} />
                        <InfoRow label="Department" value={selectedPatient.department} />
                        <InfoRow label="Organ Donor" value={selectedPatient.organDonor} />
                      </div>
                    </div>

                    {/* Clinical Alerts Preview */}
                    {alerts.length > 0 && (
                      <div>
                        <SectionHeader title="Active Clinical Alerts" icon="🚨" />
                        <div className="flex flex-wrap gap-2">
                          {alerts.map((a, i) => (
                            <span key={i} className={`px-3 py-1 rounded-full text-white text-xs font-bold ${a.color}`}>{a.label}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Future Architecture (Part 15) */}
                    <div>
                      <SectionHeader title="Patient Record Modules" icon="🏗" />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          "Appointments", "Prescriptions", "Radiology", "Surgery History",
                          "Vaccinations", "Allergy History", "Family History", "Insurance Claims",
                          "Consent Forms", "Documents", "Referrals", "Admission History",
                          "ICU History", "Discharge Summary", "AI Prediction", "Lab Trends",
                        ].map((mod) => (
                          <div key={mod} className={`p-3 rounded-lg text-center border-2 border-dashed text-xs text-slate-400 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                            🔒 {mod}<br /><span className="text-xs opacity-60">Coming Soon</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* VITAL SIGNS */}
                {activeTab === "vitals" && (
                  <div>
                    <SectionHeader title="Vital Signs" icon="💓" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {[
                        { label: "Height", value: selectedPatient.height ? `${selectedPatient.height} cm` : null, icon: "📏" },
                        { label: "Weight", value: selectedPatient.weight ? `${selectedPatient.weight} kg` : null, icon: "⚖️" },
                        { label: "Blood Pressure", value: selectedPatient.bloodPressure, icon: "🩺" },
                        { label: "Pulse", value: selectedPatient.pulse ? `${selectedPatient.pulse} bpm` : null, icon: "❤️" },
                        { label: "Temperature", value: selectedPatient.temperature ? `${selectedPatient.temperature} °F` : null, icon: "🌡️" },
                        { label: "Respiratory Rate", value: selectedPatient.respiratoryRate ? `${selectedPatient.respiratoryRate}/min` : null, icon: "🫁" },
                        { label: "O₂ Saturation", value: selectedPatient.oxygenSaturation ? `${selectedPatient.oxygenSaturation}%` : null, icon: "💧" },
                      ].map(({ label, value, icon }) => (
                        <div key={label} className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <div className="text-xl mb-1">{icon}</div>
                          <div className="text-xs text-slate-500 font-medium">{label}</div>
                          <div className="text-lg font-bold mt-0.5">{value || <span className="text-slate-400 text-sm">Not Recorded</span>}</div>
                        </div>
                      ))}
                      {/* BMI Auto */}
                      <div className={`p-4 rounded-xl border ${bmi ? "bg-cyan-50 border-cyan-200" : darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                        <div className="text-xl mb-1">📊</div>
                        <div className="text-xs text-slate-500 font-medium">BMI (Auto)</div>
                        <div className={`text-lg font-bold mt-0.5 ${bmi ? "text-cyan-600" : ""}`}>
                          {bmi ? `${bmi}` : <span className="text-slate-400 text-sm">Not Recorded</span>}
                        </div>
                        {bmi && <div className="text-xs text-slate-500">{getBMICategory(bmi)}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {/* MEDICAL */}
                {activeTab === "medical" && (
                  <div className="space-y-6">
                    {/* Section C: Medical Summary */}
                    <div>
                      <SectionHeader title="Medical Summary" icon="🩺" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoRow label="Primary Condition / Disease" value={selectedPatient.disease} />
                        <InfoRow label="Allergies" value={selectedPatient.allergies} />
                        <InfoRow label="Medical History" value={selectedPatient.medicalHistory} />
                        <InfoRow label="Chronic Diseases" value={selectedPatient.chronicDiseases} />
                        <InfoRow label="Current Medications" value={selectedPatient.currentMedications} />
                        <InfoRow label="Lifestyle Notes" value={selectedPatient.lifestyleNotes} />
                        <InfoRow label="Smoking" value={selectedPatient.smoking} />
                        <InfoRow label="Alcohol" value={selectedPatient.alcohol} />
                        <InfoRow label="Pregnancy Status" value={selectedPatient.pregnancyStatus} />
                        <InfoRow label="Disability" value={selectedPatient.disability} />
                        <InfoRow label="Organ Donor" value={selectedPatient.organDonor} />
                        <InfoRow label="Emergency Notes" value={selectedPatient.emergencyNotes} />
                      </div>
                    </div>
                  </div>
                )}

                {/* LABORATORY (Part 6) */}
                {activeTab === "laboratory" && (
                  <div>
                    <SectionHeader title="Laboratory Reports" icon="🔬" />
                    {labReports.length === 0 ? (
                      <div className={`text-center py-10 rounded-xl border-2 border-dashed ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                        <div className="text-4xl mb-2">🔬</div>
                        <p className="font-medium">No lab reports found</p>
                        <p className="text-sm">Lab reports linked by Patient ID or name will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {labReports.map((lab, i) => (
                          <div key={i} className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <p className="font-semibold text-sm">{lab.testName || lab.profileName || "Lab Test"}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Requested: {lab.requestDate || "N/A"} &nbsp;·&nbsp; Result: {lab.resultDate || "Pending"}
                                </p>
                              </div>
                              <div className="flex gap-2 items-center">
                                {lab.critical && <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">🚨 Critical</span>}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  lab.status === "Completed" ? "bg-green-100 text-green-700" :
                                  lab.status === "Pending" ? "bg-yellow-100 text-yellow-700" :
                                  "bg-slate-100 text-slate-600"
                                }`}>{lab.status || "Unknown"}</span>
                              </div>
                            </div>
                            {lab.impression && (
                              <div className={`mt-3 p-3 rounded-lg text-sm ${darkMode ? "bg-slate-700" : "bg-white border border-slate-200"}`}>
                                <span className="font-medium text-xs text-slate-500 uppercase tracking-wide">Lab Impression: </span>
                                {lab.impression}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TIMELINE (Part 5) */}
                {activeTab === "timeline" && (
                  <div>
                    <SectionHeader title="Electronic Medical Record Timeline" icon="📋" />
                    <div className="relative">
                      <div className={`absolute left-5 top-0 bottom-0 w-0.5 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
                      <div className="space-y-4 pl-14">
                        {(selectedPatient.timeline || []).length === 0 && (
                          <div className="text-slate-400 text-sm">No timeline events yet.</div>
                        )}
                        {(selectedPatient.timeline || []).map((event) => {
                          const style = getTimelineStyle(event.type);
                          return (
                            <div key={event.id} className="relative">
                              <div className={`absolute -left-9 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow ${style.color}`}>
                                {style.icon}
                              </div>
                              <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div>
                                    <p className="font-semibold text-sm">{event.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{event.type}</p>
                                  </div>
                                  <span className="text-xs text-slate-400 font-mono">{event.date}</span>
                                </div>
                                <p className="text-sm text-slate-500 mt-2">{event.details}</p>
                              </div>
                            </div>
                          );
                        })}
                        {/* Standard EMR milestones if no timeline */}
                        {(selectedPatient.timeline || []).length === 0 && (
                          ["Patient Registered", "Doctor Consultation", "Laboratory Test", "Prescription", "Billing", "Discharge", "Follow-up"].map((step, i) => {
                            const types = ["Registration", "Consultation", "Lab Test", "Prescription", "Billing", "Discharge", "Follow-up"];
                            const style = getTimelineStyle(types[i]);
                            return (
                              <div key={step} className="relative">
                                <div className={`absolute -left-9 w-8 h-8 rounded-full flex items-center justify-center text-sm opacity-30 border-2 ${darkMode ? "border-slate-700 bg-slate-800" : "border-slate-300 bg-slate-100"}`}>
                                  {style.icon}
                                </div>
                                <div className={`p-3 rounded-xl border-2 border-dashed opacity-40 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                                  <p className="font-medium text-xs text-slate-500">{step} <span className="ml-1">(Pending)</span></p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Add Timeline Event */}
                    <div className={`mt-6 p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                      <p className="font-semibold text-sm mb-3">+ Add Timeline Event</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select className={`${inputClass} w-full`} value={timelineForm.type} onChange={(e) => setTimelineForm({ ...timelineForm, type: e.target.value })}>
                          <option>Consultation</option><option>Prescription</option><option>Lab Test</option>
                          <option>X-Ray</option><option>Billing</option><option>Follow-up</option><option>Discharge</option>
                        </select>
                        <input className={`${inputClass} w-full`} placeholder="Event title" value={timelineForm.title} onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })} />
                        <input className={`${inputClass} w-full`} placeholder="Details" value={timelineForm.details} onChange={(e) => setTimelineForm({ ...timelineForm, details: e.target.value })} />
                      </div>
                      <button onClick={addTimelineEvent} className="mt-3 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Add Event
                      </button>
                    </div>
                  </div>
                )}

                {/* MEDICATIONS (Part 7) */}
                {activeTab === "medications" && (
                  <div>
                    <SectionHeader title="Medication History" icon="💊" />
                    <div className={`mb-4 p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
                      <p className="text-sm font-medium text-blue-600 mb-1">📋 Current Medications</p>
                      <p className="text-sm">{selectedPatient.currentMedications || <span className="text-slate-400">No current medications recorded.</span>}</p>
                    </div>
                    <div className={`rounded-xl border overflow-hidden ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                      <table className="w-full text-sm">
                        <thead className={`${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                          <tr>
                            {["Medicine", "Dose", "Frequency", "Duration", "Status"].map((h) => (
                              <th key={h} className="p-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              <div className="text-3xl mb-2">💊</div>
                              <p className="font-medium">Medication history will appear here</p>
                              <p className="text-xs mt-1">Backend integration ready — future prescription module</p>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* VISIT HISTORY (Part 8) */}
                {activeTab === "visits" && (
                  <div>
                    <SectionHeader title="Visit History" icon="📅" />
                    <div className={`rounded-xl border overflow-hidden ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                      <table className="w-full text-sm">
                        <thead className={`${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                          <tr>
                            {["#", "Date", "Doctor", "Diagnosis", "Lab", "Medicines", "Advice", "Follow-up"].map((h) => (
                              <th key={h} className="p-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedPatient.timeline || []).filter((t) => t.type === "Consultation").length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-400">
                                <div className="text-3xl mb-2">📅</div>
                                <p className="font-medium">No visit records yet</p>
                                <p className="text-xs mt-1">Future appointment module will populate this table</p>
                              </td>
                            </tr>
                          ) : (
                            (selectedPatient.timeline || []).filter((t) => t.type === "Consultation").map((v, i) => (
                              <tr key={v.id} className={`border-t ${darkMode ? "border-slate-700" : "border-slate-100"}`}>
                                <td className="p-3 text-slate-500 text-xs">#{i + 1}</td>
                                <td className="p-3 text-xs font-mono">{v.date}</td>
                                <td className="p-3 text-xs">{selectedPatient.primaryDoctor || "—"}</td>
                                <td className="p-3 text-xs">{v.details}</td>
                                <td className="p-3 text-xs text-slate-400">—</td>
                                <td className="p-3 text-xs text-slate-400">—</td>
                                <td className="p-3 text-xs text-slate-400">—</td>
                                <td className="p-3 text-xs text-slate-400">—</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* BILLING (Part 9) */}
                {activeTab === "billing" && (
                  <div>
                    <SectionHeader title="Billing Summary" icon="💳" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {[
                        { label: "Total Bills", value: "₹0", color: "text-cyan-600", icon: "📄" },
                        { label: "Paid Amount", value: "₹0", color: "text-green-600", icon: "✅" },
                        { label: "Pending", value: "₹0", color: "text-orange-500", icon: "⏳" },
                        { label: "Insurance Coverage", value: "₹0", color: "text-blue-600", icon: "🛡" },
                        { label: "Outstanding Balance", value: `₹${balance}`, color: balance > 0 ? "text-red-600" : "text-green-600", icon: "⚠️" },
                        { label: "Insurance Provider", value: selectedPatient.insuranceProvider || "None", color: "text-slate-600", icon: "🏢" },
                      ].map((item) => (
                        <div key={item.label} className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <div className="text-xl mb-1">{item.icon}</div>
                          <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                          <div className="text-xs text-slate-500">{item.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`p-4 rounded-xl border-2 border-dashed text-center ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                      <p className="text-sm font-medium">Billing backend integration ready</p>
                      <p className="text-xs mt-1">Full billing history will appear here once the billing module is connected</p>
                    </div>
                  </div>
                )}

                {/* CLINICAL ALERTS (Part 11) */}
                {activeTab === "alerts" && (
                  <div>
                    <SectionHeader title="Clinical Alerts" icon="🚨" />
                    {alerts.length === 0 ? (
                      <div className={`text-center py-10 rounded-xl border-2 border-dashed ${darkMode ? "border-slate-700 text-slate-500" : "border-green-200 text-slate-400"}`}>
                        <div className="text-4xl mb-2">✅</div>
                        <p className="font-medium text-green-600">No active clinical alerts</p>
                        <p className="text-sm">Alerts are generated automatically based on patient data.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {alerts.map((a, i) => (
                          <div key={i} className={`p-4 rounded-xl ${a.color} text-white`}>
                            <div className="text-2xl mb-1">⚠️</div>
                            <p className="font-bold">{a.label}</p>
                            <p className="text-xs opacity-80 mt-1">Auto-detected from patient record</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4">
                      <p className={`text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2`}>Alert Types (Reference)</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "Diabetic", color: "bg-orange-500" },
                          { label: "Hypertension", color: "bg-red-500" },
                          { label: "Critical Lab", color: "bg-red-700" },
                          { label: "Drug Allergy", color: "bg-pink-600" },
                          { label: "Pregnancy", color: "bg-purple-500" },
                          { label: "Fall Risk", color: "bg-yellow-600" },
                        ].map((a) => (
                          <span key={a.label} className={`px-3 py-1 rounded-full text-white text-xs font-medium opacity-50 ${a.color}`}>{a.label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* DOCTOR NOTES (Part 12) */}
                {activeTab === "notes" && (
                  <div>
                    <SectionHeader title="Doctor Notes" icon="📝" />
                    <div className={`p-5 rounded-xl border min-h-[200px] ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                      {selectedPatient.visitNotes
                        ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedPatient.visitNotes}</p>
                        : <p className="text-slate-400 text-sm">No doctor notes recorded. Use the Edit button to add clinical notes.</p>
                      }
                    </div>
                    <div className={`mt-4 p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
                      <p className="text-xs text-blue-600 font-medium">💡 Rich text editor with templates, dictation, and co-signature support — coming in next release.</p>
                    </div>
                  </div>
                )}

                {/* AI HEALTH SUMMARY (Part 10) */}
                {activeTab === "ai" && (
                  <div>
                    <SectionHeader title="AI Health Summary" icon="🤖" />
                    <div className={`p-8 rounded-2xl border-2 border-dashed text-center ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                      <div className="text-5xl mb-4">🤖</div>
                      <h3 className="text-xl font-bold mb-2">AI Analysis Coming Soon</h3>
                      <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                        Future AI engine will automatically analyze patient data and generate intelligent health summaries.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                        {[
                          { icon: "📊", title: "Overall Health Score", desc: "AI-computed health index from vitals, labs, and history" },
                          { icon: "📈", title: "Laboratory Trends", desc: "Pattern analysis across multiple lab reports over time" },
                          { icon: "⚠️", title: "Risk Prediction", desc: "Predictive alerts for deterioration or disease progression" },
                          { icon: "💊", title: "Medication Analysis", desc: "Drug interactions, adherence scoring, alternatives" },
                          { icon: "🏥", title: "Visit Pattern Analysis", desc: "Frequency, severity trends, department routing" },
                          { icon: "🔮", title: "Predictive Discharge", desc: "Expected recovery timeline and discharge readiness" },
                        ].map((item) => (
                          <div key={item.title} className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                            <div className="text-xl mb-1">{item.icon}</div>
                            <p className="font-semibold text-sm">{item.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className={`flex justify-between items-center px-6 py-4 border-t rounded-b-2xl ${darkMode ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-slate-50"}`}>
                <div className="text-xs text-slate-400">
                  Patient ID: <span className="font-mono">{selectedPatient.id}</span> · Registered: {selectedPatient.registeredDate}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { handleEdit(selectedPatient); setSelectedPatient(null); }} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">✏ Edit Record</button>
                  <button onClick={() => generatePatientPDF(selectedPatient)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">📄 Export PDF</button>
                  <button onClick={() => setSelectedPatient(null)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-700"}`}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
