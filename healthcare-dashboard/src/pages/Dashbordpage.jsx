// src/pages/DashboardPage.jsx
import { useState, useEffect, useMemo } from "react";
import { DOCTORS } from "../data/doctors";
import { generateToken } from "../utils/tokenGenerator";
import { getSymptomSuggestion } from "../utils/symptomSuggestion";
import LiveClock from "../components/LiveClock";
import StatCards from "../components/StatCards";
import AnnouncementsPanel from "../components/AnnouncementsPanel";

const emptyForm = { patient: "", age: "", phone: "", symptoms: "", date: "", time: "" };

export default function DashboardPage({
  darkMode,
  appointments,
  setAppointments,
  addToast,
  preselectedDoctor,
  clearPreselectedDoctor,
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [specialization, setSpecialization] = useState("All");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("All");

  const cardClass = darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-950";
  const inputClass = darkMode ? "bg-slate-950 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-500";
  const subTextClass = darkMode ? "text-slate-400" : "text-slate-600";

  // Apply preselected doctor from Doctors page
  useEffect(() => {
    if (preselectedDoctor) {
      setSelectedDoctor(preselectedDoctor);
      clearPreselectedDoctor();
    }
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
    if (new Date(`${formData.date}T${formData.time}`) < new Date()) return "Appointment must be in the future.";
    return null;
  };

  const handleBooking = () => {
    const error = validateForm();
    if (error) { addToast("Check details", error, "error"); return; }

    const duplicate = appointments.some(
      (item) =>
        item.id !== editingId &&
        item.doctor.toLowerCase() === selectedDoctor.name.toLowerCase() &&
        item.date === formData.date &&
        item.time === formData.time
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

  const startEdit = (appt) => {
    const doctor = DOCTORS.find((d) => d.name === appt.doctor);
    setEditingId(appt.id);
    setSelectedDoctor(doctor || DOCTORS[0]);
    setFormData({ patient: appt.patient, age: appt.age, phone: appt.phone || "", symptoms: appt.symptoms, date: appt.date, time: appt.time });
    window.scrollTo({ top: 0, behavior: "smooth" });
    addToast("Edit mode active", appt.token, "info");
  };

  const deleteAppointment = (id) => { setAppointments((prev) => prev.filter((a) => a.id !== id)); addToast("Deleted", "Appointment removed.", "info"); };
  const updateStatus = (id, status) => { setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a)); addToast("Status updated", `Marked as ${status}.`, "success"); };
  const clearAll = () => { if (!window.confirm("Clear all appointments?")) return; setAppointments([]); addToast("Cleared", "All appointments removed.", "info"); };

  const specializations = useMemo(() => ["All", ...new Set(DOCTORS.map((d) => d.spec))], []);
  const filteredDoctors = DOCTORS.filter((d) => {
    const s = doctorSearch.toLowerCase();
    return (d.name.toLowerCase().includes(s) || d.spec.toLowerCase().includes(s)) &&
      (specialization === "All" || d.spec === specialization);
  });

  const pendingCount = appointments.filter((a) => a.status === "Pending").length;
  const confirmedCount = appointments.filter((a) => a.status === "Confirmed").length;
  const completedCount = appointments.filter((a) => a.status === "Completed").length;

  const filteredHistory = appointments.filter((a) => {
    const s = historySearch.toLowerCase();
    return (
      (a.patient.toLowerCase().includes(s) || a.token.toLowerCase().includes(s) ||
        a.doctor.toLowerCase().includes(s) || a.symptoms.toLowerCase().includes(s)) &&
      (historyStatus === "All" || a.status === historyStatus)
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
              {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
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
            {editingId && (
              <span className="px-4 py-2 rounded-xl bg-purple-950 text-purple-300 text-sm font-bold">
                Edit Mode Active
              </span>
            )}
          </div>

          {selectedDoctor ? (
            <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-xl ${darkMode ? "bg-cyan-950" : "bg-cyan-50"}`}>
              <span className="text-xl">👨‍⚕️</span>
              <div>
                <p className="text-cyan-400 font-bold text-sm">{selectedDoctor.name} · {selectedDoctor.spec}</p>
                <p className={`text-xs ${darkMode ? "text-cyan-300" : "text-cyan-700"}`}>
                  ⭐ {selectedDoctor.rating}/5 · {selectedDoctor.reviews} reviews · {selectedDoctor.exp} experience
                </p>
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

          {/* AI Symptom Suggestion */}
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
            <button
              onClick={handleBooking}
              className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              {editingId ? "Update Appointment" : "Book Appointment"}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        </section>

        {/* Appointment Queue */}
        <section className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h2 className="text-2xl font-bold">Appointment Queue</h2>
            {appointments.length > 0 && (
              <button
                onClick={clearAll}
                className="px-4 py-2 rounded-xl bg-red-950 text-red-300 text-sm font-bold hover:bg-red-900 transition-all"
              >
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
              {appointments.map((appt) => (
                <div key={appt.id} className={`${cardClass} border rounded-2xl p-5 shadow transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
                  <div className="flex justify-between gap-3 mb-3">
                    <div>
                      <p className="text-cyan-400 font-bold text-sm">{appt.token}</p>
                      <h3 className="text-xl font-bold">{appt.patient}</h3>
                      <p className={`text-sm ${subTextClass}`}>Age: {appt.age} · Phone: {appt.phone || "N/A"}</p>
                    </div>
                    <span className={`h-fit px-3 py-1 rounded-full text-xs font-bold ${
                      appt.status === "Pending" ? "bg-yellow-950 text-yellow-300" :
                      appt.status === "Confirmed" ? "bg-cyan-950 text-cyan-300" :
                      "bg-emerald-950 text-emerald-300"
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                  <div className={`space-y-1 text-sm mb-4 p-3 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                    <p><span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Doctor:</span> {appt.doctor}</p>
                    <p><span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Specialization:</span> {appt.spec}</p>
                    <p><span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Date & Time:</span> {appt.date} at {appt.time}</p>
                    <p><span className={`font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Symptoms:</span> {appt.symptoms}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => updateStatus(appt.id, "Pending")} className="px-3 py-1.5 rounded-xl bg-yellow-950 text-yellow-300 text-xs font-semibold hover:bg-yellow-900 transition-all">Pending</button>
                    <button onClick={() => updateStatus(appt.id, "Confirmed")} className="px-3 py-1.5 rounded-xl bg-cyan-950 text-cyan-300 text-xs font-semibold hover:bg-cyan-900 transition-all">Confirm</button>
                    <button onClick={() => updateStatus(appt.id, "Completed")} className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-semibold hover:bg-emerald-900 transition-all">Complete</button>
                    <button onClick={() => startEdit(appt)} className="px-3 py-1.5 rounded-xl bg-purple-950 text-purple-300 text-xs font-semibold hover:bg-purple-900 transition-all">Edit</button>
                    <button onClick={() => deleteAppointment(appt.id)} className="px-3 py-1.5 rounded-xl bg-red-950 text-red-300 text-xs font-semibold hover:bg-red-900 transition-all">Delete</button>
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
                  {filteredHistory.map((appt) => (
                    <tr key={appt.id} className={`border-t transition-colors ${darkMode ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50"}`}>
                      <td className="p-4 font-semibold text-cyan-400">{appt.token}</td>
                      <td className="p-4 font-medium">{appt.patient}</td>
                      <td className="p-4">{appt.age}</td>
                      <td className="p-4">{appt.phone || "N/A"}</td>
                      <td className="p-4">{appt.doctor}</td>
                      <td className="p-4 max-w-xs truncate">{appt.symptoms}</td>
                      <td className="p-4">{appt.date} at {appt.time}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          appt.status === "Pending" ? "bg-yellow-950 text-yellow-300" :
                          appt.status === "Confirmed" ? "bg-cyan-950 text-cyan-300" :
                          "bg-emerald-950 text-emerald-300"
                        }`}>
                          {appt.status}
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