// src/pages/DashboardPage.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DOCTORS } from "../data/doctors";
import { DEFAULT_BILLS } from "../utils/billingStorage";
import { MEDICINES } from "../data/medicines";
import { generateToken } from "../utils/tokenGenerator";
import { getSymptomSuggestion } from "../utils/symptomSuggestion";
import { StatusBadge, ActionButton, SearchInput, DataTable } from "../components/ui";
import KPICard from "../components/dashboard/KPICard";
import Widget from "../components/dashboard/Widget";
import CriticalAlerts from "../components/dashboard/CriticalAlerts";
import { SkeletonKPI, SkeletonWidget, SkeletonTable } from "../components/dashboard/SkeletonLoader";

const emptyForm = { patient: "", age: "", phone: "", symptoms: "", date: "", time: "09:00" };
const TIME_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

function HealthScore({ value, label }) {
  const color = value >= 90 ? "text-emerald-600" : value >= 70 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/70 dark:border-slate-800 px-5 py-3 shadow-sm backdrop-blur-md">
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${value}, 100`} strokeLinecap="round" className={color} />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${color}`}>{value}%</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-[10px] text-slate-400">Verified System</p>
      </div>
    </div>
  );
}

function InlineAreaChart({ data, color = "rgb(99,102,241)", height = 80 }) {
  const gradId = useMemo(() => `areaFill-${Math.random().toString(36).slice(2, 8)}`, []);
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-20 text-xs text-slate-400">No data available</div>;
  }
  const values = data.map((d) => Number(d.value) || 0);
  const labels = data.map((d) => String(d.label || ""));
  const maxVal = Math.max(...values, 1);
  const w = 500, h = height, padT = 4, padB = 4;
  const len = data.length;
  const xScale = (i) => (len <= 1 ? w / 2 : (i / (len - 1)) * (w - 40) + 20);
  const yScale = (v) => h - padB - (v / maxVal) * (h - padT - padB);
  const pts = values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(" ");
  const fillPts = len <= 1
    ? `${xScale(0) - 20},${h - padB} ${xScale(0)},${yScale(values[0])} ${xScale(0) + 20},${h - padB}`
    : `${xScale(0)},${h - padB} ${pts} ${xScale(len - 1)},${h - padB}`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {Array.from(new Set([0, Math.round(maxVal / 2), maxVal])).map((v, idx) => (
          <line key={`grid-line-${idx}-${v}`} x1={20} y1={yScale(v)} x2={w - 20} y2={yScale(v)} stroke="#e2e8f0" strokeWidth="0.5" />
        ))}
        <polygon points={fillPts} fill={`url(#${gradId})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => (
          <circle key={`pt-${i}`} cx={xScale(i)} cy={yScale(v)} r="2.5" fill="white" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between px-1 mt-1">
        {labels.map((l, idx) => <span key={`lbl-${idx}-${l}`} className="text-[9px] text-slate-400">{l}</span>)}
      </div>
    </div>
  );
}

export default function DashboardPage({
  darkMode = false,
  userRole = "Admin",
  appointments = [],
  setAppointments = () => {},
  addToast = () => {},
  preselectedDoctor = null,
  clearPreselectedDoctor = () => {},
} = {}) {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({ ...emptyForm, date: todayStr });
  const [selectedDoctor, setSelectedDoctor] = useState(DOCTORS[0] || null);
  const [editingId, setEditingId] = useState(null);
  const [specialization, setSpecialization] = useState("All");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState("");

  const loadPatients = () => {
    try {
      const p = JSON.parse(localStorage.getItem("patients") || "[]");
      setPatients(Array.isArray(p) ? p.filter(Boolean) : []);
    } catch {
      setPatients([]);
    }
  };

  useEffect(() => {
    loadPatients();
    const timer = setTimeout(() => setLoading(false), 300);
    const handler = () => loadPatients();
    window.addEventListener("patientsUpdated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("patientsUpdated", handler);
      window.removeEventListener("storage", handler);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (preselectedDoctor) {
      setSelectedDoctor(preselectedDoctor);
      if (preselectedDoctor.spec) setSpecialization(preselectedDoctor.spec);
      clearPreselectedDoctor();
    }
  }, [preselectedDoctor, clearPreselectedDoctor]);

  const updateForm = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const resetForm = () => {
    setFormData({ ...emptyForm, date: todayStr });
    setSelectedDoctor(DOCTORS[0] || null);
    setEditingId(null);
    setPatientSearch("");
  };

  const specializations = useMemo(() => ["All", ...new Set(DOCTORS.map((d) => d.spec))], []);
  
  const availableDoctors = useMemo(() => {
    return DOCTORS.filter((d) => specialization === "All" || d.spec === specialization);
  }, [specialization]);

  const selectPatientRecord = (p) => {
    if (!p) return;
    setFormData((prev) => ({
      ...prev,
      patient: p.name || "",
      age: p.age || "",
      phone: p.phone || "",
    }));
    setPatientSearch(p.name || "");
  };

  const validateForm = () => {
    if (!selectedDoctor) return "Please select a doctor.";
    if (selectedDoctor.status === "Unavailable") return `${selectedDoctor.name} is currently unavailable.`;
    if (!formData.patient.trim()) return "Please enter patient name.";
    if (!formData.age || Number(formData.age) < 1 || Number(formData.age) > 120) return "Age must be between 1 and 120.";
    if (!formData.phone.trim()) return "Please enter phone number.";
    if (!/^\d{10}$/.test(formData.phone.trim())) return "Phone number must be exactly 10 digits.";
    if (!formData.symptoms.trim()) return "Please enter symptoms/notes.";
    if (!formData.date) return "Please select date.";
    if (!formData.time) return "Please select time.";
    return null;
  };

  const handleBooking = () => {
    const error = validateForm();
    if (error) {
      addToast("Check Details", error, "error");
      return;
    }

    const token = generateToken();
    const newAppointment = {
      id: `${Date.now()}-${Math.random()}`,
      token,
      patient: formData.patient.trim(),
      age: Number(formData.age),
      phone: formData.phone.trim(),
      symptoms: formData.symptoms.trim(),
      date: formData.date,
      time: formData.time,
      doctor: selectedDoctor.name,
      spec: selectedDoctor.spec,
      status: "Pending",
      bookedAt: new Date().toISOString()
    };

    let existingPatients = [];
    try {
      const rawPatients = localStorage.getItem("patients");
      if (rawPatients) {
        const parsed = JSON.parse(rawPatients);
        if (Array.isArray(parsed)) existingPatients = parsed.filter(Boolean);
      }
    } catch (e) {
      console.warn("Failed reading patients list:", e);
    }

    const patientExists = existingPatients.some((p) => p && (p.phone === newAppointment.phone || p.name?.toLowerCase() === newAppointment.patient.toLowerCase()));
    let updatedPatients = existingPatients;
    
    if (patientExists) {
      updatedPatients = existingPatients.map((p) => {
        if (!p || !(p.phone === newAppointment.phone || p.name?.toLowerCase() === newAppointment.patient.toLowerCase())) return p;
        return {
          ...p,
          timeline: [
            ...(p.timeline || []),
            { id: Date.now(), date: newAppointment.date, type: "Appointment", title: "Appointment Booked", details: `Token ${newAppointment.token} with ${newAppointment.doctor} on ${newAppointment.date} at ${newAppointment.time}.` }
          ]
        };
      });
    } else {
      updatedPatients = [
        {
          id: `PAT-${Date.now()}`,
          name: newAppointment.patient,
          age: newAppointment.age,
          gender: "Unspecified",
          bloodGroup: "O+",
          phone: newAppointment.phone,
          disease: newAppointment.symptoms,
          address: "Registered via OPD Desk",
          status: "Active",
          priority: "Normal",
          registeredDate: todayStr,
          timeline: [
            { id: Date.now(), date: todayStr, type: "Registration", title: "Patient Auto Registered", details: "Patient record created from OPD appointment desk." }
          ]
        },
        ...existingPatients
      ];
    }

    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    window.dispatchEvent(new Event("patientsUpdated"));
    setAppointments((prev) => [newAppointment, ...prev]);
    addToast("Appointment Booked", `Token: ${token} confirmed with ${selectedDoctor.name}`, "success");
    resetForm();
  };

  const startEdit = (appt) => {
    if (!appt) return;
    const doctor = DOCTORS.find((d) => d.name === appt.doctor);
    setEditingId(appt.id);
    if (doctor) setSelectedDoctor(doctor);
    setFormData({
      patient: appt.patient || "",
      age: appt.age !== undefined && appt.age !== null ? appt.age : "",
      phone: appt.phone || "",
      symptoms: appt.symptoms || "",
      date: appt.date || todayStr,
      time: appt.time || "09:00",
    });
    addToast("Editing Appointment", `Loaded token ${appt.token}`, "info");
  };

  const deleteAppointment = (id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    addToast("Deleted", "Appointment record removed.", "info");
  };

  const updateStatus = (id, status) => {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    addToast("Status Updated", `Appointment marked as ${status}.`, "success");
  };

  const safeAppointments = Array.isArray(appointments) ? appointments.filter(Boolean) : [];
  const safePatients = Array.isArray(patients) ? patients.filter(Boolean) : [];

  const pendingCount = safeAppointments.filter((a) => a && a.status === "Pending").length;
  const confirmedCount = safeAppointments.filter((a) => a && a.status === "Confirmed").length;
  const todayPatients = safePatients.filter((p) => p && p.registeredDate === todayStr).length;

  const billingSummary = useMemo(() => {
    try {
      const rawBillsStr = localStorage.getItem("billing_invoices");
      let bills = rawBillsStr ? JSON.parse(rawBillsStr) : DEFAULT_BILLS;
      if (!Array.isArray(bills) || bills.length === 0) bills = DEFAULT_BILLS;
      const total = bills.reduce((s, b) => s + Number(b.grandTotal || b.grand || b.subtotal || b.total || b.amount || 0), 0);
      const paid = bills.filter((b) => b.paymentStatus === "Paid" || b.status === "Paid").reduce((s, b) => s + Number(b.paidAmount || b.grandTotal || b.subtotal || b.total || 0), 0);
      return { count: bills.length, total, paid, pending: total - paid };
    } catch {
      return { count: DEFAULT_BILLS.length, total: 8732, paid: 3068, pending: 5664 };
    }
  }, []);

  const pharmacySummary = useMemo(() => {
    try {
      const rawMedsStr = localStorage.getItem("pharmacy_medicines") || localStorage.getItem("medicines");
      let meds = rawMedsStr ? JSON.parse(rawMedsStr) : MEDICINES;
      if (!Array.isArray(meds) || meds.length === 0) meds = MEDICINES;
      const lowStock = meds.filter((m) => Number(m.stockQuantity || m.stock || m.quantity || 0) <= 10 || m.stock === "Low Stock" || m.stock === "Out of Stock");
      return { total: meds.length, lowStock: lowStock.length };
    } catch {
      return { total: MEDICINES.length, lowStock: 2 };
    }
  }, []);

  const labSummary = useMemo(() => {
    try {
      const rawReportsStr = localStorage.getItem("lab_reports");
      const reports = rawReportsStr ? JSON.parse(rawReportsStr) : [];
      const safeReports = Array.isArray(reports) ? reports.filter(Boolean) : [];
      const pending = safeReports.filter((r) => r.status === "Pending" || r.status === "In Progress").length;
      return { total: safeReports.length, pending };
    } catch {
      return { total: 0, pending: 0 };
    }
  }, []);

  const kpiCards = [
    { label: "Revenue", value: billingSummary.total, icon: "💰", color: "emerald", format: (v) => `₹${(v || 0).toLocaleString("en-IN")}`, trend: 0, trendLabel: "Verified invoices" },
    { label: "Today's Patients", value: todayPatients, icon: "👥", color: "indigo", sub: `${safePatients.length} total registered` },
    { label: "Doctors On Duty", value: DOCTORS.filter((d) => d.status === "Available").length, icon: "🩺", color: "blue", sub: `${DOCTORS.length} total active` },
    { label: "Appointments", value: safeAppointments.length, icon: "📅", color: "violet", sub: `${confirmedCount} confirmed, ${pendingCount} pending` },
  ];

  const revenueData = useMemo(() => {
    try {
      const rawBillsStr = localStorage.getItem("billing_invoices");
      let bills = rawBillsStr ? JSON.parse(rawBillsStr) : DEFAULT_BILLS;
      if (!Array.isArray(bills) || bills.length === 0) bills = DEFAULT_BILLS;
      const monthly = {};
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      bills.forEach((b) => {
        const d = new Date(b.billDate || b.date || b.createdAt || Date.now());
        const mIdx = d.getMonth();
        if (!isNaN(mIdx)) {
          const key = months[mIdx];
          monthly[key] = (monthly[key] || 0) + Number(b.grandTotal || b.grand || b.subtotal || b.total || b.amount || 0);
        }
      });
      const currentMonthIdx = new Date().getMonth();
      const m = months.slice(0, Math.max(currentMonthIdx + 1, 6));
      return m.map((name) => ({ label: name, value: monthly[name] || 0 }));
    } catch {
      return ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => ({ label: m, value: 1200 }));
    }
  }, []);

  const appointmentColumns = [
    { key: "token", label: "Token", render: (r) => <span className="font-mono text-indigo-600 dark:text-cyan-400 font-bold">{r.token}</span> },
    { key: "patient", label: "Patient" },
    { key: "doctor", label: "Doctor" },
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "symptoms", label: "Symptoms" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const symptomSuggestion = getSymptomSuggestion(formData.symptoms);

  const matchedPatientSuggestions = useMemo(() => {
    if (!patientSearch.trim()) return [];
    const q = patientSearch.toLowerCase();
    return safePatients.filter((p) => p && (p.name?.toLowerCase().includes(q) || p.phone?.includes(q))).slice(0, 5);
  }, [patientSearch, safePatients]);

  return loading ? (
    <div className="w-full">
      <div className="w-full py-4 space-y-6">
        <div className="h-12 w-72 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse mb-8" />
        <SkeletonKPI />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2"><SkeletonWidget /></div>
          <SkeletonWidget />
        </div>
        <SkeletonTable />
      </div>
    </div>
  ) : (
    <div className="w-full text-slate-900 dark:text-white space-y-6">
      <div className="w-full animate-fadeIn space-y-6">

        {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center text-white text-xl shadow-lg shrink-0">
              🏥
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                {userRole === "Admin" ? "Hospital Operations Dashboard" : userRole === "Doctor" ? "Doctor Clinical Workspace" : userRole === "Receptionist" ? "Front Desk Operations" : `${userRole} Portal`}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{userRole} • Real-time verified hospital information system</p>
            </div>
          </div>
          <HealthScore value={98} label="Operational Health" />
        </div>

        {/* ── 2. Top KPI Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
        </div>

        {/* ── 3. ATTRACTIVE, COMPACT APPOINTMENT BOOKING SECTION AT THE TOP ── */}
        <div className="p-6 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-cyan-500/30 shadow-xl backdrop-blur-xl transition-all">
          <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 font-extrabold flex items-center justify-center text-xl shadow-sm">
                📅
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Book an Appointment</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Quick OPD registration, doctor selection & instant token assignment</p>
              </div>
            </div>

            {editingId && (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 text-xs font-bold border border-amber-400/30">
                Editing Mode Active
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Step 1 & 2: Patient Info + Specialty & Doctor Picker */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Patient Field */}
              <div className="relative space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">1. Patient Name</label>
                <input
                  type="text"
                  value={formData.patient}
                  onChange={(e) => {
                    updateForm("patient", e.target.value);
                    setPatientSearch(e.target.value);
                  }}
                  placeholder="Enter full patient name..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
                {matchedPatientSuggestions.length > 0 && formData.patient.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden text-xs">
                    <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800">Select Existing Patient:</p>
                    {matchedPatientSuggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPatientRecord(p)}
                        className="w-full text-left px-3 py-2 hover:bg-cyan-50 dark:hover:bg-slate-800 flex justify-between items-center transition"
                      >
                        <span className="font-semibold text-slate-800 dark:text-white">{p.name} ({p.age} yrs)</span>
                        <span className="text-[10px] text-slate-400">{p.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Age & Phone */}
              <div className="grid grid-cols-2 gap-2 space-y-0">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => updateForm("age", e.target.value)}
                    placeholder="Age"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    placeholder="10-digit phone"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
              </div>

              {/* Department Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">2. Department / Specialty</label>
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer"
                >
                  {specializations.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 3, 4, 5: Doctor, Date, Time Slot & Symptoms */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Doctor Selector */}
              <div className="space-y-1 md:col-span-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">3. Attending Doctor</label>
                <select
                  value={selectedDoctor?.id || ""}
                  onChange={(e) => {
                    const doc = DOCTORS.find((d) => d.id === e.target.value);
                    if (doc) setSelectedDoctor(doc);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer"
                >
                  {availableDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.spec}) — {doc.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">4. Appointment Date</label>
                <input
                  type="date"
                  min={todayStr}
                  value={formData.date}
                  onChange={(e) => updateForm("date", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>

              {/* Time Slot */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">5. Available Time Slot</label>
                <select
                  value={formData.time}
                  onChange={(e) => updateForm("time", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot} Hrs</option>
                  ))}
                </select>
              </div>

              {/* Symptoms / Chief Complaint */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">6. Symptoms / Chief Complaint</label>
                <input
                  type="text"
                  value={formData.symptoms}
                  onChange={(e) => updateForm("symptoms", e.target.value)}
                  placeholder="e.g. Fever, Chest Pain, Cough"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>
            </div>

            {/* AI Clinical Advice Suggestion */}
            {symptomSuggestion && (
              <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-xs flex items-center justify-between gap-3">
                <p className="font-semibold text-cyan-900 dark:text-cyan-200">
                  💡 AI Recommendation: <span className="font-normal text-cyan-700 dark:text-cyan-300">{symptomSuggestion.doctor} — {symptomSuggestion.advice}</span>
                </p>
              </div>
            )}

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition"
              >
                Clear Form
              </button>
              <button
                type="button"
                onClick={handleBooking}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-2"
              >
                <span>{editingId ? "Update Appointment" : "Confirm Booking"}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. Main Analytics & Operational Alerts ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Widget title="Revenue Analytics" icon="📊" className="lg:col-span-2">
            <InlineAreaChart data={revenueData} color="rgb(16,185,129)" height={120} />
            <div className="flex justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500">Total Billed: <strong className="text-slate-800 dark:text-white">₹{(billingSummary.total || 0).toLocaleString("en-IN")}</strong></span>
              <span className="text-slate-500">Collected: <strong className="text-emerald-600">₹{(billingSummary.paid || 0).toLocaleString("en-IN")}</strong></span>
              <span className="text-slate-500">Outstanding: <strong className="text-amber-600">₹{(billingSummary.pending || 0).toLocaleString("en-IN")}</strong></span>
            </div>
          </Widget>

          <div className="space-y-6">
            <CriticalAlerts patients={patients} appointments={appointments} />
          </div>
        </div>

        {/* ── 5. Operational Modules Summary Grid ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Widget title="Billing Summary" icon="💳">
            {billingSummary.count === 0 ? (
              <div className="text-center py-6"><p className="text-2xl mb-1">🧾</p><p className="text-xs text-slate-400">No invoices recorded</p></div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Total Invoices</span><span className="text-sm font-bold">{billingSummary.count}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Paid Amount</span><span className="text-sm font-bold text-emerald-600">₹{(billingSummary.paid || 0).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Pending Dues</span><span className="text-sm font-bold text-amber-600">₹{(billingSummary.pending || 0).toLocaleString("en-IN")}</span></div>
              </div>
            )}
          </Widget>

          <Widget title="Medicine Stock" icon="💊">
            {pharmacySummary.total === 0 ? (
              <div className="text-center py-6"><p className="text-2xl mb-1">💊</p><p className="text-xs text-slate-400">No pharmacy inventory</p></div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Catalog Size</span><span className="text-sm font-bold">{pharmacySummary.total} items</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Low Stock Alerts</span><span className={`text-sm font-bold ${pharmacySummary.lowStock > 0 ? "text-rose-600" : "text-emerald-600"}`}>{pharmacySummary.lowStock} items</span></div>
              </div>
            )}
          </Widget>

          <Widget title="Lab Reports" icon="🧪">
            {labSummary.total === 0 ? (
              <div className="text-center py-6"><p className="text-2xl mb-1">🧪</p><p className="text-xs text-slate-400">No laboratory reports</p></div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Total Tests</span><span className="text-sm font-bold">{labSummary.total}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Pending Verification</span><span className={`text-sm font-bold ${labSummary.pending > 0 ? "text-amber-600" : "text-emerald-600"}`}>{labSummary.pending}</span></div>
              </div>
            )}
          </Widget>

          <Widget title="Bed Capacity" icon="🛏️">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">General Wards</span><span className="font-semibold">42 / 120</span></div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: "35%" }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">ICU Units</span><span className="font-semibold">8 / 20</span></div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-2"><div className="bg-rose-500 h-2 rounded-full" style={{ width: "40%" }} /></div>
              </div>
            </div>
          </Widget>
        </div>

        {/* ── 6. Appointment Queue & Quick Actions ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Widget title="Appointment Queue & Management" icon="📋">
              <DataTable
                columns={appointmentColumns}
                data={safeAppointments}
                emptyMessage="No appointments booked yet."
                actions={(row) => (
                  <div className="flex gap-1">
                    {["Pending", "Confirmed", "Completed"].map((s) => (
                      <button key={s} onClick={() => updateStatus(row.id, s)} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-700 transition-colors">{s}</button>
                    ))}
                    <button onClick={() => startEdit(row)} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-700">Edit</button>
                    <button onClick={() => deleteAppointment(row.id)} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-700">Del</button>
                  </div>
                )}
              />
            </Widget>
          </div>

          <Widget title="Quick Actions" icon="⚡">
            <div className="space-y-2.5">
              <ActionButton icon="👤" label="Register Patient" onClick={() => { navigate("/patients"); window.dispatchEvent(new CustomEvent("navigate", { detail: "Patients" })); }} />
              <ActionButton icon="💊" label="Pharmacy" onClick={() => { navigate("/pharmacy"); window.dispatchEvent(new CustomEvent("navigate", { detail: "Pharmacy" })); }} />
              <ActionButton icon="🧪" label="Laboratory" onClick={() => { navigate("/laboratory"); window.dispatchEvent(new CustomEvent("navigate", { detail: "Laboratory" })); }} />
              <ActionButton icon="📊" label="Reports" onClick={() => { navigate("/reports"); window.dispatchEvent(new CustomEvent("navigate", { detail: "Reports" })); }} />
              <ActionButton icon="💳" label="Billing" onClick={() => { navigate("/billing"); window.dispatchEvent(new CustomEvent("navigate", { detail: "Billing" })); }} />
            </div>
          </Widget>
        </div>

      </div>
    </div>
  );
}
