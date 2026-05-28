import { useState, useEffect, useRef } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const DOCTORS = [
  { id: 1, name: "Dr. Ananya Sharma", spec: "Cardiology", exp: "12 yrs", available: true, slots: ["9:00 AM", "11:00 AM", "2:00 PM"], rating: 4.9, img: "👩‍⚕️" },
  { id: 2, name: "Dr. Rohan Mehta", spec: "Neurology", exp: "9 yrs", available: true, slots: ["10:00 AM", "1:00 PM", "4:00 PM"], rating: 4.8, img: "👨‍⚕️" },
  { id: 3, name: "Dr. Priya Nair", spec: "Pediatrics", exp: "7 yrs", available: false, slots: [], rating: 4.7, img: "👩‍⚕️" },
  { id: 4, name: "Dr. Suresh Patel", spec: "Orthopedics", exp: "15 yrs", available: true, slots: ["8:00 AM", "12:00 PM", "3:00 PM"], rating: 4.9, img: "👨‍⚕️" },
  { id: 5, name: "Dr. Kavitha Rao", spec: "Dermatology", exp: "6 yrs", available: true, slots: ["9:30 AM", "2:30 PM"], rating: 4.6, img: "👩‍⚕️" },
  { id: 6, name: "Dr. Arun Kumar", spec: "ENT", exp: "11 yrs", available: false, slots: [], rating: 4.7, img: "👨‍⚕️" },
];

const STAFF = [
  { id: 1, name: "Meena Rani", role: "Head Nurse", dept: "ICU", attendance: "Present", salary: "Paid", exp: "8 yrs", shift: "Morning" },
  { id: 2, name: "Ravi Shankar", role: "Lab Technician", dept: "Pathology", attendance: "Present", salary: "Paid", exp: "5 yrs", shift: "Morning" },
  { id: 3, name: "Sita Devi", role: "Nurse", dept: "General Ward", attendance: "Absent", salary: "Paid", exp: "3 yrs", shift: "Night" },
  { id: 4, name: "Ajay Singh", role: "Pharmacist", dept: "Pharmacy", attendance: "Present", salary: "Pending", exp: "6 yrs", shift: "Evening" },
  { id: 5, name: "Lakshmi V", role: "Receptionist", dept: "OPD", attendance: "Present", salary: "Paid", exp: "4 yrs", shift: "Morning" },
  { id: 6, name: "Deepak Joshi", role: "Ambulance Driver", dept: "Emergency", attendance: "Present", salary: "Paid", exp: "7 yrs", shift: "24/7" },
];

const MEDICINES = [
  { id: 1, name: "Paracetamol 500mg", category: "Analgesic", mrp: 25, price: 18, stock: "Available", uses: "Fever, Mild pain relief", warning: "Max 4 doses/day" },
  { id: 2, name: "Amoxicillin 500mg", category: "Antibiotic", mrp: 120, price: 95, stock: "Available", uses: "Bacterial infections", warning: "Complete full course" },
  { id: 3, name: "Omeprazole 20mg", category: "Antacid", mrp: 85, price: 60, stock: "Low Stock", uses: "Acidity, GERD", warning: "Take before meals" },
  { id: 4, name: "Metformin 500mg", category: "Diabetes", mrp: 45, price: 32, stock: "Available", uses: "Type 2 Diabetes", warning: "Monitor blood sugar" },
  { id: 5, name: "Cetirizine 10mg", category: "Antihistamine", mrp: 30, price: 22, stock: "Available", uses: "Allergies, Cold", warning: "May cause drowsiness" },
  { id: 6, name: "Ibuprofen 400mg", category: "NSAID", mrp: 40, price: 28, stock: "Out of Stock", uses: "Pain, Inflammation", warning: "Take with food" },
];

const SYMPTOM_MAP = {
  fever: ["Paracetamol", "Rest & hydration", "Consult if > 3 days"],
  headache: ["Paracetamol", "Rest in dark room", "Check BP"],
  cold: ["Cetirizine", "Steam inhalation", "Warm fluids"],
  cough: ["Warm honey-lemon water", "Avoid cold drinks", "Consult if bloody"],
  stomach: ["Omeprazole", "Light diet", "Avoid spicy food"],
  pain: ["Ibuprofen", "Rest", "Ice/Heat pack"],
  allergy: ["Cetirizine", "Avoid allergen", "Consult dermatologist"],
  diabetes: ["Monitor sugar", "Low-carb diet", "Consult endocrinologist"],
  default: ["Consult a doctor", "Drink plenty of water", "Rest well"],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function genToken() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `APT-${date}-${rand}`;
}

function getLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function setLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ─── TOAST ────────────────────────────────────────────────────────────────────

