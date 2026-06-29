// src/pages/PatientsPage.jsx
// MediCare Pro — Enterprise Patient Management
// Upgraded: Phase 1 (DOB + Gov ID) | Phase 2 (QR + Duplicate Detection)
//           Phase 3 (Visit Counter + 4-tier Priority) | Phase 4 (Family Info)

import { useState, useEffect, useMemo, useCallback } from "react";
import jsPDF from "jspdf";
import PatientProfileModal from "../components/patient/PatientProfileModal";
import DuplicateAlert     from "../components/patient/DuplicateAlert";
import PriorityBadge      from "../components/patient/PriorityBadge";
import { FamilyInfoForm } from "../components/patient/FamilyInfoSection";
import {
  calculateAge,
  calculateBMI,
  getBMICategory,
  getRiskLevel,
  getClinicalAlerts,
  getPatientLabReports,
  getLatestVisit,
  getOutstandingBalance,
  getVisitCount,
  visitCountLabel,
  statusColor,
  riskColor,
  PRIORITY_OPTIONS,
  findDuplicate,
  buildQRPayload,
  dispatchPatientsUpdate,
  ageDisplay,
} from "../utils/patientHelpers";

// ─── Initial Seed Data ────────────────────────────────────────────────────────
const initialPatients = [
  {
    id: "PAT-1001",
    name: "Ravi Kumar",
    // Legacy record: has age, no dob — calculateAge() handles this gracefully
    age: "32",
    dob: "",
    gender: "Male",
    bloodGroup: "O+",
    phone: "9876543210",
    disease: "Fever",
    address: "Davangere",
    status: "Waiting",
    priority: "Normal",
    registeredDate: "2026-06-15",
    photo: "",
    govIdType: "",
    govIdNumber: "",
    family: [],
    timeline: [
      { id: 1, date: "2026-06-15", type: "Registration",  title: "Patient Registered",  details: "Patient record created in MediCare Pro." },
      { id: 2, date: "2026-06-16", type: "Consultation",  title: "Doctor Consultation", details: "Visited for fever and general checkup." },
    ],
  },
];

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = () => ({
  // Core
  name: "", dob: "", age: "", gender: "Male", bloodGroup: "O+", phone: "",
  disease: "", status: "Waiting", priority: "Normal", address: "",
  // Gov ID (Phase 1)
  govIdType: "Aadhaar", govIdNumber: "",
  // Vitals
  emergencyContact: "", allergies: "", medicalHistory: "", visitNotes: "",
  photo: "", photoSource: "Browse Photo",
  height: "", weight: "", bloodPressure: "", pulse: "", temperature: "",
  respiratoryRate: "", oxygenSaturation: "",
  // Personal & Admin
  maritalStatus: "", occupation: "", insuranceProvider: "", insuranceNumber: "",
  primaryDoctor: "", department: "", chronicDiseases: "",
  currentMedications: "", lifestyleNotes: "", smoking: "No",
  alcohol: "No", pregnancyStatus: "N/A", organDonor: "No",
  disability: "", emergencyNotes: "",
  // Family (Phase 4)
  family: [],
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

  const [search, setSearch]             = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [editingId, setEditingId]       = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(emptyForm());
  // Phase 2 — duplicate detection
  const [duplicate, setDuplicate]       = useState(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // Persist + broadcast
  useEffect(() => {
    localStorage.setItem("patients", JSON.stringify(patients));
    dispatchPatientsUpdate();
  }, [patients]);

  // Sync listener (cross-tab / cross-module)
  useEffect(() => {
    const load = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("patients")) || [];
        setPatients(saved);
      } catch (e) { console.error("Sync error:", e); }
    };
    window.addEventListener("patientsUpdated", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("patientsUpdated", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  // ─── Duplicate detection: runs whenever relevant form fields change ─────────
  useEffect(() => {
    if (!showForm || duplicateDismissed) return;
    const found = findDuplicate(patients, form, editingId);
    setDuplicate(found || null);
  }, [form.phone, form.govIdNumber, form.govIdType, form.name, form.dob, showForm, duplicateDismissed]);

  // ─── Computed values ────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => ({
    total:          patients.length,
    active:         patients.filter((p) => p.status !== "Completed").length,
    waiting:        patients.filter((p) => p.status === "Waiting").length,
    inConsultation: patients.filter((p) => p.status === "In Consultation").length,
    labTest:        patients.filter((p) => p.status === "Lab Test").length,
    billing:        patients.filter((p) => p.status === "Billing").length,
    critical:       patients.filter((p) => p.status === "Critical" || p.priority === "Critical" || getRiskLevel(p) === "Critical").length,
    todayReg:       patients.filter((p) => p.registeredDate === today).length,
  }), [patients, today]);

  const filteredPatients = useMemo(() => patients.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.name?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.govIdNumber?.toLowerCase().includes(q);
    const matchGender   = genderFilter   === "All" || p.gender   === genderFilter;
    const matchStatus   = statusFilter   === "All" || p.status   === statusFilter;
    const matchPriority = priorityFilter === "All" || p.priority === priorityFilter;
    return matchSearch && matchGender && matchStatus && matchPriority;
  }), [patients, search, genderFilter, statusFilter, priorityFilter]);

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const inputClass = `border p-3 rounded-lg text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block";
  const bg     = darkMode ? "bg-slate-950 text-white"  : "bg-slate-100 text-slate-900";
  const cardBg = darkMode ? "bg-slate-900"             : "bg-white";

  // ─── Photo handler ──────────────────────────────────────────────────────────
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  // ─── Reset form ─────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
    setDuplicate(null);
    setDuplicateDismissed(false);
  }, []);

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    // Require at least one of DOB or legacy age
    const hasAge = form.dob || form.age;
    if (!form.name || !hasAge || !form.phone || !form.disease || !form.address) {
      alert("Please fill all required fields: Name, Date of Birth, Phone, Condition, Address.");
      return;
    }
    // Block on unacknowledged duplicate
    if (duplicate && !duplicateDismissed) {
      alert("A duplicate patient was detected. Please open the existing profile or click 'Register Anyway'.");
      return;
    }

    if (editingId) {
      setPatients((prev) =>
        prev.map((p) => p.id === editingId ? { ...p, ...form } : p)
      );
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

  // ─── Edit ────────────────────────────────────────────────────────────────────
  const handleEdit = useCallback((patient) => {
    setEditingId(patient.id);
    setForm({
      name:              patient.name              || "",
      dob:               patient.dob               || "",
      age:               patient.age               || "",
      gender:            patient.gender            || "Male",
      bloodGroup:        patient.bloodGroup        || "O+",
      phone:             patient.phone             || "",
      disease:           patient.disease           || "",
      status:            patient.status            || "Waiting",
      priority:          patient.priority          || "Normal",
      address:           patient.address           || "",
      govIdType:         patient.govIdType         || "Aadhaar",
      govIdNumber:       patient.govIdNumber       || "",
      emergencyContact:  patient.emergencyContact  || "",
      allergies:         patient.allergies         || "",
      medicalHistory:    patient.medicalHistory    || "",
      visitNotes:        patient.visitNotes        || "",
      photo:             patient.photo             || "",
      photoSource:       patient.photoSource       || "Browse Photo",
      height:            patient.height            || "",
      weight:            patient.weight            || "",
      bloodPressure:     patient.bloodPressure     || "",
      pulse:             patient.pulse             || "",
      temperature:       patient.temperature       || "",
      respiratoryRate:   patient.respiratoryRate   || "",
      oxygenSaturation:  patient.oxygenSaturation  || "",
      maritalStatus:     patient.maritalStatus     || "",
      occupation:        patient.occupation        || "",
      insuranceProvider: patient.insuranceProvider || "",
      insuranceNumber:   patient.insuranceNumber   || "",
      primaryDoctor:     patient.primaryDoctor     || "",
      department:        patient.department        || "",
      chronicDiseases:   patient.chronicDiseases   || "",
      currentMedications:patient.currentMedications|| "",
      lifestyleNotes:    patient.lifestyleNotes    || "",
      smoking:           patient.smoking           || "No",
      alcohol:           patient.alcohol           || "No",
      pregnancyStatus:   patient.pregnancyStatus   || "N/A",
      organDonor:        patient.organDonor        || "No",
      disability:        patient.disability        || "",
      emergencyNotes:    patient.emergencyNotes    || "",
      family:            patient.family            || [],
      timeline:          patient.timeline          || [],
    });
    setDuplicate(null);
    setDuplicateDismissed(false);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ─── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback((id) => {
    if (!window.confirm("Delete this patient record? This cannot be undone.")) return;
    setPatients((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ─── Update from Modal (timeline edits) ─────────────────────────────────────
  const handlePatientsUpdate = useCallback((updated) => {
    setPatients(updated);
    // Keep selectedPatient in sync
    if (selectedPatient) {
      const refreshed = updated.find((p) => p.id === selectedPatient.id);
      if (refreshed) setSelectedPatient(refreshed);
    }
  }, [selectedPatient]);

  // ─── PDF Export ──────────────────────────────────────────────────────────────
  const generatePatientPDF = useCallback((patient) => {
    const doc        = new jsPDF();
    const labReports = getPatientLabReports(patient.id, patient.name);
    const risk       = getRiskLevel(patient);
    const alerts     = getClinicalAlerts(patient);
    const bmi        = calculateBMI(patient.height, patient.weight);
    const age        = calculateAge(patient.dob, patient.age);
    const visitCount = getVisitCount(patient.timeline);

    // Header
    doc.setFillColor(6, 182, 212);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("MediCare Pro", 14, 12);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("Enterprise Electronic Medical Record System", 14, 19);
    doc.text("Smart Healthcare Dashboard", 14, 25);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Patient ID: ${patient.id}`, 14, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 49);
    doc.text(`Risk Level: ${risk}  |  Priority: ${patient.priority || "Normal"}`, 120, 42);
    doc.text(`Status: ${patient.status || "N/A"}  |  Visits: #${visitCount}`, 120, 49);

    doc.setDrawColor(6, 182, 212);
    doc.setLineWidth(0.5);
    doc.line(14, 54, 196, 54);

    // Patient Information
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("PATIENT INFORMATION", 14, 62);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const details = [
      [`Name: ${patient.name}`,                                    `Age: ${age !== null ? age + " yrs" : "N/A"}`],
      [`DOB: ${patient.dob || "Not Recorded"}`,                    `Gender: ${patient.gender}`],
      [`Blood Group: ${patient.bloodGroup}`,                       `Marital Status: ${patient.maritalStatus || "Not Recorded"}`],
      [`Phone: ${patient.phone}`,                                  `Occupation: ${patient.occupation || "Not Recorded"}`],
      [`Address: ${patient.address || "Not Recorded"}`,            `Emergency Contact: ${patient.emergencyContact || "Not Recorded"}`],
      [`Gov ID: ${patient.govIdType || "N/A"} — ${patient.govIdNumber || "Not Recorded"}`, `Insurance: ${patient.insuranceProvider || "Not Recorded"}`],
      [`Insurance No: ${patient.insuranceNumber || "Not Recorded"}`, `Primary Doctor: ${patient.primaryDoctor || "Not Recorded"}`],
      [`Department: ${patient.department || "Not Recorded"}`,      ``],
    ];
    details.forEach(([left, right], i) => {
      doc.text(left, 14, 70 + i * 7);
      if (right) doc.text(right, 110, 70 + i * 7);
    });

    // QR code note
    doc.setFontSize(8); doc.setFont("helvetica", "italic");
    doc.text(`QR Payload: ${buildQRPayload(patient)}`, 14, 130);
    doc.setFont("helvetica", "normal");

    let y = 138;
    doc.line(14, y - 2, 196, y - 2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("VITAL SIGNS", 14, y + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const vitals = [
      [`Height: ${patient.height ? patient.height + " cm" : "Not Recorded"}`, `Weight: ${patient.weight ? patient.weight + " kg" : "Not Recorded"}`],
      [`BMI: ${bmi ? `${bmi} (${getBMICategory(bmi)})` : "Not Recorded"}`,    `Blood Pressure: ${patient.bloodPressure || "Not Recorded"}`],
      [`Pulse: ${patient.pulse ? patient.pulse + " bpm" : "Not Recorded"}`,    `Temperature: ${patient.temperature ? patient.temperature + " °F" : "Not Recorded"}`],
      [`Resp. Rate: ${patient.respiratoryRate ? patient.respiratoryRate + " /min" : "Not Recorded"}`, `O₂ Saturation: ${patient.oxygenSaturation ? patient.oxygenSaturation + " %" : "Not Recorded"}`],
    ];
    vitals.forEach(([left, right], i) => {
      doc.text(left, 14, y + 13 + i * 7);
      if (right) doc.text(right, 110, y + 13 + i * 7);
    });

    y = 195;
    doc.line(14, y - 2, 196, y - 2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("MEDICAL SUMMARY", 14, y + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`Disease/Condition: ${patient.disease || "Not Recorded"}`,            14, y + 13);
    doc.text(`Allergies: ${patient.allergies || "None"}`,                           14, y + 20);
    doc.text(`Medical History: ${patient.medicalHistory || "None"}`,                14, y + 27);
    doc.text(`Chronic Diseases: ${patient.chronicDiseases || "None"}`,              14, y + 34);
    doc.text(`Current Medications: ${patient.currentMedications || "None"}`,        14, y + 41);
    doc.text(`Organ Donor: ${patient.organDonor || "No"} | Smoking: ${patient.smoking || "No"} | Alcohol: ${patient.alcohol || "No"}`, 14, y + 48);

    if (alerts.length > 0) {
      y += 56;
      doc.setFont("helvetica", "bold");
      doc.text(`Clinical Alerts: ${alerts.map((a) => a.label).join(", ")}`, 14, y);
    }

    // Family Info
    if (Array.isArray(patient.family) && patient.family.length > 0) {
      y += 15;
      if (y > 230) { doc.addPage(); y = 20; }
      doc.line(14, y - 2, 196, y - 2);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("FAMILY INFORMATION", 14, y + 5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      patient.family.forEach((m, i) => {
        doc.text(
          `${m.relationship || "Family"}: ${m.name || "—"}  |  Phone: ${m.phone || "—"}${m.isEmergency ? "  [Emergency]" : ""}`,
          14, y + 13 + i * 7
        );
      });
      y += 13 + patient.family.length * 7;
    }

    // Lab reports
    if (labReports.length > 0) {
      y += 10;
      if (y > 230) { doc.addPage(); y = 20; }
      doc.line(14, y - 2, 196, y - 2);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("LATEST LABORATORY REPORTS", 14, y + 5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      labReports.slice(0, 3).forEach((lab, i) => {
        doc.text(`${i + 1}. ${lab.testName || lab.profileName || "Test"} — ${lab.status || "N/A"} — ${lab.requestDate || ""}`, 14, y + 13 + i * 7);
      });
    }

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

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text("MediCare Pro — Confidential Medical Record — Not for public disclosure", 14, 285);
      doc.text(`Page ${i} of ${pageCount}`, 170, 285);
      doc.text(`Visit #${visitCount} | Priority: ${patient.priority || "Normal"} | Doctor Signature: _________________`, 14, 290);
    }

    doc.setTextColor(0, 0, 0);
    doc.save(`${patient.id}_MedicalRecord.pdf`);
  }, []);

  // ─── Stat card ───────────────────────────────────────────────────────────────
  const Card = ({ color, label, value, icon }) => (
    <div className={`${color} text-white p-4 rounded-xl flex items-center gap-3 shadow`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );

  // ─── RENDER ──────────────────────────────────────────────────────────────────
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
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm());
              setDuplicate(null);
              setDuplicateDismissed(false);
              setShowForm(!showForm);
            }}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {showForm ? "✕ Close Form" : "+ Register Patient"}
          </button>
        </div>
      </div>

      {/* ── Dashboard Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <Card color="bg-cyan-600"   label="Total"       value={stats.total}          icon="👥" />
        <Card color="bg-blue-600"   label="Active"      value={stats.active}         icon="✅" />
        <Card color="bg-green-600"  label="Waiting"     value={stats.waiting}        icon="⏳" />
        <Card color="bg-indigo-600" label="In Consult." value={stats.inConsultation} icon="👨‍⚕️" />
        <Card color="bg-yellow-600" label="Lab Tests"   value={stats.labTest}        icon="🔬" />
        <Card color="bg-purple-600" label="Billing"     value={stats.billing}        icon="💳" />
        <Card color="bg-red-600"    label="Critical"    value={stats.critical}       icon="🚨" />
        <Card color="bg-teal-600"   label="Today"       value={stats.todayReg}       icon="📅" />
      </div>

      {/* ── Registration Form ── */}
      {showForm && (
        <div className={`mb-6 rounded-2xl shadow-lg p-6 ${cardBg}`}>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            🏥 {editingId ? "Edit Patient Record" : "New Patient Registration"}
          </h2>

          {/* Duplicate alert */}
          <DuplicateAlert
            duplicate={duplicate}
            onOpenProfile={() => {
              if (duplicate) {
                setSelectedPatient(duplicate);
                resetForm();
              }
            }}
            onDismiss={() => setDuplicateDismissed(true)}
            darkMode={darkMode}
          />

          <form onSubmit={handleSubmit}>

            {/* ── PHASE 1 – Basic Information with DOB ── */}
            <div className="mb-4">
              <p className={labelClass}>Basic Information <span className="text-red-500">*Required</span></p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input className={`${inputClass} w-full`} placeholder="Patient full name" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                {/* Date of Birth (Phase 1) — replaces manual age */}
                <div>
                  <label className={labelClass}>Date of Birth *</label>
                  <input
                    className={`${inputClass} w-full`}
                    type="date"
                    value={form.dob}
                    max={today}
                    onChange={(e) => {
                      const dob = e.target.value;
                      const age = calculateAge(dob, "");
                      setForm({ ...form, dob, age: age !== null ? String(age) : "" });
                    }}
                  />
                  {form.dob && (
                    <p className="text-xs text-cyan-500 mt-1 font-medium">
                      Age: {calculateAge(form.dob, "")} years
                    </p>
                  )}
                  {/* Legacy fallback for records without DOB */}
                  {!form.dob && (
                    <input
                      className={`${inputClass} w-full mt-1`}
                      placeholder="Or enter age (legacy)"
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                    />
                  )}
                </div>

                <div>
                  <label className={labelClass}>Gender *</label>
                  <select className={`${inputClass} w-full`} value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Blood Group</label>
                  <select className={`${inputClass} w-full`} value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
                    <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>Unknown</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Phone *</label>
                  <input className={`${inputClass} w-full`} placeholder="10-digit number" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>

                <div>
                  <label className={labelClass}>Condition / Disease *</label>
                  <input className={`${inputClass} w-full`} placeholder="Primary complaint" value={form.disease}
                    onChange={(e) => setForm({ ...form, disease: e.target.value })} />
                </div>

                <div>
                  <label className={labelClass}>Status</label>
                  <select className={`${inputClass} w-full`} value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="Waiting">Waiting</option>
                    <option value="In Consultation">In Consultation</option>
                    <option value="Lab Test">Lab Test</option>
                    <option value="Billing">Billing</option>
                    <option value="Critical">Critical</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Address *</label>
                  <input className={`${inputClass} w-full`} placeholder="Full address" value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
            </div>

            {/* ── PHASE 1 – Government ID ── */}
            <div className="mb-4">
              <p className={labelClass}>Government Identity</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>ID Type</label>
                  <select className={`${inputClass} w-full`} value={form.govIdType}
                    onChange={(e) => setForm({ ...form, govIdType: e.target.value })}>
                    <option value="">Select ID Type</option>
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    {form.govIdType === "Aadhaar" ? "Aadhaar Number (last 4)" :
                     form.govIdType === "Passport" ? "Passport Number" :
                     form.govIdType === "Driving License" ? "DL Number" : "ID Number"}
                  </label>
                  <input
                    className={`${inputClass} w-full`}
                    placeholder={
                      form.govIdType === "Aadhaar" ? "XXXX XXXX XXXX" :
                      form.govIdType === "Passport" ? "A1234567" :
                      form.govIdType === "Driving License" ? "KA01 20120012345" :
                      "Enter ID number"
                    }
                    value={form.govIdNumber}
                    onChange={(e) => setForm({ ...form, govIdNumber: e.target.value })}
                  />
                </div>
                {/* Phase 3 — Priority */}
                <div>
                  <label className={labelClass}>Patient Priority</label>
                  <select className={`${inputClass} w-full`} value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Vitals ── */}
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

            {/* ── Personal & Admin ── */}
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

            {/* ── Medical History ── */}
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

            {/* ── PHASE 4 – Family Information ── */}
            <div className="mb-4">
              <p className={labelClass}>Family Information</p>
              <FamilyInfoForm
                family={form.family || []}
                onChange={(family) => setForm({ ...form, family })}
                darkMode={darkMode}
              />
            </div>

            {/* ── Photo ── */}
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

            {/* ── Submit ── */}
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
          placeholder="🔍 Search by name, ID, phone or Gov ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${inputClass} min-w-[150px]`} value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
          <option value="All">All Genders</option>
          <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
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
        <select className={`${inputClass} min-w-[150px]`} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="All">All Priorities</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* ── Patient Table ── */}
      <div className={`rounded-2xl shadow overflow-x-auto ${cardBg}`}>
        <table className="w-full text-sm min-w-[1600px]">
          <thead className={`${darkMode ? "bg-slate-800" : "bg-slate-50"} border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
            <tr>
              {["Photo", "Patient ID", "Name", "Age/DOB", "Blood", "Contact", "Gov ID", "Condition", "Priority", "Status", "Risk", "Visits", "Doctor", "Last Visit", "Lab", "Registered", "Actions"].map((h) => (
                <th key={h} className="p-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => {
              const riskLevel  = getRiskLevel(patient);
              const labCount   = getPatientLabReports(patient.id, patient.name).length;
              const lastVisit  = getLatestVisit(patient.timeline);
              const age        = calculateAge(patient.dob, patient.age);
              const visitCount = getVisitCount(patient.timeline);
              return (
                <tr key={patient.id} className={`border-b transition-colors ${darkMode ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-50"}`}>
                  {/* Photo */}
                  <td className="p-3">
                    {patient.photo
                      ? <img src={patient.photo} alt={patient.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200" />
                      : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">{patient.name?.charAt(0) || "?"}</div>
                    }
                  </td>
                  {/* ID */}
                  <td className="p-3"><span className="font-mono font-bold text-cyan-500 text-xs">{patient.id}</span></td>
                  {/* Name */}
                  <td className="p-3 font-semibold">{patient.name}</td>
                  {/* Age / DOB */}
                  <td className="p-3 text-xs">
                    <span className="font-semibold">{age !== null ? `${age}y` : "—"}</span>
                    {patient.dob && <span className="text-slate-400 ml-1">{patient.dob}</span>}
                    <span className="text-slate-400"> / {patient.gender}</span>
                  </td>
                  {/* Blood */}
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border">{patient.bloodGroup || "?"}</span>
                  </td>
                  {/* Phone */}
                  <td className="p-3 text-xs">{patient.phone}</td>
                  {/* Gov ID */}
                  <td className="p-3 text-xs">
                    {patient.govIdType ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? "bg-slate-700 text-slate-300" : "bg-blue-50 text-blue-700"}`}>
                        {patient.govIdType}
                      </span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  {/* Condition */}
                  <td className="p-3 text-xs max-w-[120px] truncate">{patient.disease}</td>
                  {/* Priority (Phase 3) */}
                  <td className="p-3">
                    <PriorityBadge priority={patient.priority || "Normal"} size="sm" />
                  </td>
                  {/* Status */}
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${statusColor(patient.status)}`}>
                      {patient.status || "Unknown"}
                    </span>
                  </td>
                  {/* Risk */}
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${riskColor(riskLevel)}`}>
                      {riskLevel}
                    </span>
                  </td>
                  {/* Visit counter (Phase 3) */}
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      visitCount > 0
                        ? "bg-cyan-100 text-cyan-700"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {visitCount > 0 ? `Visit #${visitCount}` : "No visits"}
                    </span>
                  </td>
                  {/* Doctor */}
                  <td className="p-3 text-xs">{patient.primaryDoctor || <span className="text-slate-400">—</span>}</td>
                  {/* Last visit */}
                  <td className="p-3 text-xs">{lastVisit ? lastVisit.date : <span className="text-slate-400">—</span>}</td>
                  {/* Lab count */}
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${labCount > 0 ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500"}`}>
                      {labCount} report{labCount !== 1 ? "s" : ""}
                    </span>
                  </td>
                  {/* Registered */}
                  <td className="p-3 text-xs text-slate-500">{patient.registeredDate}</td>
                  {/* Actions */}
                  <td className="p-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => setSelectedPatient(patient)} className="bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors">View</button>
                      <button onClick={() => handleEdit(patient)}          className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors">Edit</button>
                      <button onClick={() => generatePatientPDF(patient)}  className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors">PDF</button>
                      <button onClick={() => handleDelete(patient.id)}     className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors">Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredPatients.length === 0 && (
              <tr>
                <td colSpan="17" className="p-10 text-center text-slate-400">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="font-medium">No patients found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Patient Profile Modal ── */}
      {selectedPatient && (
        <PatientProfileModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onEdit={handleEdit}
          onExportPDF={generatePatientPDF}
          patients={patients}
          setPatients={handlePatientsUpdate}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}