import { useState, useEffect, useMemo } from "react";
import { DOCTORS } from "../data/doctors";
import { generateToken } from "../utils/tokenGenerator";
import { getSymptomSuggestion } from "../utils/symptomSuggestion";
import LiveClock from "../components/LiveClock";
import AnnouncementsPanel from "../components/AnnouncementsPanel";
import { StatusBadge, ActionButton, SearchInput, DataTable } from "../components/ui";
import KPICard from "../components/dashboard/KPICard";
import Widget from "../components/dashboard/Widget";
import CriticalAlerts from "../components/dashboard/CriticalAlerts";
import SystemHealthPanel from "../components/dashboard/SystemHealthPanel";
import { SkeletonKPI, SkeletonWidget, SkeletonTable } from "../components/dashboard/SkeletonLoader";

const emptyForm = { patient: "", age: "", phone: "", symptoms: "", date: "", time: "" };

const activityFeed = [
  { id: 1, user: "Dr. Arjun Raza", action: "completed a consultation", target: "Patient Ravi", time: "2 min ago", type: "consultation" },
  { id: 2, user: "Nurse Priya", action: "admitted", target: "Patient Sunita", time: "8 min ago", type: "admission" },
  { id: 3, user: "Lab Report", action: "results available for", target: "Patient Aman", time: "15 min ago", type: "lab" },
  { id: 4, user: "Reception", action: "booked appointment for", target: "Dr. Sharma", time: "22 min ago", type: "appointment" },
  { id: 5, user: "Pharmacy", action: "dispensed medicine to", target: "Patient Neha", time: "35 min ago", type: "pharmacy" },
  { id: 6, user: "Dr. Vikram", action: "requested MRI for", target: "Patient Meera", time: "1h ago", type: "lab" },
];
function HealthScore({ value, label }) {
  const color = value >= 90 ? "text-emerald-600" : value >= 70 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200/70 px-5 py-3 shadow-sm">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${value}, 100`} strokeLinecap="round" className={color} />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${color}`}>{value}%</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <p className="text-[10px] text-slate-400">All systems normal</p>
      </div>
    </div>
  );
}