function Toast({ toasts, remove }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)}
          className={`px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium cursor-pointer transition-all animate-bounce-in flex items-center gap-2
            ${t.type === "success" ? "bg-emerald-600" : t.type === "error" ? "bg-red-500" : "bg-blue-600"}`}>
          <span>{t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────

function Navbar({ page, setPage, dark, setDark }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = ["Home","Dashboard","Doctors","Staff","Medicines","Complaints","Contact"];
  return (
    <nav className={`sticky top-0 z-40 shadow-lg ${dark ? "bg-gray-900 border-b border-gray-700" : "bg-white border-b border-gray-200"}`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage("Home")}>
          <span className="text-2xl">🏥</span>
          <div>
            <div className={`font-bold text-lg leading-tight ${dark?"text-white":"text-gray-900"}`}>MediCare Pro</div>
            <div className="text-xs text-blue-500 leading-tight">Smart Hospital Management</div>
          </div>
        </div>
        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(n => (
            <button key={n} onClick={() => setPage(n)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${page === n
                  ? "bg-blue-600 text-white"
                  : dark ? "text-gray-300 hover:bg-gray-800 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
              {n}
            </button>
          ))}
          <button onClick={() => setDark(!dark)}
            className={`ml-2 p-2 rounded-lg transition-all ${dark?"bg-gray-800 text-yellow-400":"bg-gray-100 text-gray-600"}`}>
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <button onClick={() => setDark(!dark)} className={`p-2 rounded-lg ${dark?"bg-gray-800 text-yellow-400":"bg-gray-100"}`}>
            {dark ? "☀️" : "🌙"}
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} className={`p-2 rounded-lg ${dark?"text-white":"text-gray-900"}`}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className={`md:hidden px-4 pb-4 flex flex-col gap-1 ${dark?"bg-gray-900":"bg-white"}`}>
          {navLinks.map(n => (
            <button key={n} onClick={() => { setPage(n); setMenuOpen(false); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all
                ${page === n ? "bg-blue-600 text-white" : dark?"text-gray-300":"text-gray-700"}`}>
              {n}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────

function HomePage({ dark, setPage }) {
  const services = [
    { icon: "🫀", title: "Cardiology", desc: "Advanced heart care with 24/7 monitoring" },
    { icon: "🧠", title: "Neurology", desc: "Expert neurological diagnosis and treatment" },
    { icon: "🦴", title: "Orthopedics", desc: "Bone, joint and spine care specialists" },
    { icon: "👶", title: "Pediatrics", desc: "Dedicated child health and wellness" },
    { icon: "🔬", title: "Pathology", desc: "Accurate diagnostic lab services" },
    { icon: "🚑", title: "Emergency", desc: "24/7 emergency and trauma care" },
  ];
  const stats = [
    { label: "Patients Served", val: "50,000+" },
    { label: "Expert Doctors", val: "120+" },
    { label: "Departments", val: "18" },
    { label: "Beds Available", val: "500+" },
  ];
  return (
    <div>
      {/* Hero */}
      <div className={`relative overflow-hidden ${dark?"bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900":"bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800"} py-20 px-4`}>
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            🏆 Ranked #1 Hospital in the Region
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
            Your Health, <br/><span className="text-yellow-300">Our Priority</span>
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            MediCare Pro delivers world-class healthcare with cutting-edge technology, compassionate doctors, and a patient-first approach.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => setPage("Dashboard")}
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-6 py-3 rounded-xl transition-all shadow-lg">
              📅 Book Appointment
            </button>
            <button onClick={() => setPage("Doctors")}
              className="bg-white/20 hover:bg-white/30 backdrop-blur text-white font-semibold px-6 py-3 rounded-xl transition-all border border-white/30">
              👨‍⚕️ Our Doctors
            </button>
          </div>
        </div>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize:"60px 60px"}}/>
      </div>

      {/* Stats */}
      <div className={`${dark?"bg-gray-800":"bg-blue-600"} py-8`}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(s => (
            <div key={s.label} className="text-center text-white">
              <div className="text-3xl font-black">{s.val}</div>
              <div className="text-blue-200 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className={`py-16 px-4 ${dark?"bg-gray-900":"bg-gray-50"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className={`text-3xl font-black mb-2 ${dark?"text-white":"text-gray-900"}`}>Our Specializations</h2>
            <p className={`${dark?"text-gray-400":"text-gray-500"}`}>Comprehensive healthcare services under one roof</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {services.map(s => (
              <div key={s.title} className={`p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer
                ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
                <div className="text-4xl mb-3">{s.icon}</div>
                <h3 className={`font-bold text-lg mb-1 ${dark?"text-white":"text-gray-900"}`}>{s.title}</h3>
                <p className={`text-sm ${dark?"text-gray-400":"text-gray-500"}`}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why us */}
      <div className={`py-12 px-4 ${dark?"bg-gray-800":"bg-white"}`}>
        <div className="max-w-5xl mx-auto text-center">
          <h2 className={`text-3xl font-black mb-8 ${dark?"text-white":"text-gray-900"}`}>Why Choose MediCare Pro?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "⚡", title: "Fast & Efficient", desc: "Smart queue system reduces wait time by 60%" },
              { icon: "🤖", title: "AI-Powered", desc: "AI symptom checker for instant preliminary guidance" },
              { icon: "🔒", title: "Secure & Private", desc: "Your health data is always encrypted and safe" },
            ].map(c => (
              <div key={c.title} className={`p-6 rounded-2xl border ${dark?"bg-gray-700 border-gray-600":"bg-gray-50 border-gray-200"}`}>
                <div className="text-4xl mb-3">{c.icon}</div>
                <h3 className={`font-bold text-lg mb-2 ${dark?"text-white":"text-gray-900"}`}>{c.title}</h3>
                <p className={`text-sm ${dark?"text-gray-400":"text-gray-500"}`}>{c.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setPage("Dashboard")}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all">
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────

function DashboardPage({ dark, addToast, prefillDoctor }) {
  // Appointment state
  const [appointments, setAppointments] = useState(() => getLS("medicare_appointments", []));
  const [form, setForm] = useState({ name: "", age: "", phone: "", doctor: prefillDoctor || "", date: "", time: "", symptoms: "", token: "" });
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [aiSymptom, setAiSymptom] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [docSearch, setDocSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("booking");

  useEffect(() => { setLS("medicare_appointments", appointments); }, [appointments]);

  useEffect(() => {
    if (prefillDoctor) { setForm(f => ({...f, doctor: prefillDoctor})); setActiveTab("booking"); }
  }, [prefillDoctor]);

  const specs = ["All", ...new Set(DOCTORS.map(d => d.spec))];

  const filteredDocs = DOCTORS.filter(d =>
    (specFilter === "All" || d.spec === specFilter) &&
    d.name.toLowerCase().includes(docSearch.toLowerCase())
  );

  function handleBook(e) {
    e.preventDefault();
    const { name, age, phone, doctor, date, time } = form;
    if (!name || !age || !phone || !doctor || !date || !time) {
      addToast("Please fill all required fields.", "error"); return;
    }
    if (isNaN(age) || +age < 1 || +age > 120) { addToast("Enter a valid age.", "error"); return; }
    if (!/^\d{10}$/.test(phone)) { addToast("Phone must be 10 digits.", "error"); return; }

    // Duplicate check (skip if editing)
    if (!editId) {
      const dup = appointments.find(a => a.doctor === doctor && a.date === date && a.time === time);
      if (dup) { addToast("This slot is already booked for this doctor!", "error"); return; }
    }

    if (editId) {
      setAppointments(prev => prev.map(a => a.id === editId ? { ...a, ...form } : a));
      addToast("Appointment updated!", "success");
      setEditId(null);
    } else {
      const token = genToken();
      const newApt = { ...form, id: Date.now(), token, status: "Pending", createdAt: new Date().toLocaleString() };
      setAppointments(prev => [...prev, newApt]);
      addToast(`Appointment booked! Token: ${token}`, "success");
    }
    setForm({ name: "", age: "", phone: "", doctor: "", date: "", time: "", symptoms: "", token: "" });
    setActiveTab("queue");
  }

  function handleEdit(apt) {
    setForm({ name: apt.name, age: apt.age, phone: apt.phone, doctor: apt.doctor, date: apt.date, time: apt.time, symptoms: apt.symptoms || "", token: apt.token });
    setEditId(apt.id);
    setActiveTab("booking");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id) {
    if (!window.confirm("Delete this appointment?")) return;
    setAppointments(prev => prev.filter(a => a.id !== id));
    addToast("Appointment deleted.", "success");
  }

  function handleStatus(id, status) {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    addToast(`Status updated to ${status}`, "success");
  }

  function handleClearAll() {
    if (!window.confirm("Clear ALL appointments?")) return;
    setAppointments([]);
    addToast("All appointments cleared.", "success");
  }

  function handleAI() {
    if (!aiSymptom.trim()) { addToast("Enter symptoms first.", "error"); return; }
    const key = Object.keys(SYMPTOM_MAP).find(k => aiSymptom.toLowerCase().includes(k));
    const suggestions = SYMPTOM_MAP[key] || SYMPTOM_MAP.default;
    setAiResult({ key: key || "general", suggestions });
  }

  const filtered = filter === "All" ? appointments : appointments.filter(a => a.status === filter);

  const bedData = { total: 120, occupied: 78, icu: 20, icuOcc: 14, emergency: 15, emergencyOcc: 11 };

  const statusColors = { Pending: "yellow", Confirmed: "blue", Completed: "green" };

  return (
    <div className={`min-h-screen ${dark?"bg-gray-900":"bg-gray-50"}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${dark?"text-white":"text-gray-900"}`}>🏥 Smart Dashboard</h1>
          <p className={`text-sm mt-1 ${dark?"text-gray-400":"text-gray-500"}`}>Hospital management at a glance</p>
        </div>

        {/* Emergency & Bed Availability */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "General Beds", total: bedData.total, occ: bedData.occupied, color: "blue", icon: "🛏️" },
            { label: "ICU Beds", total: bedData.icu, occ: bedData.icuOcc, color: "red", icon: "❤️" },
            { label: "Emergency", total: bedData.emergency, occ: bedData.emergencyOcc, color: "orange", icon: "🚨" },
          ].map(b => (
            <div key={b.label} className={`p-4 rounded-2xl border ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className={`text-xs font-medium ${dark?"text-gray-400":"text-gray-500"}`}>{b.label}</p>
                  <p className={`text-2xl font-black mt-1 ${dark?"text-white":"text-gray-900"}`}>{b.total - b.occ} <span className="text-base font-normal text-gray-400">/ {b.total}</span></p>
                  <p className="text-xs text-green-500 mt-0.5">Available</p>
                </div>
                <span className="text-3xl">{b.icon}</span>
              </div>
              <div className={`w-full h-2 rounded-full ${dark?"bg-gray-700":"bg-gray-200"}`}>
                <div className={`h-2 rounded-full bg-${b.color}-500 transition-all`} style={{width:`${(b.occ/b.total)*100}%`}}/>
              </div>
              <p className={`text-xs mt-1 ${dark?"text-gray-400":"text-gray-500"}`}>{Math.round((b.occ/b.total)*100)}% occupied</p>
            </div>
          ))}
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Appointments", val: appointments.length, icon: "📅", color: "blue" },
            { label: "Pending", val: appointments.filter(a=>a.status==="Pending").length, icon: "⏳", color: "yellow" },
            { label: "Confirmed", val: appointments.filter(a=>a.status==="Confirmed").length, icon: "✅", color: "green" },
            { label: "Completed", val: appointments.filter(a=>a.status==="Completed").length, icon: "🏁", color: "purple" },
          ].map(s => (
            <div key={s.label} className={`p-4 rounded-2xl border ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>{s.label}</p>
                  <p className={`text-3xl font-black mt-1 ${dark?"text-white":"text-gray-900"}`}>{s.val}</p>
                </div>
                <span className="text-2xl">{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl mb-6 w-fit ${dark?"bg-gray-800":"bg-gray-200"}`}>
          {["booking","queue","doctors","ai"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all
                ${activeTab===t ? "bg-blue-600 text-white shadow" : dark?"text-gray-300":"text-gray-600"}`}>
              {t === "ai" ? "🤖 AI Advisor" : t === "booking" ? "📅 " + (editId?"Edit":"Book") : t === "queue" ? "📋 Queue" : "👨‍⚕️ Doctors"}
            </button>
          ))}
        </div>

        {/* BOOKING TAB */}
        {activeTab === "booking" && (
          <div className={`p-6 rounded-2xl border ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
            <h2 className={`font-bold text-lg mb-4 ${dark?"text-white":"text-gray-900"}`}>
              {editId ? "✏️ Edit Appointment" : "📅 Book Appointment"}
            </h2>
            <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Patient Name *", key: "name", type: "text", ph: "Full name" },
                { label: "Age *", key: "age", type: "number", ph: "Age" },
                { label: "Phone *", key: "phone", type: "tel", ph: "10-digit number" },
                { label: "Date *", key: "date", type: "date" },
              ].map(f => (
                <div key={f.key}>
                  <label className={`block text-xs font-medium mb-1 ${dark?"text-gray-300":"text-gray-700"}`}>{f.label}</label>
                  <input type={f.type} placeholder={f.ph} value={form[f.key]}
                    onChange={e => setForm({...form, [f.key]: e.target.value})}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all
                      ${dark?"bg-gray-700 border-gray-600 text-white placeholder-gray-400":"bg-white border-gray-300 text-gray-900"}`}/>
                </div>
              ))}
              <div>
                <label className={`block text-xs font-medium mb-1 ${dark?"text-gray-300":"text-gray-700"}`}>Doctor *</label>
                <select value={form.doctor} onChange={e => setForm({...form, doctor: e.target.value})}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500
                    ${dark?"bg-gray-700 border-gray-600 text-white":"bg-white border-gray-300 text-gray-900"}`}>
                  <option value="">Select Doctor</option>
                  {DOCTORS.filter(d=>d.available).map(d => <option key={d.id} value={d.name}>{d.name} – {d.spec}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${dark?"text-gray-300":"text-gray-700"}`}>Time Slot *</label>
                <select value={form.time} onChange={e => setForm({...form, time: e.target.value})}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500
                    ${dark?"bg-gray-700 border-gray-600 text-white":"bg-white border-gray-300 text-gray-900"}`}>
                  <option value="">Select Time</option>
                  {(DOCTORS.find(d=>d.name===form.doctor)?.slots || ["9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM","4:00 PM"]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={`block text-xs font-medium mb-1 ${dark?"text-gray-300":"text-gray-700"}`}>Symptoms / Notes</label>
                <textarea rows={2} placeholder="Describe symptoms..." value={form.symptoms}
                  onChange={e => setForm({...form, symptoms: e.target.value})}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none
                    ${dark?"bg-gray-700 border-gray-600 text-white placeholder-gray-400":"bg-white border-gray-300 text-gray-900"}`}/>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all">
                  {editId ? "💾 Update" : "✅ Book Now"}
                </button>
                {editId && (
                  <button type="button" onClick={() => { setEditId(null); setForm({ name:"",age:"",phone:"",doctor:"",date:"",time:"",symptoms:"",token:"" }); }}
                    className={`px-6 py-2.5 rounded-xl font-medium border transition-all ${dark?"border-gray-600 text-gray-300":"border-gray-300 text-gray-600"}`}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* QUEUE TAB */}
        {activeTab === "queue" && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {["All","Pending","Confirmed","Completed"].map(s => (
                  <button key={s} onClick={() => setFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${filter===s?"bg-blue-600 text-white":dark?"bg-gray-800 text-gray-300 border border-gray-700":"bg-white text-gray-600 border border-gray-200"}`}>
                    {s} {s==="All"?`(${appointments.length})`:s==="Pending"?`(${appointments.filter(a=>a.status==="Pending").length})`:s==="Confirmed"?`(${appointments.filter(a=>a.status==="Confirmed").length})`:`(${appointments.filter(a=>a.status==="Completed").length})`}
                  </button>
                ))}
              </div>
              {appointments.length > 0 && (
                <button onClick={handleClearAll} className="text-red-500 text-sm font-medium hover:text-red-600">🗑️ Clear All</button>
              )}
            </div>
            {filtered.length === 0 ? (
              <div className={`text-center py-16 rounded-2xl border ${dark?"bg-gray-800 border-gray-700 text-gray-400":"bg-white border-gray-200 text-gray-500"}`}>
                <div className="text-5xl mb-3">📋</div>
                <p className="font-medium">No appointments found</p>
                <button onClick={() => setActiveTab("booking")} className="mt-3 text-blue-500 text-sm">Book one now →</button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((apt, i) => (
                  <div key={apt.id} className={`p-4 rounded-2xl border transition-all hover:shadow-md ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
                    <div className="flex flex-wrap gap-3 justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dark?"bg-blue-900 text-blue-300":"bg-blue-100 text-blue-700"}`}>
                            #{i+1} {apt.token}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                            ${apt.status==="Pending"?"bg-yellow-100 text-yellow-700":apt.status==="Confirmed"?"bg-blue-100 text-blue-700":"bg-green-100 text-green-700"}`}>
                            {apt.status}
                          </span>
                        </div>
                        <p className={`font-bold ${dark?"text-white":"text-gray-900"}`}>{apt.name}</p>
                        <p className={`text-sm ${dark?"text-gray-400":"text-gray-500"}`}>👨‍⚕️ {apt.doctor} &nbsp;|&nbsp; 📅 {apt.date} &nbsp;|&nbsp; ⏰ {apt.time}</p>
                        <p className={`text-xs ${dark?"text-gray-500":"text-gray-400"}`}>Age: {apt.age} &nbsp;|&nbsp; 📱 {apt.phone}</p>
                        {apt.symptoms && <p className={`text-xs mt-1 italic ${dark?"text-gray-400":"text-gray-500"}`}>"{apt.symptoms}"</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <select value={apt.status} onChange={e => handleStatus(apt.id, e.target.value)}
                          className={`text-xs px-2 py-1.5 rounded-lg border outline-none ${dark?"bg-gray-700 border-gray-600 text-white":"bg-gray-50 border-gray-200"}`}>
                          <option>Pending</option><option>Confirmed</option><option>Completed</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(apt)} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 font-medium">✏️ Edit</button>
                          <button onClick={() => handleDelete(apt.id)} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 font-medium">🗑️</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DOCTORS TAB (in dashboard) */}
        {activeTab === "doctors" && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              <input placeholder="Search doctor..." value={docSearch} onChange={e => setDocSearch(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-sm outline-none flex-1 min-w-48
                  ${dark?"bg-gray-800 border-gray-700 text-white placeholder-gray-400":"bg-white border-gray-300"}`}/>
              <select value={specFilter} onChange={e => setSpecFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-sm outline-none
                  ${dark?"bg-gray-800 border-gray-700 text-white":"bg-white border-gray-300"}`}>
                {specs.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map(d => (
                <div key={d.id} className={`p-4 rounded-2xl border flex gap-4 ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
                  <div className="text-4xl">{d.img}</div>
                  <div className="flex-1">
                    <p className={`font-bold ${dark?"text-white":"text-gray-900"}`}>{d.name}</p>
                    <p className={`text-sm ${dark?"text-gray-400":"text-gray-500"}`}>{d.spec} • {d.exp}</p>
                    <p className="text-xs text-yellow-500">⭐ {d.rating}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block
                      ${d.available?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>
                      {d.available?"✅ Available":"❌ Unavailable"}
                    </span>
                  </div>
                  {d.available && (
                    <button onClick={() => { setForm(f=>({...f, doctor:d.name})); setActiveTab("booking"); }}
                      className="self-center bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-xl font-medium">
                      Book
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI TAB */}
        {activeTab === "ai" && (
          <div className={`p-6 rounded-2xl border ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
            <h2 className={`font-bold text-lg mb-1 ${dark?"text-white":"text-gray-900"}`}>🤖 AI Symptom Advisor</h2>
            <p className={`text-xs mb-4 ${dark?"text-gray-400":"text-gray-500"}`}>⚠️ This is for basic guidance only. Always consult a real doctor for medical advice.</p>
            <div className="flex gap-3 mb-4">
              <input placeholder="Enter symptoms (e.g. fever, headache, cold...)" value={aiSymptom}
                onChange={e => setAiSymptom(e.target.value)}
                onKeyDown={e => e.key==="Enter" && handleAI()}
                className={`flex-1 px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500
                  ${dark?"bg-gray-700 border-gray-600 text-white placeholder-gray-400":"bg-white border-gray-300"}`}/>
              <button onClick={handleAI} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold">
                Analyze
              </button>
            </div>
            {aiResult && (
              <div className={`p-4 rounded-xl border ${dark?"bg-gray-700 border-gray-600":"bg-blue-50 border-blue-200"}`}>
                <p className={`font-semibold mb-3 ${dark?"text-white":"text-gray-900"}`}>
                  Results for: <span className="text-blue-500 capitalize">"{aiSymptom}"</span>
                </p>
                <div className="grid gap-2">
                  {aiResult.suggestions.map((s,i) => (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${dark?"bg-gray-600":"bg-white"}`}>
                      <span className="text-blue-500 font-bold text-sm">{i+1}.</span>
                      <p className={`text-sm ${dark?"text-gray-300":"text-gray-700"}`}>{s}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-red-400 mt-3">⚠️ Always consult a qualified doctor before taking any medication.</p>
              </div>
            )}
            <div className="mt-4">
              <p className={`text-xs font-medium mb-2 ${dark?"text-gray-400":"text-gray-500"}`}>Quick symptom suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(SYMPTOM_MAP).filter(k=>k!=="default").map(k => (
                  <button key={k} onClick={() => { setAiSymptom(k); }}
                    className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-all hover:bg-blue-600 hover:text-white
                      ${dark?"border-gray-600 text-gray-300":"border-gray-300 text-gray-600"}`}>
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DOCTORS PAGE ─────────────────────────────────────────────────────────────

function DoctorsPage({ dark, setPage, setPrefillDoctor }) {
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("All");
  const specs = ["All", ...new Set(DOCTORS.map(d => d.spec))];
  const filtered = DOCTORS.filter(d =>
    (spec==="All"||d.spec===spec) && d.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className={`min-h-screen ${dark?"bg-gray-900":"bg-gray-50"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${dark?"text-white":"text-gray-900"}`}>👨‍⚕️ Our Doctors</h1>
          <p className={`text-sm mt-1 ${dark?"text-gray-400":"text-gray-500"}`}>Expert healthcare professionals ready to help you</p>
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          <input placeholder="Search by name..." value={search} onChange={e=>setSearch(e.target.value)}
            className={`flex-1 min-w-48 px-4 py-2.5 rounded-xl border text-sm outline-none
              ${dark?"bg-gray-800 border-gray-700 text-white placeholder-gray-400":"bg-white border-gray-300"}`}/>
          <select value={spec} onChange={e=>setSpec(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border text-sm outline-none
              ${dark?"bg-gray-800 border-gray-700 text-white":"bg-white border-gray-300"}`}>
            {specs.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(d => (
            <div key={d.id} className={`p-5 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${dark?"bg-gray-700":"bg-blue-50"}`}>{d.img}</div>
                <div>
                  <p className={`font-bold ${dark?"text-white":"text-gray-900"}`}>{d.name}</p>
                  <p className={`text-sm ${dark?"text-gray-400":"text-gray-500"}`}>{d.spec}</p>
                  <p className="text-xs text-yellow-500">⭐ {d.rating} rating</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full ${dark?"bg-gray-700 text-gray-300":"bg-gray-100 text-gray-600"}`}>🕒 {d.exp} experience</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${d.available?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>
                  {d.available?"✅ Available":"❌ On Leave"}
                </span>
              </div>
              {d.available && d.slots.length > 0 && (
                <div className="mb-3">
                  <p className={`text-xs font-medium mb-1 ${dark?"text-gray-400":"text-gray-500"}`}>Available Slots:</p>
                  <div className="flex flex-wrap gap-1">
                    {d.slots.map(s => (
                      <span key={s} className={`text-xs px-2 py-1 rounded-lg ${dark?"bg-blue-900 text-blue-300":"bg-blue-50 text-blue-700"}`}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {d.available ? (
                <button onClick={() => { setPrefillDoctor(d.name); setPage("Dashboard"); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all">
                  📅 Book Appointment
                </button>
              ) : (
                <button disabled className="w-full bg-gray-200 text-gray-400 font-semibold py-2.5 rounded-xl text-sm cursor-not-allowed">
                  Currently Unavailable
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STAFF PAGE ───────────────────────────────────────────────────────────────

function StaffPage({ dark }) {
  const [filter, setFilter] = useState("All");
  const depts = ["All", ...new Set(STAFF.map(s=>s.dept))];
  const filtered = filter==="All" ? STAFF : STAFF.filter(s=>s.dept===filter);
  return (
    <div className={`min-h-screen ${dark?"bg-gray-900":"bg-gray-50"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${dark?"text-white":"text-gray-900"}`}>👥 Staff Management</h1>
          <p className={`text-sm mt-1 ${dark?"text-gray-400":"text-gray-500"}`}>Hospital staff directory and attendance overview</p>
        </div>
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Staff", val: STAFF.length, icon: "👥" },
            { label: "Present Today", val: STAFF.filter(s=>s.attendance==="Present").length, icon: "✅" },
            { label: "Absent", val: STAFF.filter(s=>s.attendance==="Absent").length, icon: "❌" },
            { label: "Salary Pending", val: STAFF.filter(s=>s.salary==="Pending").length, icon: "💰" },
          ].map(s=>(
            <div key={s.label} className={`p-4 rounded-2xl border ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>{s.label}</p>
                  <p className={`text-2xl font-black mt-1 ${dark?"text-white":"text-gray-900"}`}>{s.val}</p>
                </div>
                <span className="text-2xl">{s.icon}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {depts.map(d=>(
            <button key={d} onClick={()=>setFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${filter===d?"bg-blue-600 text-white":dark?"bg-gray-800 text-gray-300 border border-gray-700":"bg-white text-gray-600 border border-gray-200"}`}>
              {d}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(s=>(
            <div key={s.id} className={`p-4 rounded-2xl border ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${dark?"bg-blue-900 text-blue-300":"bg-blue-100 text-blue-700"}`}>
                  {s.name[0]}
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${dark?"text-white":"text-gray-900"}`}>{s.name}</p>
                  <p className={`text-sm ${dark?"text-gray-400":"text-gray-500"}`}>{s.role} • {s.dept}</p>
                  <p className={`text-xs ${dark?"text-gray-500":"text-gray-400"}`}>{s.exp} experience • {s.shift} shift</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.attendance==="Present"?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>
                    {s.attendance}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.salary==="Paid"?"bg-blue-100 text-blue-700":"bg-yellow-100 text-yellow-700"}`}>
                    Salary: {s.salary}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MEDICINES PAGE ───────────────────────────────────────────────────────────

function MedicinesPage({ dark }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const cats = ["All", ...new Set(MEDICINES.map(m=>m.category))];
  const filtered = MEDICINES.filter(m=>
    (cat==="All"||m.category===cat) && m.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className={`min-h-screen ${dark?"bg-gray-900":"bg-gray-50"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className={`text-2xl font-black ${dark?"text-white":"text-gray-900"}`}>💊 Medicine Information</h1>
          <p className={`text-sm mt-1 ${dark?"text-gray-400":"text-gray-500"}`}>Availability, pricing, and basic usage information</p>
        </div>
        {/* Safety banner */}
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 mb-6 flex gap-3 items-start">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <p className="text-red-700 font-semibold text-sm">Important Safety Notice</p>
            <p className="text-red-600 text-xs mt-0.5">This information is for reference only. Always consult a qualified doctor or pharmacist before taking any medicine. Self-medication can be dangerous.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          <input placeholder="Search medicine..." value={search} onChange={e=>setSearch(e.target.value)}
            className={`flex-1 min-w-48 px-4 py-2.5 rounded-xl border text-sm outline-none
              ${dark?"bg-gray-800 border-gray-700 text-white placeholder-gray-400":"bg-white border-gray-300"}`}/>
          <select value={cat} onChange={e=>setCat(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border text-sm outline-none
              ${dark?"bg-gray-800 border-gray-700 text-white":"bg-white border-gray-300"}`}>
            {cats.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(m=>(
            <div key={m.id} className={`p-5 rounded-2xl border ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className={`font-bold ${dark?"text-white":"text-gray-900"}`}>{m.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${dark?"bg-blue-900 text-blue-300":"bg-blue-100 text-blue-700"}`}>{m.category}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium
                  ${m.stock==="Available"?"bg-green-100 text-green-700":m.stock==="Low Stock"?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-600"}`}>
                  {m.stock}
                </span>
              </div>
              {/* Price comparison */}
              <div className={`flex gap-4 my-3 p-3 rounded-xl ${dark?"bg-gray-700":"bg-gray-50"}`}>
                <div>
                  <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>MRP</p>
                  <p className={`font-bold line-through ${dark?"text-gray-400":"text-gray-500"}`}>₹{m.mrp}</p>
                </div>
                <div>
                  <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>Our Price</p>
                  <p className="font-bold text-green-600">₹{m.price}</p>
                </div>
                <div>
                  <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>Savings</p>
                  <p className="font-bold text-blue-500">₹{m.mrp - m.price}</p>
                </div>
              </div>
              <p className={`text-xs mb-1 ${dark?"text-gray-400":"text-gray-600"}`}><span className="font-medium">Uses:</span> {m.uses}</p>
              <p className="text-xs text-yellow-600 flex items-center gap-1"><span>⚠️</span> {m.warning}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COMPLAINTS PAGE ──────────────────────────────────────────────────────────

function ComplaintsPage({ dark, addToast }) {
  const [complaints, setComplaints] = useState(() => getLS("medicare_complaints", []));
  const [form, setForm] = useState({ name: "", dept: "", subject: "", desc: "" });

  useEffect(() => { setLS("medicare_complaints", complaints); }, [complaints]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.subject || !form.desc) { addToast("Fill all required fields.", "error"); return; }
    const c = { ...form, id: Date.now(), status: "Pending", date: new Date().toLocaleDateString(), ref: `CMP-${Date.now().toString().slice(-6)}` };
    setComplaints(prev => [c, ...prev]);
    setForm({ name:"", dept:"", subject:"", desc:"" });
    addToast("Complaint registered! Ref: " + c.ref, "success");
  }

  return (
    <div className={`min-h-screen ${dark?"bg-gray-900":"bg-gray-50"} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${dark?"text-white":"text-gray-900"}`}>📝 Complaints & Feedback</h1>
          <p className={`text-sm mt-1 ${dark?"text-gray-400":"text-gray-500"}`}>We take every complaint seriously and respond within 48 hours</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <div className={`p-6 rounded-2xl border ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
            <h2 className={`font-bold text-lg mb-4 ${dark?"text-white":"text-gray-900"}`}>Register Complaint</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {[
                { label:"Your Name *", key:"name", ph:"Full name" },
                { label:"Department", key:"dept", ph:"e.g. OPD, ICU, Pharmacy" },
                { label:"Subject *", key:"subject", ph:"Brief subject" },
              ].map(f=>(
                <div key={f.key}>
                  <label className={`block text-xs font-medium mb-1 ${dark?"text-gray-300":"text-gray-700"}`}>{f.label}</label>
                  <input type="text" placeholder={f.ph} value={form[f.key]}
                    onChange={e=>setForm({...form,[f.key]:e.target.value})}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500
                      ${dark?"bg-gray-700 border-gray-600 text-white placeholder-gray-400":"bg-white border-gray-300"}`}/>
                </div>
              ))}
              <div>
                <label className={`block text-xs font-medium mb-1 ${dark?"text-gray-300":"text-gray-700"}`}>Description *</label>
                <textarea rows={4} placeholder="Describe your complaint in detail..." value={form.desc}
                  onChange={e=>setForm({...form,desc:e.target.value})}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none
                    ${dark?"bg-gray-700 border-gray-600 text-white placeholder-gray-400":"bg-white border-gray-300"}`}/>
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all">
                Submit Complaint
              </button>
            </form>
          </div>
          {/* History */}
          <div>
            <h2 className={`font-bold text-lg mb-4 ${dark?"text-white":"text-gray-900"}`}>
              Complaint History ({complaints.length})
            </h2>
            {complaints.length === 0 ? (
              <div className={`text-center py-12 rounded-2xl border ${dark?"bg-gray-800 border-gray-700 text-gray-400":"bg-white border-gray-200 text-gray-500"}`}>
                <div className="text-4xl mb-2">📋</div>
                <p>No complaints registered</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                {complaints.map(c=>(
                  <div key={c.id} className={`p-4 rounded-2xl border ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className={`font-semibold text-sm ${dark?"text-white":"text-gray-900"}`}>{c.subject}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status==="Resolved"?"bg-green-100 text-green-700":"bg-yellow-100 text-yellow-700"}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>By {c.name} {c.dept && `• ${c.dept}`}</p>
                    <p className={`text-xs mt-1 ${dark?"text-gray-400":"text-gray-500"}`}>{c.desc}</p>
                    <p className={`text-xs mt-2 font-mono ${dark?"text-gray-500":"text-gray-400"}`}>Ref: {c.ref} • {c.date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CONTACT PAGE ─────────────────────────────────────────────────────────────

function ContactPage({ dark }) {
  return (
    <div className={`min-h-screen ${dark?"bg-gray-900":"bg-gray-50"} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${dark?"text-white":"text-gray-900"}`}>📞 Contact Us</h1>
          <p className={`text-sm mt-1 ${dark?"text-gray-400":"text-gray-500"}`}>We are here to help, 24 hours a day, 7 days a week</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {[
            { icon:"📍", label:"Address", val:"123 MediCare Road, Health Nagar, Mumbai – 400001, Maharashtra, India" },
            { icon:"📱", label:"Phone", val:"+91 22 1234 5678" },
            { icon:"🚨", label:"Emergency (24/7)", val:"+91 22 9999 0000" },
            { icon:"📧", label:"Email", val:"care@medicarepro.in" },
            { icon:"🌐", label:"Website", val:"www.medicarepro.in" },
            { icon:"🕒", label:"OPD Hours", val:"Mon–Sat: 8:00 AM – 8:00 PM" },
          ].map(c=>(
            <div key={c.label} className={`p-5 rounded-2xl border flex gap-4 items-start ${dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200"}`}>
              <span className="text-3xl">{c.icon}</span>
              <div>
                <p className={`font-bold text-sm ${dark?"text-white":"text-gray-900"}`}>{c.label}</p>
                <p className={`text-sm mt-0.5 ${dark?"text-gray-400":"text-gray-600"}`}>{c.val}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Emergency Banner */}
        <div className="p-5 rounded-2xl bg-red-600 text-white text-center mb-8">
          <p className="text-2xl mb-1">🚨</p>
          <p className="font-black text-xl">Medical Emergency?</p>
          <p className="text-red-100 mb-2">Call our emergency hotline immediately</p>
          <p className="font-black text-3xl">+91 22 9999 0000</p>
          <p className="text-red-200 text-sm mt-1">Available 24 hours a day, 365 days a year</p>
        </div>
        {/* Footer */}
        <div className={`border-t pt-6 text-center ${dark?"border-gray-700":"border-gray-200"}`}>
          <p className={`text-2xl font-black mb-1 ${dark?"text-white":"text-gray-900"}`}>🏥 MediCare Pro</p>
          <p className={`text-sm mb-3 ${dark?"text-gray-400":"text-gray-500"}`}>Smart Hospital Management Platform</p>
          <p className={`text-xs ${dark?"text-gray-600":"text-gray-400"}`}>
            Built with ❤️ using React + Tailwind CSS &nbsp;|&nbsp; College Project 2026 &nbsp;|&nbsp; © MediCare Pro
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark] = useState(() => getLS("medicare_dark", false));
  const [page, setPage] = useState("Home");
  const [toasts, setToasts] = useState([]);
  const [prefillDoctor, setPrefillDoctor] = useState("");
  const toastId = useRef(0);

  useEffect(() => { setLS("medicare_dark", dark); }, [dark]);

  function addToast(msg, type = "info") {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  function removeToast(id) { setToasts(prev => prev.filter(t => t.id !== id)); }

  function navigateTo(p) {
    if (p !== "Dashboard") setPrefillDoctor("");
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className={`min-h-screen ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <Toast toasts={toasts} remove={removeToast} />
      <Navbar page={page} setPage={navigateTo} dark={dark} setDark={setDark} />
      {page === "Home" && <HomePage dark={dark} setPage={navigateTo} />}
      {page === "Dashboard" && <DashboardPage dark={dark} addToast={addToast} prefillDoctor={prefillDoctor} />}
      {page === "Doctors" && <DoctorsPage dark={dark} setPage={navigateTo} setPrefillDoctor={setPrefillDoctor} />}
      {page === "Staff" && <StaffPage dark={dark} />}
      {page === "Medicines" && <MedicinesPage dark={dark} />}
      {page === "Complaints" && <ComplaintsPage dark={dark} addToast={addToast} />}
      {page === "Contact" && <ContactPage dark={dark} />}
    </div>
  );
}