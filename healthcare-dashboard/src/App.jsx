import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { DOCTORS } from "./data/doctors";
import { generateToken } from "./utils/tokenGenerator";
import { getLS, setLS } from "./utils/localStorage";
import { getSymptomSuggestion } from "./utils/symptomSuggestion";
import DoctorCard from "./components/DoctorCard";
import { STAFF } from "./data/staff";
import { MEDICINES } from "./data/medicines";
import { ANNOUNCEMENTS } from "./data/announcements";
const emptyForm = {
  patient: "",
  age: "",
  phone: "",
  symptoms: "",
  date: "",
  time: "",
};

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

function LiveClock({ darkMode }) {
  const now = useLiveClock();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayName = days[now.getDay()];
  const date = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  const hour12 = now.getHours() % 12 || 12;

  return (
    <div className={`rounded-2xl border px-5 py-4 flex flex-col items-end justify-center min-w-[180px] shadow-lg ${darkMode ? "bg-slate-800/80 border-slate-700 text-white" : "bg-white/80 border-slate-200 text-slate-900"}`}>
      <div className="text-3xl font-black tabular-nums tracking-tight text-cyan-400">
        {String(hour12).padStart(2, "0")}:{minutes}:{seconds}
        <span className="text-base font-semibold ml-1 text-cyan-300">{ampm}</span>
      </div>
      <div className={`text-xs mt-1 font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
        {dayName}, {date} {month} {year}
      </div>
    </div>
  );
}

function AnnouncementTag({ color }) {
  const colors = {
    red: "bg-red-100 text-red-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    cyan: "bg-cyan-100 text-cyan-700",
  };
  return colors[color] || colors.cyan;
}

function AnnouncementsPanel({ darkMode }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const tagColors = {
    red: darkMode ? "bg-red-950 text-red-300" : "bg-red-100 text-red-700",
    green: darkMode ? "bg-green-950 text-green-300" : "bg-green-100 text-green-700",
    yellow: darkMode ? "bg-yellow-950 text-yellow-300" : "bg-yellow-100 text-yellow-700",
    cyan: darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-100 text-cyan-700",
  };

  const borderColors = {
    red: "border-red-500",
    green: "border-green-500",
    yellow: "border-yellow-500",
    cyan: "border-cyan-500",
  };

  return (
    <div className={`rounded-2xl border shadow-xl overflow-hidden ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
      <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800 bg-slate-800/60" : "border-slate-100 bg-slate-50"}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📢</span>
          <h2 className={`font-black text-lg ${darkMode ? "text-white" : "text-slate-900"}`}>Hospital Announcements</h2>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-100 text-cyan-700"}`}>
          {ANNOUNCEMENTS.length} Active
        </span>
      </div>

      <div className="flex gap-1 p-3 border-b overflow-x-auto scrollbar-none" style={{ borderColor: darkMode ? "#1e293b" : "#f1f5f9" }}>
        {ANNOUNCEMENTS.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setActiveIdx(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeIdx === i
                ? tagColors[a.color] + " shadow"
                : darkMode
                ? "text-slate-400 hover:bg-slate-800"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <span>{a.icon}</span>
            {a.title}
          </button>
        ))}
      </div>

      <div className="p-5">
        {ANNOUNCEMENTS.map((a, i) =>
          i === activeIdx ? (
            <div key={a.id} className={`rounded-xl border-l-4 p-4 ${borderColors[a.color]} ${darkMode ? "bg-slate-800/50" : "bg-slate-50"}`}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{a.icon}</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className={`font-black text-base ${darkMode ? "text-white" : "text-slate-900"}`}>{a.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tagColors[a.color]}`}>{a.tag}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{a.desc}</p>
                </div>
              </div>
            </div>
          ) : null
        )}
        <div className="flex justify-center gap-1.5 mt-4">
          {ANNOUNCEMENTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`rounded-full transition-all ${activeIdx === i ? "w-5 h-2 bg-cyan-500" : "w-2 h-2 " + (darkMode ? "bg-slate-700" : "bg-slate-300")}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCards({ darkMode }) {
  const availableDoctors = DOCTORS.filter((d) => d.status === "Available").length;
  const availableMedicines = MEDICINES.filter((m) => m.stock === "Available").length;

  const stats = [
    { label: "Total Doctors", value: DOCTORS.length, icon: "👨‍⚕️", sub: `${availableDoctors} available`, color: "cyan" },
    { label: "Available Doctors", value: availableDoctors, icon: "✅", sub: "Ready to consult", color: "green" },
    { label: "Total Staff", value: STAFF.length, icon: "👥", sub: `${STAFF.filter(s => s.attendance === "Present").length} present today`, color: "blue" },
    { label: "Medicines Available", value: availableMedicines, icon: "💊", sub: `${MEDICINES.length} total in inventory`, color: "purple" },
  ];

  const colorMap = {
    cyan: { bg: darkMode ? "bg-cyan-950" : "bg-cyan-50", text: "text-cyan-400", border: "border-cyan-800" },
    green: { bg: darkMode ? "bg-green-950" : "bg-green-50", text: "text-green-400", border: "border-green-800" },
    blue: { bg: darkMode ? "bg-blue-950" : "bg-blue-50", text: "text-blue-400", border: "border-blue-800" },
    purple: { bg: darkMode ? "bg-purple-950" : "bg-purple-50", text: "text-purple-400", border: "border-purple-800" },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => {
        const c = colorMap[stat.color];
        return (
          <div
            key={stat.label}
            className={`rounded-2xl border p-5 flex flex-col gap-1 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-1 ${c.bg}`}>
              {stat.icon}
            </div>
            <p className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{stat.label}</p>
            <p className={`text-3xl font-black ${c.text}`}>{stat.value}</p>
            <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{stat.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border p-4 shadow-xl transition-all ${
            toast.type === "success"
              ? "bg-emerald-950 text-emerald-200 border-emerald-700"
              : toast.type === "error"
              ? "bg-red-950 text-red-200 border-red-700"
              : "bg-slate-900 text-slate-200 border-slate-700"
          }`}
        >
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-bold text-sm">{toast.title}</p>
              {toast.message && <p className="text-xs mt-1 opacity-80">{toast.message}</p>}
            </div>
            <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoginScreen({ darkMode, role, setRole, onLogin, addToast }) {
  const cardClass = darkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200 text-slate-950";

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      onLogin({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "User",
        email: firebaseUser.email || "",
        photo: firebaseUser.photoURL || "",
        role,
      });
      addToast("Login successful", `${firebaseUser.displayName || "User"} logged in as ${role}.`, "success");
    } catch (error) {
      addToast("Login failed", error.message || "Unable to sign in with Google.", "error");
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"}`}>
      <div className={`w-full max-w-xl border rounded-3xl shadow-2xl p-8 ${cardClass}`}>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏥</div>
          <h1 className="text-4xl font-bold">Smart Healthcare System</h1>
          <p className={`mt-3 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
            Sign in with Google and choose your role to continue.
          </p>
        </div>
        <div className="mb-6">
          <p className="font-semibold mb-3">Select Role</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["Patient", "Hospital", "Admin"].map((item) => (
              <button
                key={item}
                onClick={() => setRole(item)}
                className={`px-4 py-3 rounded-2xl border font-semibold transition-all ${
                  role === item
                    ? "bg-cyan-600 text-white border-cyan-500 shadow-lg"
                    : darkMode
                    ? "bg-slate-950 border-slate-700 text-slate-300 hover:border-cyan-500"
                    : "bg-white border-slate-300 text-slate-700 hover:border-cyan-500"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleGoogleLogin}
          className="w-full px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}

function Navbar({ page, setPage, darkMode, setDarkMode, user, onLogout, canManage }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    "Home", "Dashboard", "Doctors", "Medicines", "Staff", "Complaints", "Contact",
  ].filter((item) => {
    if (["Medicines", "Staff", "Complaints"].includes(item) && !canManage) return false;
    return true;
  });

  return (
    <nav className={`sticky top-0 z-40 shadow-lg border-b ${darkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage("Home")}>
          <div className="text-2xl">🏥</div>
          <div>
            <div className={`font-bold text-lg leading-tight ${darkMode ? "text-white" : "text-slate-900"}`}>MediCare Pro</div>
            <div className="text-xs text-cyan-500 leading-tight">Smart Hospital Management</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((item) => (
            <button
              key={item}
              onClick={() => setPage(item)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                page === item
                  ? "bg-cyan-600 text-white shadow"
                  : darkMode
                  ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item}
            </button>
          ))}
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className={`ml-2 px-3 py-2 rounded-lg transition-all ${darkMode ? "bg-slate-800 text-yellow-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {darkMode ? "☀ Light" : "🌙 Dark"}
          </button>
          <div className={`ml-2 px-3 py-2 rounded-lg text-sm ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
            {user?.name} ({user?.role})
          </div>
          <button onClick={onLogout} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-all">
            Logout
          </button>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className={`p-2 rounded-lg ${darkMode ? "bg-slate-800 text-yellow-300" : "bg-slate-100 text-slate-700"}`}
          >
            {darkMode ? "☀" : "🌙"}
          </button>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`p-2 rounded-lg ${darkMode ? "text-white" : "text-slate-900"}`}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className={`md:hidden px-4 pb-4 flex flex-col gap-2 ${darkMode ? "bg-slate-950" : "bg-white"}`}>
          {navLinks.map((item) => (
            <button
              key={item}
              onClick={() => { setPage(item); setMenuOpen(false); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                page === item ? "bg-cyan-600 text-white" : darkMode ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {item}
            </button>
          ))}
          <div className={`px-3 py-2 rounded-lg text-sm ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
            {user?.name} ({user?.role})
          </div>
          <button onClick={onLogout} className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-red-600 text-white">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

function HomePage({ darkMode, setPage }) {
  const services = [
    { icon: "❤️", title: "Cardiology", desc: "Advanced heart care with 24/7 monitoring" },
    { icon: "🧠", title: "Neurology", desc: "Expert neurological diagnosis and treatment" },
    { icon: "🦴", title: "Orthopedics", desc: "Bone, joint and spine care specialists" },
    { icon: "🧒", title: "Pediatrics", desc: "Dedicated child health and wellness" },
    { icon: "🧪", title: "Pathology", desc: "Accurate diagnostic lab services" },
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
      <div className={`relative overflow-hidden ${darkMode ? "bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950" : "bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800"} py-20 px-4`}>
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            🏆 Ranked #1 Hospital in the Region
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
            Your Health,<br />
            <span className="text-yellow-300">Our Priority</span>
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            MediCare Pro delivers world-class healthcare with smart technology, compassionate doctors, and a patient-first approach.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setPage("Dashboard")}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold px-6 py-3 rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
            >
              Book Appointment
            </button>
            <button
              onClick={() => setPage("Doctors")}
              className="bg-white/20 hover:bg-white/30 backdrop-blur text-white font-semibold px-6 py-3 rounded-xl transition-all border border-white/30 hover:-translate-y-0.5"
            >
              Our Doctors
            </button>
          </div>
        </div>
      </div>

      <div className={`${darkMode ? "bg-slate-800" : "bg-blue-600"} py-8`}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((item) => (
            <div key={item.label} className="text-center text-white">
              <div className="text-3xl font-black">{item.val}</div>
              <div className="text-blue-200 text-sm mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={`py-16 px-4 ${darkMode ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className={`text-3xl font-black mb-2 ${darkMode ? "text-white" : "text-slate-900"}`}>Our Specializations</h2>
            <p className={`${darkMode ? "text-slate-400" : "text-slate-500"}`}>Comprehensive healthcare services under one roof</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {services.map((item) => (
              <div
                key={item.title}
                className={`p-6 rounded-2xl border transition-all hover:-translate-y-1.5 hover:shadow-xl cursor-pointer ${
                  darkMode ? "bg-slate-800 border-slate-700 hover:border-cyan-700" : "bg-white border-slate-200 hover:border-cyan-300"
                }`}
              >
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className={`font-bold text-lg mb-1 ${darkMode ? "text-white" : "text-slate-900"}`}>{item.title}</h3>
                <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DoctorsPage({ darkMode, setPage, setSelectedDoctorFromPage }) {
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("All");
  const specs = ["All", ...new Set(DOCTORS.map((doctor) => doctor.spec))];
  const filtered = DOCTORS.filter(
    (doctor) =>
      (spec === "All" || doctor.spec === spec) &&
      (doctor.name.toLowerCase().includes(search.toLowerCase()) ||
        doctor.spec.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>Our Doctors</h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Expert healthcare professionals ready to help you.</p>
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            placeholder="Search by name or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 min-w-48 px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-cyan-500 ${
              darkMode ? "bg-slate-900 border-slate-700 text-white placeholder-slate-400" : "bg-white border-slate-300"
            }`}
          />
          <select
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border text-sm outline-none ${
              darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
            }`}
          >
            {specs.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((doctor) => (
            <div
              key={doctor.id}
              className={`p-5 rounded-2xl border transition-all hover:-translate-y-1.5 hover:shadow-xl ${
                darkMode ? "bg-slate-900 border-slate-800 hover:border-cyan-800" : "bg-white border-slate-200 hover:border-cyan-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow ${darkMode ? "bg-slate-800" : "bg-cyan-50"}`}>
                  👨‍⚕️
                </div>
                <div>
                  <p className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{doctor.name}</p>
                  <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{doctor.spec}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs text-yellow-500">⭐ {doctor.rating}/5</span>
                    <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>({doctor.reviews} reviews)</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                  {doctor.exp} experience
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${doctor.status === "Available" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {doctor.status}
                </span>
              </div>
              {doctor.status === "Available" && doctor.slots.length > 0 && (
                <div className="mb-3">
                  <p className={`text-xs font-medium mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Available Slots:</p>
                  <div className="flex flex-wrap gap-1">
                    {doctor.slots.map((slot) => (
                      <span key={slot} className={`text-xs px-2 py-1 rounded-lg ${darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-50 text-cyan-700"}`}>
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {doctor.status === "Available" ? (
                <button
                  onClick={() => { setSelectedDoctorFromPage(doctor); setPage("Dashboard"); }}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all hover:shadow-lg"
                >
                  Book Appointment
                </button>
              ) : (
                <button disabled className="w-full bg-slate-200 text-slate-400 font-semibold py-2.5 rounded-xl text-sm cursor-not-allowed">
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

function StaffPage({ darkMode }) {
  const [filter, setFilter] = useState("All");
  const departments = ["All", ...new Set(STAFF.map((item) => item.dept))];
  const filtered = filter === "All" ? STAFF : STAFF.filter((item) => item.dept === filter);

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>Staff Management</h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Hospital staff directory and attendance overview</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Staff", val: STAFF.length },
            { label: "Present Today", val: STAFF.filter((item) => item.attendance === "Present").length },
            { label: "Absent", val: STAFF.filter((item) => item.attendance === "Absent").length },
            { label: "Salary Pending", val: STAFF.filter((item) => item.salary === "Pending").length },
          ].map((item) => (
            <div key={item.label} className={`p-4 rounded-2xl border shadow hover:-translate-y-0.5 transition-all ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{item.label}</p>
              <p className={`text-2xl font-black mt-1 ${darkMode ? "text-white" : "text-slate-900"}`}>{item.val}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setFilter(dept)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === dept
                  ? "bg-cyan-600 text-white shadow"
                  : darkMode
                  ? "bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-700"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-cyan-400"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className={`p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow ${darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-100 text-cyan-700"}`}>
                  {item.name[0]}
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{item.name}</p>
                  <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{item.role} - {item.dept}</p>
                  <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{item.exp} experience · {item.shift} shift</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.attendance === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {item.attendance}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.salary === "Paid" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                    Salary: {item.salary}
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

function MedicinesPage({ darkMode }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", ...new Set(MEDICINES.map((item) => item.category))];
  const filtered = MEDICINES.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>Medicine Comparator</h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Availability, pricing, and basic usage information.</p>
        </div>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 mb-6">
          <p className="text-red-700 font-semibold text-sm">Important Safety Notice</p>
          <p className="text-red-600 text-xs mt-0.5">This information is for reference only. Always consult a qualified doctor or pharmacist before taking any medicine.</p>
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            placeholder="Search medicine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 min-w-48 px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-cyan-500 transition-all ${
              darkMode ? "bg-slate-900 border-slate-700 text-white placeholder-slate-400" : "bg-white border-slate-300"
            }`}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border text-sm outline-none ${
              darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
            }`}
          >
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className={`p-5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{item.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-100 text-cyan-700"}`}>
                    {item.category}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  item.stock === "Available" ? "bg-green-100 text-green-700" : item.stock === "Low Stock" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"
                }`}>
                  {item.stock}
                </span>
              </div>
              <div className={`flex gap-4 my-3 p-3 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                <div>
                  <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>MRP</p>
                  <p className={`font-bold line-through ${darkMode ? "text-slate-400" : "text-slate-500"}`}>₹{item.mrp}</p>
                </div>
                <div>
                  <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Our Price</p>
                  <p className="font-bold text-green-600">₹{item.price}</p>
                </div>
                <div>
                  <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Savings</p>
                  <p className="font-bold text-cyan-600">₹{item.mrp - item.price}</p>
                </div>
              </div>
              <p className={`text-xs mb-1 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                <span className="font-medium">Uses:</span> {item.uses}
              </p>
              <p className="text-xs text-yellow-600">
                <span className="font-medium">Warning:</span> {item.warning}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComplaintsPage({ darkMode, addToast }) {
  const [complaints, setComplaints] = useState(() => getLS("complaints", []));
  const [form, setForm] = useState({ name: "", dept: "", subject: "", desc: "" });

  useEffect(() => { setLS("complaints", complaints); }, [complaints]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.name || !form.subject || !form.desc) {
      addToast("Check details", "Fill all required complaint fields.", "error");
      return;
    }
    const newComplaint = {
      ...form,
      id: Date.now(),
      status: "Pending",
      date: new Date().toLocaleDateString(),
      ref: `CMP-${Date.now().toString().slice(-6)}`,
    };
    setComplaints((prev) => [newComplaint, ...prev]);
    setForm({ name: "", dept: "", subject: "", desc: "" });
    addToast("Complaint registered", `Reference: ${newComplaint.ref}`, "success");
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>Complaints & Feedback</h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>We take every complaint seriously and respond as quickly as possible.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl border shadow-lg ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <h2 className={`font-bold text-lg mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>Register Complaint</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {[
                { label: "Your Name *", key: "name", placeholder: "Full name", type: "text" },
                { label: "Department", key: "dept", placeholder: "e.g. OPD, ICU, Pharmacy", type: "text" },
                { label: "Subject *", key: "subject", placeholder: "Brief subject", type: "text" },
              ].map((field) => (
                <div key={field.key}>
                  <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-cyan-500 transition-all ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" : "bg-white border-slate-300"
                    }`}
                  />
                </div>
              ))}
              <div>
                <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Description *</label>
                <textarea
                  rows={4}
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  placeholder="Describe your complaint..."
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none focus:border-cyan-500 transition-all ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" : "bg-white border-slate-300"
                  }`}
                />
              </div>
              <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl transition-all hover:shadow-lg">
                Submit Complaint
              </button>
            </form>
          </div>
          <div>
            <h2 className={`font-bold text-lg mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>Complaint History ({complaints.length})</h2>
            {complaints.length === 0 ? (
              <div className={`text-center py-12 rounded-2xl border ${darkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"}`}>
                No complaints registered
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                {complaints.map((item) => (
                  <div key={item.id} className={`p-4 rounded-2xl border transition-all hover:shadow ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className={`font-semibold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{item.subject}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status === "Resolved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>By {item.name} {item.dept ? `· ${item.dept}` : ""}</p>
                    <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{item.desc}</p>
                    <p className={`text-xs mt-2 font-mono ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Ref: {item.ref} · {item.date}</p>
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

function ContactPage({ darkMode }) {
  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>Contact Us</h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>We are here to help, 24 hours a day, 7 days a week.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {[
            { label: "Address", val: "123 MediCare Road, Health Nagar, Mumbai 400001, Maharashtra, India" },
            { label: "Phone", val: "+91 22 1234 5678" },
            { label: "Emergency (24/7)", val: "+91 22 9999 0000" },
            { label: "Email", val: "care@medicarepro.in" },
            { label: "Website", val: "www.medicarepro.in" },
            { label: "OPD Hours", val: "Mon–Sat: 8:00 AM – 8:00 PM" },
          ].map((item) => (
            <div key={item.label} className={`p-5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              <p className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{item.label}</p>
              <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{item.val}</p>
            </div>
          ))}
        </div>
        <div className="p-5 rounded-2xl bg-red-600 text-white text-center mb-8 shadow-xl">
          <p className="font-black text-xl">Medical Emergency?</p>
          <p className="text-red-100 mb-2">Call our emergency hotline immediately</p>
          <p className="font-black text-3xl">+91 22 9999 0000</p>
          <p className="text-red-200 text-sm mt-1">Available 24 hours a day, 365 days a year</p>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ darkMode, appointments, setAppointments, addToast, preselectedDoctor, clearPreselectedDoctor }) {
  const [formData, setFormData] = useState(emptyForm);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [specialization, setSpecialization] = useState("All");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("All");

  useEffect(() => {
    if (preselectedDoctor) {
      setSelectedDoctor(preselectedDoctor);
      clearPreselectedDoctor();
    }
  }, [preselectedDoctor, clearPreselectedDoctor]);

  const cardClass = darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-950";
  const inputClass = darkMode ? "bg-slate-950 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-500";
  const subTextClass = darkMode ? "text-slate-400" : "text-slate-600";

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
    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    if (selectedDateTime < new Date()) return "Appointment must be in the future.";
    return null;
  };

  const handleBooking = () => {
    const error = validateForm();
    if (error) { addToast("Check details", error, "error"); return; }
    const duplicate = appointments.some(
      (item) => item.id !== editingId && item.doctor.toLowerCase() === selectedDoctor.name.toLowerCase() && item.date === formData.date && item.time === formData.time
    );
    if (duplicate) { addToast("Duplicate booking", "This slot is already booked for this doctor.", "error"); return; }

    if (editingId) {
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, patient: formData.patient.trim(), age: Number(formData.age), phone: formData.phone.trim(), symptoms: formData.symptoms.trim(), date: formData.date, time: formData.time, doctor: selectedDoctor.name, spec: selectedDoctor.spec }
            : item
        )
      );
      addToast("Appointment updated", "Changes saved successfully.", "success");
      resetForm();
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
      bookedAt: new Date().toISOString(),
    };
    setAppointments((prev) => [newAppointment, ...prev]);
    addToast("Appointment booked", `Token: ${token}`, "success");
    resetForm();
  };

  const startEdit = (appointment) => {
    const doctor = DOCTORS.find((doc) => doc.name === appointment.doctor);
    setEditingId(appointment.id);
    setSelectedDoctor(doctor || DOCTORS[0]);
    setFormData({ patient: appointment.patient, age: appointment.age, phone: appointment.phone || "", symptoms: appointment.symptoms, date: appointment.date, time: appointment.time });
    window.scrollTo({ top: 0, behavior: "smooth" });
    addToast("Edit mode active", appointment.token, "info");
  };

  const deleteAppointment = (id) => { setAppointments((prev) => prev.filter((item) => item.id !== id)); addToast("Deleted", "Appointment removed.", "info"); };
  const updateStatus = (id, status) => { setAppointments((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item))); addToast("Status updated", `Marked as ${status}.`, "success"); };
  const clearAll = () => { if (!window.confirm("Clear all appointments?")) return; setAppointments([]); addToast("Cleared", "All appointments removed.", "info"); };

  const specializations = useMemo(() => ["All", ...new Set(DOCTORS.map((doctor) => doctor.spec))], []);
  const filteredDoctors = DOCTORS.filter((doctor) => {
    const searchText = doctorSearch.toLowerCase();
    return (doctor.name.toLowerCase().includes(searchText) || doctor.spec.toLowerCase().includes(searchText)) && (specialization === "All" || doctor.spec === specialization);
  });

  const pendingCount = appointments.filter((item) => item.status === "Pending").length;
  const confirmedCount = appointments.filter((item) => item.status === "Confirmed").length;
  const completedCount = appointments.filter((item) => item.status === "Completed").length;

  const filteredHistory = appointments.filter((item) => {
    const searchText = historySearch.toLowerCase();
    return (
      (item.patient.toLowerCase().includes(searchText) || item.token.toLowerCase().includes(searchText) || item.doctor.toLowerCase().includes(searchText) || item.symptoms.toLowerCase().includes(searchText)) &&
      (historyStatus === "All" || item.status === historyStatus)
    );
  });

  const symptomSuggestion = getSymptomSuggestion(formData.symptoms);

  return (
    <div className={`min-h-screen px-4 py-6 sm:px-8 transition-all ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"}`}>
      <div className="max-w-7xl mx-auto">

        {/* Hero */}
        <section className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 p-6 sm:p-8 rounded-3xl shadow-2xl mb-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-bold leading-tight">Smart Healthcare Dashboard</h1>
              <p className="mt-2 text-blue-100">AI-powered hospital appointment, queue, and patient history system</p>
            </div>
            <LiveClock darkMode={false} />
          </div>
        </section>

        {/* Stat Cards */}
        <StatCards darkMode={darkMode} />

        {/* Announcements */}
        <div className="mb-8">
          <AnnouncementsPanel darkMode={darkMode} />
        </div>

        {/* Emergency & Bed Availability */}
        <section className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <h2 className="text-2xl font-bold mb-5">Emergency & Bed Availability</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "General Beds", val: "42 / 120", sub: "Available now", cls: "bg-emerald-950 text-emerald-300" },
              { label: "ICU Beds", val: "8 / 20", sub: "Critical care ready", cls: "bg-cyan-950 text-cyan-300" },
              { label: "Emergency", val: "24/7", sub: "Call: 108", cls: "bg-red-950 text-red-300" },
              { label: "Oxygen Support", val: "Available", sub: "Ambulance ready", cls: "bg-purple-950 text-purple-300" },
            ].map((item) => (
              <div key={item.label} className={`${item.cls} p-4 rounded-2xl shadow transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
                <p className="text-sm opacity-80">{item.label}</p>
                <h3 className="text-3xl font-bold mt-1">{item.val}</h3>
                <p className="text-xs mt-1 opacity-70">{item.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Appointment Summary */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Appointments", val: appointments.length, color: "text-white" },
            { label: "Pending", val: pendingCount, color: "text-yellow-400" },
            { label: "Confirmed", val: confirmedCount, color: "text-cyan-400" },
            { label: "Completed", val: completedCount, color: "text-emerald-400" },
          ].map((item) => (
            <div key={item.label} className={`${cardClass} border rounded-2xl p-5 shadow hover:-translate-y-0.5 transition-all hover:shadow-lg`}>
              <p className={subTextClass}>{item.label}</p>
              <h2 className={`text-3xl font-bold mt-1 ${item.color}`}>{item.val}</h2>
            </div>
          ))}
        </section>

        {/* Doctor Selection */}
        <section className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <h2 className="text-2xl font-bold mb-5">Select Doctor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
              placeholder="Search doctor or specialization..."
              className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 transition-all ${inputClass}`}
            />
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 transition-all ${inputClass}`}
            >
              {specializations.map((spec) => <option key={spec} value={spec}>{spec}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDoctors.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => setSelectedDoctor(doctor)}
                className={`text-left border rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-lg ${
                  selectedDoctor?.id === doctor.id
                    ? "border-cyan-400 bg-cyan-950 text-white shadow-lg"
                    : `${cardClass} hover:border-cyan-400`
                }`}
              >
                <div className="flex justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{doctor.name}</h3>
                    <p className="text-sm text-cyan-400">{doctor.spec}</p>
                  </div>
                  <span className="text-xl">{doctor.status === "Available" ? "✅" : "🚫"}</span>
                </div>
                <p className={`text-sm mb-2 ${selectedDoctor?.id === doctor.id ? "text-cyan-100" : subTextClass}`}>
                  Experience: {doctor.exp}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-yellow-400">⭐ {doctor.rating}/5</span>
                  <span className={`text-xs ${selectedDoctor?.id === doctor.id ? "text-cyan-200" : (darkMode ? "text-slate-500" : "text-slate-400")}`}>
                    ({doctor.reviews} reviews)
                  </span>
                </div>
                <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${doctor.status === "Available" ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"}`}>
                  {doctor.status}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Booking Form */}
        <section className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <h2 className="text-2xl font-bold">Book Appointment</h2>
            {editingId && <span className="px-4 py-2 rounded-xl bg-purple-950 text-purple-300 text-sm font-bold">Edit Mode Active</span>}
          </div>
          {selectedDoctor ? (
            <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-xl ${darkMode ? "bg-cyan-950" : "bg-cyan-50"}`}>
              <span className="text-xl">👨‍⚕️</span>
              <div>
                <p className="text-cyan-400 font-bold text-sm">{selectedDoctor.name} · {selectedDoctor.spec}</p>
                <p className={`text-xs ${darkMode ? "text-cyan-300" : "text-cyan-700"}`}>⭐ {selectedDoctor.rating}/5 · {selectedDoctor.reviews} reviews · {selectedDoctor.exp} experience</p>
              </div>
            </div>
          ) : (
            <p className={`mb-4 ${subTextClass}`}>Select a doctor above before booking.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { field: "patient", placeholder: "Patient name", type: "text" },
              { field: "age", placeholder: "Age", type: "number" },
              { field: "phone", placeholder: "Phone number (10 digits)", type: "text" },
              { field: "date", placeholder: "", type: "date" },
              { field: "time", placeholder: "", type: "time" },
              { field: "symptoms", placeholder: "Symptoms (e.g. fever, headache)", type: "text" },
            ].map(({ field, placeholder, type }) => (
              <input
                key={field}
                type={type}
                value={formData[field]}
                onChange={(e) => updateForm(field, e.target.value)}
                placeholder={placeholder}
                className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 transition-all ${inputClass}`}
              />
            ))}
          </div>
          {symptomSuggestion && (
            <div className="mt-5 rounded-2xl border border-cyan-700 bg-cyan-950 p-4 text-cyan-100">
              <h3 className="font-bold flex items-center gap-2">🤖 AI Symptom Suggestion</h3>
              <p className="text-sm mt-1">Priority: <span className="font-semibold">{symptomSuggestion.level}</span></p>
              <p className="text-sm">Recommended: <span className="font-semibold">{symptomSuggestion.doctor}</span></p>
              <p className="text-xs mt-2 text-cyan-200">{symptomSuggestion.advice}</p>
              <p className="text-xs mt-2 text-red-300">⚠ Demo only – not a medical diagnosis.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-6">
            <button onClick={handleBooking} className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all hover:shadow-lg hover:-translate-y-0.5">
              {editingId ? "Update Appointment" : "Book Appointment"}
            </button>
            <button onClick={resetForm} className="px-6 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all">
              Cancel
            </button>
          </div>
        </section>

        {/* Appointment Queue */}
        <section className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h2 className="text-2xl font-bold">Appointment Queue</h2>
            {appointments.length > 0 && (
              <button onClick={clearAll} className="px-4 py-2 rounded-xl bg-red-950 text-red-300 text-sm font-bold hover:bg-red-900 transition-all">
                Clear All
              </button>
            )}
          </div>
          {appointments.length === 0 ? (
            <div className={`text-center p-8 rounded-2xl border ${subTextClass} ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
              No appointments booked yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {appointments.map((appointment) => (
                <div key={appointment.id} className={`${cardClass} border rounded-2xl p-5 shadow transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
                  <div className="flex justify-between gap-3 mb-3">
                    <div>
                      <p className="text-cyan-400 font-bold text-sm">{appointment.token}</p>
                      <h3 className="text-xl font-bold">{appointment.patient}</h3>
                      <p className={`text-sm ${subTextClass}`}>Age: {appointment.age} · Phone: {appointment.phone || "N/A"}</p>
                    </div>
                    <span className={`h-fit px-3 py-1 rounded-full text-xs font-bold ${
                      appointment.status === "Pending" ? "bg-yellow-950 text-yellow-300" :
                      appointment.status === "Confirmed" ? "bg-cyan-950 text-cyan-300" :
                      "bg-emerald-950 text-emerald-300"
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                  <div className={`space-y-1 text-sm mb-4 p-3 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                    <p><span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Doctor:</span> {appointment.doctor}</p>
                    <p><span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Specialization:</span> {appointment.spec}</p>
                    <p><span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Date & Time:</span> {appointment.date} at {appointment.time}</p>
                    <p><span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Symptoms:</span> {appointment.symptoms}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => updateStatus(appointment.id, "Pending")} className="px-3 py-1.5 rounded-xl bg-yellow-950 text-yellow-300 text-xs font-semibold hover:bg-yellow-900 transition-all">Pending</button>
                    <button onClick={() => updateStatus(appointment.id, "Confirmed")} className="px-3 py-1.5 rounded-xl bg-cyan-950 text-cyan-300 text-xs font-semibold hover:bg-cyan-900 transition-all">Confirm</button>
                    <button onClick={() => updateStatus(appointment.id, "Completed")} className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-semibold hover:bg-emerald-900 transition-all">Complete</button>
                    <button onClick={() => startEdit(appointment)} className="px-3 py-1.5 rounded-xl bg-purple-950 text-purple-300 text-xs font-semibold hover:bg-purple-900 transition-all">Edit</button>
                    <button onClick={() => deleteAppointment(appointment.id)} className="px-3 py-1.5 rounded-xl bg-red-950 text-red-300 text-xs font-semibold hover:bg-red-900 transition-all">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Patient History */}
        <section className={`${cardClass} border rounded-2xl p-6 shadow-xl`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold">Patient History</h2>
              <p className={`${subTextClass} text-sm mt-1`}>Search records by patient, token, doctor, or symptoms.</p>
            </div>
            <span className="text-sm font-semibold text-cyan-400 bg-cyan-950 px-4 py-2 rounded-full w-fit">
              Records: {filteredHistory.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <input
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search patient history..."
              className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 transition-all ${inputClass}`}
            />
            <select
              value={historyStatus}
              onChange={(e) => setHistoryStatus(e.target.value)}
              className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 transition-all ${inputClass}`}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          {filteredHistory.length === 0 ? (
            <div className={`text-center p-8 rounded-2xl border ${subTextClass} ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
              No patient history found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-700">
              <table className="w-full text-sm min-w-[900px]">
                <thead className={darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-800"}>
                  <tr>
                    {["Token", "Patient", "Age", "Phone", "Doctor", "Symptoms", "Date & Time", "Status"].map((h) => (
                      <th key={h} className="text-left p-4 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((appointment) => (
                    <tr key={appointment.id} className={`border-t transition-colors ${darkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50"}`}>
                      <td className="p-4 font-semibold text-cyan-400">{appointment.token}</td>
                      <td className="p-4 font-medium">{appointment.patient}</td>
                      <td className="p-4">{appointment.age}</td>
                      <td className="p-4">{appointment.phone || "N/A"}</td>
                      <td className="p-4">{appointment.doctor}</td>
                      <td className="p-4 max-w-xs truncate">{appointment.symptoms}</td>
                      <td className="p-4">{appointment.date} at {appointment.time}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          appointment.status === "Pending" ? "bg-yellow-950 text-yellow-300" :
                          appointment.status === "Confirmed" ? "bg-cyan-950 text-cyan-300" :
                          "bg-emerald-950 text-emerald-300"
                        }`}>
                          {appointment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => getLS("healthcare_user", null));
  const [role, setRole] = useState("Patient");
  const [page, setPage] = useState("Home");
  const [toasts, setToasts] = useState([]);
  const [selectedDoctorFromPage, setSelectedDoctorFromPage] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");
  const [appointments, setAppointments] = useState(() => getLS("appointments", []));
  const toastTimers = useRef([]);

  useEffect(() => { setLS("appointments", appointments); }, [appointments]);
  useEffect(() => { setLS("healthcare_user", user); }, [user]);
  useEffect(() => { localStorage.setItem("theme", darkMode ? "dark" : "light"); }, [darkMode]);
  useEffect(() => { return () => { toastTimers.current.forEach((timer) => clearTimeout(timer)); }; }, []);

  const addToast = (title, message = "", type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    const timer = setTimeout(() => { setToasts((prev) => prev.filter((toast) => toast.id !== id)); }, 3500);
    toastTimers.current.push(timer);
  };

  const removeToast = (id) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const navigateTo = (nextPage) => { setPage(nextPage); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleLogout = async () => {
    try { await signOut(auth); } catch { /* ignore */ }
    setUser(null);
    setPage("Home");
    addToast("Logged out", "You have been signed out.", "info");
  };

  const clearPreselectedDoctor = () => setSelectedDoctorFromPage(null);
  const canManage = user?.role === "Admin" || user?.role === "Hospital";

  if (!user) {
    return (
      <>
        <Toast toasts={toasts} removeToast={removeToast} />
        <LoginScreen darkMode={darkMode} role={role} setRole={setRole} onLogin={setUser} addToast={addToast} />
      </>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"}`}>
      <Toast toasts={toasts} removeToast={removeToast} />
      <Navbar page={page} setPage={navigateTo} darkMode={darkMode} setDarkMode={setDarkMode} user={user} onLogout={handleLogout} canManage={canManage} />
      {page === "Home" && <HomePage darkMode={darkMode} setPage={navigateTo} />}
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
      {page === "Doctors" && <DoctorsPage darkMode={darkMode} setPage={navigateTo} setSelectedDoctorFromPage={setSelectedDoctorFromPage} />}
      {page === "Medicines" && canManage && <MedicinesPage darkMode={darkMode} />}
      {page === "Staff" && canManage && <StaffPage darkMode={darkMode} />}
      {page === "Complaints" && canManage && <ComplaintsPage darkMode={darkMode} addToast={addToast} />}
      {page === "Contact" && <ContactPage darkMode={darkMode} />}
    </div>
  );
}