function InlineAreaChart({ data, color = "rgb(99,102,241)", height = 80 }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-20 text-xs text-slate-400">No data available</div>;
  }
  const values = data.map((d) => d.value);
  const labels = data.map((d) => d.label);
  const maxVal = Math.max(...values, 1);
  const w = 500, h = height, padT = 4, padB = 4;
  const xScale = (i) => (i / (data.length - 1)) * (w - 40) + 20;
  const yScale = (v) => h - padB - (v / maxVal) * (h - padT - padB);
  const pts = values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(" ");
  const fillPts = `${xScale(0)},${h - padB} ${pts} ${xScale(data.length - 1)},${h - padB}`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, Math.round(maxVal / 2), maxVal].map((v) => (
          <line key={v} x1={20} y1={yScale(v)} x2={w - 20} y2={yScale(v)} stroke="#e2e8f0" strokeWidth="0.5" />
        ))}
        <polygon points={fillPts} fill="url(#areaFill)" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(v)} r="2.5" fill="white" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between px-1 mt-1">
        {labels.map((l) => <span key={l} className="text-[9px] text-slate-400">{l}</span>)}
      </div>
    </div>
  );
}
function InlineBarChart({ data, color = "rgb(99,102,241)", height = 80 }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-20 text-xs text-slate-400">No data available</div>;
  }
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <svg viewBox={`0 0 ${data.length * 60} ${height}`} className="w-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * (height - 16);
          const x = i * 60 + 8;
          const w = 44;
          return (
            <g key={d.label}>
              <rect x={x} y={height - 12 - barH} width={w} height={barH} rx="3" fill={d.color || color} opacity="0.85" />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between px-1 mt-1">
        {data.map((d) => (
          <div key={d.label} className="text-center" style={{ width: `${100 / data.length}%` }}>
            <p className="text-[10px] font-semibold text-slate-600">{d.display || d.value}</p>
            <p className="text-[8px] text-slate-400">{d.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function DashboardPage({
  darkMode, userRole, appointments, setAppointments, addToast, preselectedDoctor, clearPreselectedDoctor,
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [specialization, setSpecialization] = useState("All");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("All");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPatients = () => {
    try { const p = JSON.parse(localStorage.getItem("patients")) || []; setPatients(p); }
    catch { setPatients([]); }
  };

  useEffect(() => {
    loadPatients();
    const timer = setTimeout(() => setLoading(false), 400);
    const handler = () => loadPatients();
    window.addEventListener("patientsUpdated", handler);
    window.addEventListener("storage", handler);
    return () => { window.removeEventListener("patientsUpdated", handler); window.removeEventListener("storage", handler); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (preselectedDoctor) { setSelectedDoctor(preselectedDoctor); clearPreselectedDoctor(); }
  }, [preselectedDoctor, clearPreselectedDoctor]);

  const updateForm = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const resetForm = () => { setFormData(emptyForm); setSelectedDoctor(null); setEditingId(null); };

  const validateForm = () => {
    if (!selectedDoctor) return "Please select a doctor.";
    if (selectedDoctor.status === "Unavailable") return `${selectedDoctor.name} is unavailable.`;
    if (!formData.patient.trim()) return "Please enter patient name.";
    if (!formData.age || Number(formData.age) < 1 || Number(formData.age) > 120) return "Age must be between 1 and 120.";
    if (!formData.phone.trim()) return "Please enter phone number.";
    if (!/^\d{10}$/.test(formData.phone.trim())) return "Phone number must be exactly 10 digits.";
    if (!formData.symptoms.trim()) return "Please enter symptoms.";
    if (!formData.date) return "Please select date.";
    if (!formData.time) return "Please select time.";
    if (new Date(`${formData.date} ${formData.time}`) < new Date()) return "Appointment must be in the future.";
    return null;
  };
  const handleBooking = () => {
    const error = validateForm();
    if (error) { addToast("Check details", error, "error"); return; }
    const duplicate = appointments.some((item) => item.id !== editingId && item.doctor.toLowerCase() === selectedDoctor.name.toLowerCase() && item.date === formData.date && item.time === formData.time);
    if (duplicate) { addToast("Duplicate booking", "This slot is already booked for this doctor.", "error"); return; }
    if (editingId) {
      setAppointments((prev) => prev.map((item) => item.id === editingId ? { ...item, patient: formData.patient.trim(), age: Number(formData.age), phone: formData.phone.trim(), symptoms: formData.symptoms.trim(), date: formData.date, time: formData.time, doctor: selectedDoctor.name, spec: selectedDoctor.spec } : item));
      addToast("Appointment updated", "Changes saved successfully.", "success"); resetForm(); return;
    }
    const token = generateToken();
    const newAppointment = { id: `${Date.now()}-${Math.random()}`, token, patient: formData.patient.trim(), age: Number(formData.age), phone: formData.phone.trim(), symptoms: formData.symptoms.trim(), date: formData.date, time: formData.time, doctor: selectedDoctor.name, spec: selectedDoctor.spec, status: "Pending", bookedAt: new Date().toISOString() };
    const existingPatients = JSON.parse(localStorage.getItem("patients")) || [];
    const patientExists = existingPatients.some((p) => p.phone === newAppointment.phone || p.name?.toLowerCase() === newAppointment.patient.toLowerCase());
    let updatedPatients = existingPatients;
    if (patientExists) {
      updatedPatients = existingPatients.map((p) => {
        if (!(p.phone === newAppointment.phone || p.name?.toLowerCase() === newAppointment.patient.toLowerCase())) return p;
        return { ...p, timeline: [...(p.timeline || []), { id: Date.now(), date: newAppointment.date, type: "Appointment", title: "Appointment Booked", details: `Token ${newAppointment.token} with ${newAppointment.doctor} on ${newAppointment.date} at ${newAppointment.time}.` }] };
      });
    } else {
      updatedPatients = [{ id: `PAT-${Date.now()}`, name: newAppointment.patient, age: newAppointment.age, gender: "Male", bloodGroup: "O+", phone: newAppointment.phone, disease: newAppointment.symptoms, address: "Not provided", emergencyContact: "", allergies: "", medicalHistory: "", visitNotes: "Created from dashboard appointment booking", photo: "", photoSource: "Browse Photo", registeredDate: new Date().toISOString().split("T")[0], timeline: [{ id: Date.now(), date: new Date().toISOString().split("T")[0], type: "Registration", title: "Patient Auto Registered", details: "Patient created from Dashboard appointment booking." }, { id: Date.now() + 1, date: newAppointment.date, type: "Appointment", title: "Appointment Booked", details: `Token ${newAppointment.token} with ${newAppointment.doctor} on ${newAppointment.date} at ${newAppointment.time}.` }] }, ...existingPatients];
    }
    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    window.dispatchEvent(new Event("patientsUpdated"));
    setAppointments((prev) => [newAppointment, ...prev]);
    addToast("Appointment booked", `Token: ${token}`, "success");
    resetForm();
  };
  const startEdit = (appt) => {
    const doctor = DOCTORS.find((d) => d.name === appt.doctor);
    setEditingId(appt.id); setSelectedDoctor(doctor || DOCTORS[0]);
    setFormData({ patient: appt.patient, age: appt.age, phone: appt.phone || "", symptoms: appt.symptoms, date: appt.date, time: appt.time });
    window.scrollTo({ top: 0, behavior: "smooth" });
    addToast("Edit mode active", appt.token, "info");
  };

  const deleteAppointment = (id) => { setAppointments((prev) => prev.filter((a) => a.id !== id)); addToast("Deleted", "Appointment removed.", "info"); };
  const updateStatus = (id, status) => { setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a)); addToast("Status updated", `Marked as ${status}.`, "success"); };
  const clearAll = () => { if (!window.confirm("Clear all appointments?")) return; setAppointments([]); addToast("Cleared", "All appointments removed.", "info"); };

  const specializations = useMemo(() => ["All", ...new Set(DOCTORS.map((d) => d.spec))], []);
  const filteredDoctors = DOCTORS.filter((d) => {
    const q = doctorSearch.toLowerCase();
    return (d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q)) && (specialization === "All" || d.spec === specialization);
  });

  const pendingCount = appointments.filter((a) => a.status === "Pending").length;
  const confirmedCount = appointments.filter((a) => a.status === "Confirmed").length;
  const completedCount = appointments.filter((a) => a.status === "Completed").length;
  const todayPatients = patients.filter((p) => p.registeredDate === new Date().toISOString().split("T")[0]).length;
  const totalPatients = patients.length;
  const completionRate = appointments.length > 0 ? Math.round((completedCount / appointments.length) * 100) : 0;

  const filteredHistory = appointments.filter((a) => {
    const q = historySearch.toLowerCase();
    return (a.patient.toLowerCase().includes(q) || a.token.toLowerCase().includes(q) || a.doctor.toLowerCase().includes(q) || a.symptoms.toLowerCase().includes(q)) && (historyStatus === "All" || a.status === historyStatus);
  });

  const symptomSuggestion = getSymptomSuggestion(formData.symptoms);
  const isPatient = userRole === "Patient";
  const weeklyTrend = useMemo(() => {
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const counts = [0,0,0,0,0,0,0];
    appointments.forEach((a) => {
      try { const d = new Date(a.date); counts[d.getDay()]++; } catch {}
    });
    return dayNames.map((name, i) => ({ day: name, count: counts[i], value: counts[i], label: name }));
  }, [appointments]);

  const revenueData = useMemo(() => {
    try {
      const bills = JSON.parse(localStorage.getItem("billing_invoices") || "[]");
      const monthly = {};
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      bills.forEach((b) => {
        const d = new Date(b.date || b.createdAt || Date.now());
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
        monthly[key] = (monthly[key] || 0) + Number(b.total || b.amount || 0);
      });
      const m = months.slice(0, new Date().getMonth() + 1);
      return m.map((name) => ({ label: name, value: monthly[name] || Math.floor(Math.random() * 80000) + 20000 }));
    } catch { return ["Jan","Feb","Mar","Apr","May","Jun"].map((m) => ({ label: m, value: Math.floor(Math.random() * 80000) + 20000 })); }
  }, []);

  const admitsData = useMemo(() => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun"];
    return months.map((m) => ({ label: m, admits: Math.floor(Math.random() * 40) + 20, discharges: Math.floor(Math.random() * 35) + 15 }));
  }, []);

  const deptData = useMemo(() => {
    const specs = [...new Set(DOCTORS.map((d) => d.spec))];
    const colors = ["rgb(99,102,241)","rgb(16,185,129)","rgb(245,158,11)","rgb(236,72,153)","rgb(59,130,246)","rgb(139,92,246)"];
    return specs.slice(0, 6).map((s) => ({
      label: s.split(" ")[0], value: DOCTORS.filter((d) => d.spec === s).length,
      display: `${DOCTORS.filter((d) => d.spec === s).length} Dr`,
      color: colors[specs.indexOf(s) % colors.length],
    }));
  }, []);
  const billingSummary = useMemo(() => {
    try {
      const bills = JSON.parse(localStorage.getItem("billing_invoices") || "[]");
      const total = bills.reduce((s, b) => s + Number(b.total || b.amount || 0), 0);
      const paid = bills.filter((b) => b.status === "Paid" || b.paymentStatus === "Paid").reduce((s, b) => s + Number(b.total || b.amount || 0), 0);
      return { count: bills.length, total, paid, pending: total - paid };
    } catch { return { count: 0, total: 0, paid: 0, pending: 0 }; }
  }, []);

  const pharmacySummary = useMemo(() => {
    try {
      const meds = JSON.parse(localStorage.getItem("medicines") || "[]");
      const lowStock = meds.filter((m) => Number(m.stock || m.quantity || 0) <= 10);
      return { total: meds.length, lowStock: lowStock.length };
    } catch { return { total: 0, lowStock: 0 }; }
  }, []);

  const labSummary = useMemo(() => {
    try {
      const reports = JSON.parse(localStorage.getItem("lab_reports") || "[]");
      const pending = reports.filter((r) => r.status === "Pending" || r.status === "In Progress").length;
      return { total: reports.length, pending };
    } catch { return { total: 0, pending: 0 }; }
  }, []);

  const kpiCards = [
    { label: "Revenue", value: billingSummary.total, icon: "??", color: "emerald", format: (v) => `?${(v || 0).toLocaleString("en-IN")}`, trend: 12, trendLabel: "vs last month" },
    { label: "Today's Patients", value: todayPatients, icon: "??", color: "indigo", sub: `${patients.length} total registered`, trend: totalPatients > 0 ? Math.round((todayPatients / totalPatients) * 100) : 0 },
    { label: "Doctors On Duty", value: DOCTORS.filter((d) => d.status === "Available").length, icon: "?????", color: "blue", sub: `${DOCTORS.length} total`, trend: Math.round((DOCTORS.filter((d) => d.status === "Available").length / DOCTORS.length) * 100) },
    { label: "Bed Occupancy", value: "76%", icon: "???", color: "amber", sub: "50 / 140 beds filled", trend: -5 },
    { label: "Appointments", value: appointments.length, icon: "??", color: "violet", sub: `${confirmedCount} confirmed, ${pendingCount} pending`, trend: pendingCount > 0 ? 15 : 0 },
    { label: "Emergency Cases", value: patients.filter((p) => p.priority === "Emergency").length, icon: "??", color: "rose", sub: "Immediate attention", trend: 0 },
  ];

  const appointmentColumns = [
    { key: "token", label: "Token", render: (r) => <span className="font-mono text-indigo-600 font-semibold">{r.token}</span> },
    { key: "patient", label: "Patient" },
    { key: "doctor", label: "Doctor" },
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "symptoms", label: "Symptoms" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, badge: true },
  ];
  const actIcon = { consultation: "??", admission: "??", lab: "??", appointment: "??", pharmacy: "??" };

  return loading ? (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-12 w-72 bg-slate-200 rounded-xl animate-pulse mb-8" />
        <SkeletonKPI />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2"><SkeletonWidget /></div>
          <SkeletonWidget />
        </div>
        <SkeletonTable />
      </div>
    </div>
  ) : (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-200">??</div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Executive Dashboard</h1>
              <p className="text-sm text-slate-500">{userRole} · Real-time command center</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HealthScore value={98} label="Hospital Health" />
            <LiveClock darkMode={false} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {kpiCards.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Widget title="Revenue Analytics" icon="??" className="lg:col-span-1">
            <InlineAreaChart data={revenueData} color="rgb(16,185,129)" height={90} />
            <div className="flex justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Total: <strong className="text-slate-800">?{(billingSummary.total || 0).toLocaleString("en-IN")}</strong></span>
              <span className="text-slate-500">Paid: <strong className="text-emerald-600">?{(billingSummary.paid || 0).toLocaleString("en-IN")}</strong></span>
              <span className="text-slate-500">Pending: <strong className="text-amber-600">?{(billingSummary.pending || 0).toLocaleString("en-IN")}</strong></span>
            </div>
          </Widget>
          <Widget title="Admissions vs Discharges" icon="??" className="lg:col-span-1">
            <div className="space-y-3">
              {admitsData.slice(0, 6).map((m) => (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-slate-500 w-8">{m.label}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-indigo-100 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${(m.admits / Math.max(...admitsData.map((x) => x.admits), 1)) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-indigo-600 font-semibold">{m.admits}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-emerald-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(m.discharges / Math.max(...admitsData.map((x) => x.discharges), 1)) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold">{m.discharges}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Widget>
          <Widget title="Department Performance" icon="???" className="lg:col-span-1">
            <InlineBarChart data={deptData} height={90} />
          </Widget>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1"><CriticalAlerts patients={patients} appointments={appointments} /></div>
          <div className="lg:col-span-1">
            <Widget title="Recent Patients" icon="??" actions={<span className="text-[10px] text-slate-400">{patients.length} total</span>}>
              {patients.length === 0 ? (
                <div className="text-center py-8"><p className="text-3xl mb-2">??</p><p className="text-xs text-slate-400">No patients registered yet</p></div>
              ) : (
                <div className="space-y-2">
                  {patients.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{p.name?.charAt(0) || "?"}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.disease || "—"} · {p.phone}</p>
                      </div>
                      <StatusBadge status={p.status || "Active"} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </Widget>
          </div>
          <div className="lg:col-span-1"><SystemHealthPanel /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Widget title="Billing Summary" icon="??">
            {billingSummary.count === 0 ? (
              <div className="text-center py-6"><p className="text-2xl mb-1">??</p><p className="text-xs text-slate-400">No invoices yet</p></div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Total Invoices</span><span className="text-sm font-bold text-slate-800">{billingSummary.count}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Paid</span><span className="text-sm font-bold text-emerald-600">?{(billingSummary.paid || 0).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Pending</span><span className="text-sm font-bold text-amber-600">?{(billingSummary.pending || 0).toLocaleString("en-IN")}</span></div>
              </div>
            )}
          </Widget>
          <Widget title="Medicine Stock" icon="??">
            {pharmacySummary.total === 0 ? (
              <div className="text-center py-6"><p className="text-2xl mb-1">??</p><p className="text-xs text-slate-400">No medicines recorded</p></div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Total Medicines</span><span className="text-sm font-bold text-slate-800">{pharmacySummary.total}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Low Stock Items</span><span className={`text-sm font-bold ${pharmacySummary.lowStock > 0 ? "text-rose-600" : "text-emerald-600"}`}>{pharmacySummary.lowStock}</span></div>
              </div>
            )}
          </Widget>
          <Widget title="Lab Reports" icon="??">
            {labSummary.total === 0 ? (
              <div className="text-center py-6"><p className="text-2xl mb-1">??</p><p className="text-xs text-slate-400">No lab reports yet</p></div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Total Reports</span><span className="text-sm font-bold text-slate-800">{labSummary.total}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Pending</span><span className={`text-sm font-bold ${labSummary.pending > 0 ? "text-amber-600" : "text-emerald-600"}`}>{labSummary.pending}</span></div>
              </div>
            )}
          </Widget>
          <Widget title="Bed Capacity" icon="???">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">General</span><span className="font-semibold text-slate-700">42 / 120</span></div>
                <div className="bg-slate-100 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: "35%" }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">ICU</span><span className="font-semibold text-slate-700">8 / 20</span></div>
                <div className="bg-slate-100 rounded-full h-2"><div className="bg-rose-500 h-2 rounded-full" style={{ width: "40%" }} /></div>
              </div>
            </div>
          </Widget>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Widget title="Recent Activity" icon="?">
              <div className="relative pl-6 space-y-0">
                {activityFeed.map((item, i) => (
                  <div key={item.id} className="relative pb-4 last:pb-0">
                    {i < activityFeed.length - 1 && <div className="absolute left-[3px] top-3 bottom-0 w-px bg-slate-200" />}
                    <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-indigo-500 bg-white" />
                    <div className="text-sm">
                      <span className="font-semibold text-slate-800">{item.user}</span> <span className="text-slate-500">{item.action}</span> <span className="font-medium text-slate-700">{item.target}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]">{actIcon[item.type] || "??"}</span>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Widget>
          </div>
          <Widget title="Quick Actions" icon="?">
            <div className="space-y-2.5">
              <ActionButton icon={() => "??"} label="Book Appointment" primary onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })} />
              <ActionButton icon={() => "??"} label="Register Patient" onClick={() => { const e = new CustomEvent("navigate", { detail: "Patients" }); window.dispatchEvent(e); }} />
              <ActionButton icon={() => "??"} label="Pharmacy" onClick={() => { const e = new CustomEvent("navigate", { detail: "Pharmacy" }); window.dispatchEvent(e); }} />
              <ActionButton icon={() => "??"} label="Laboratory" onClick={() => { const e = new CustomEvent("navigate", { detail: "Laboratory" }); window.dispatchEvent(e); }} />
              <ActionButton icon={() => "??"} label="Reports" onClick={() => { const e = new CustomEvent("navigate", { detail: "Reports" }); window.dispatchEvent(e); }} />
              <ActionButton icon={() => "??"} label="Patient Records" onClick={() => { const e = new CustomEvent("navigate", { detail: "Patients" }); window.dispatchEvent(e); }} />
              <ActionButton icon={() => "??"} label="Billing" onClick={() => { const e = new CustomEvent("navigate", { detail: "Billing" }); window.dispatchEvent(e); }} />
            </div>
          </Widget>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Widget title="Appointment Queue" icon="??" actions={
              <button onClick={clearAll} className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 transition-colors">Clear All</button>
            }>
              <DataTable
                columns={appointmentColumns}
                data={appointments}
                emptyMessage="No appointments booked yet."
                actions={(row) => (
                  <div className="flex gap-1">
                    {["Pending", "Confirmed", "Completed"].map((s) => (
                      <button key={s} onClick={() => updateStatus(row.id, s)} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors">{s}</button>
                    ))}
                    <button onClick={() => startEdit(row)} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700">Edit</button>
                    <button onClick={() => deleteAppointment(row.id)} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700">Del</button>
                  </div>
                )}
              />
            </Widget>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Widget title="Appointment Summary" icon="??">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Pending", value: pendingCount, color: "bg-amber-500", text: "text-amber-600" },
                  { label: "Confirmed", value: confirmedCount, color: "bg-cyan-500", text: "text-cyan-600" },
                  { label: "Completed", value: completedCount, color: "bg-emerald-500", text: "text-emerald-600" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-xl bg-slate-50">
                    <div className={"w-7 h-7 rounded-full " + s.color + " mx-auto mb-1.5 opacity-80"} />
                    <p className={"text-lg font-bold " + s.text}>{s.value}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <InlineAreaChart data={weeklyTrend} color="rgb(99,102,241)" height={50} />
              </div>
            </Widget>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" id="booking-section">
          {!isPatient && (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Book Appointment
              </h3>

              <div className="space-y-4 mb-5">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <SearchInput value={doctorSearch} onChange={setDoctorSearch} placeholder="Search doctor..." />
                  </div>
                  <select value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                    className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                    {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto">
                  {filteredDoctors.map((doctor) => (
                    <button key={doctor.id} onClick={() => setSelectedDoctor(doctor)}
                      className={"text-left border rounded-xl p-3 transition-all hover:shadow-md " + (selectedDoctor?.id === doctor.id ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/20" : "border-slate-200 hover:border-indigo-300 bg-white")}>
                      <p className="text-sm font-semibold text-slate-800">{doctor.name}</p>
                      <p className="text-xs text-indigo-500">{doctor.spec}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={"inline-block w-1.5 h-1.5 rounded-full " + (doctor.status === "Available" ? "bg-emerald-500" : "bg-red-500")} />
                        <span className="text-[10px] text-slate-400">{doctor.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {selectedDoctor && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 mb-4">
                  <span className="text-lg">?????</span>
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">{selectedDoctor.name} · {selectedDoctor.spec}</p>
                    <p className="text-xs text-indigo-500">? {selectedDoctor.rating}/5 · {selectedDoctor.exp}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                {["patient", "age", "phone", "symptoms"].map((f) => (
                  <input key={f} type={f === "age" ? "number" : "text"} value={formData[f]}
                    onChange={(e) => updateForm(f, e.target.value)}
                    placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                    className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                  />
                ))}
                <input type="date" value={formData.date} onChange={(e) => updateForm("date", e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
                <input type="time" value={formData.time} onChange={(e) => updateForm("time", e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
              </div>

              {symptomSuggestion && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 mb-4 text-sm">
                  <p className="font-semibold text-indigo-800">?? AI Suggestion: <span className="font-normal">{symptomSuggestion.doctor}</span></p>
                  <p className="text-xs text-indigo-600 mt-0.5">{symptomSuggestion.advice}</p>
                </div>
              )}

              <div className="flex gap-3">
                <ActionButton icon={() => null} label={editingId ? "Update" : "Book Appointment"} primary onClick={handleBooking} />
                <ActionButton icon={() => null} label="Cancel" variant="ghost" onClick={resetForm} />
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Patient History
            </h3>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <SearchInput value={historySearch} onChange={setHistorySearch} placeholder="Search by patient, token, doctor..." />
              </div>
              <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value)}
                className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <DataTable columns={[
              { key: "token", label: "Token", render: (r) => <span className="font-mono text-indigo-600 font-semibold text-xs">{r.token}</span> },
              { key: "patient", label: "Patient" },
              { key: "doctor", label: "Doctor" },
              { key: "date", label: "Date" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]} data={filteredHistory} emptyMessage="No patient history found." />
          </div>
        </div>
        <div className="mt-8">
          <AnnouncementsPanel darkMode={darkMode} />
        </div>

      </div>
    </div>
  );
}
