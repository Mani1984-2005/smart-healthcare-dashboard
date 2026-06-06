import React, { useEffect, useMemo, useState } from "react";
import Login from "./Login";
import "./App.css";

const DOCTORS = [
  { id: 1, name: "Dr. Arjun Raza", spec: "Cardiologist", exp: "18 Years", status: "Available" },
  { id: 2, name: "Dr. Sunita Sharma", spec: "Neurologist", exp: "14 Years", status: "Available" },
  { id: 3, name: "Dr. Vikram Patel", spec: "Orthopedic", exp: "11 Years", status: "Unavailable" },
  { id: 4, name: "Dr. Kavitha Rao", spec: "Dermatologist", exp: "9 Years", status: "Available" },
];

const emptyForm = {
  patient: "",
  age: "",
  phone: "",
  symptoms: "",
  date: "",
  time: "",
};

function generateToken() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `APT-${date}-${random}`;
}

function getSymptomSuggestion(symptoms) {
  const text = symptoms.toLowerCase();

  if (!text.trim()) return null;

  if (text.includes("chest") || text.includes("heart")) {
    return {
      level: "High Priority",
      doctor: "Cardiologist",
      advice: "Chest or heart-related symptoms may need quick medical attention.",
    };
  }

  if (text.includes("skin") || text.includes("allergy") || text.includes("rash")) {
    return {
      level: "Normal Priority",
      doctor: "Dermatologist",
      advice: "Skin or allergy symptoms can be checked by a dermatologist.",
    };
  }

  if (text.includes("headache") || text.includes("migraine") || text.includes("brain")) {
    return {
      level: "Medium Priority",
      doctor: "Neurologist",
      advice: "Headache or migraine symptoms may need neurological consultation.",
    };
  }

  if (text.includes("bone") || text.includes("fracture") || text.includes("joint") || text.includes("leg")) {
    return {
      level: "Medium Priority",
      doctor: "Orthopedic",
      advice: "Bone or joint-related symptoms may need orthopedic care.",
    };
  }

  if (text.includes("fever") || text.includes("cold") || text.includes("cough")) {
    return {
      level: "Normal Priority",
      doctor: "General Doctor",
      advice: "Fever, cold, or cough may need general consultation and monitoring.",
    };
  }

  return {
    level: "General Checkup",
    doctor: "Available Doctor",
    advice: "Please consult an available doctor for proper medical guidance.",
  };
}

function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border p-4 shadow-xl ${
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
            <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  // Force login screen first. After Google login succeeds, dashboard opens.
  const [user, setUser] = useState(null);

  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem("appointments");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [formData, setFormData] = useState(emptyForm);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [doctorSearch, setDoctorSearch] = useState("");
  const [specialization, setSpecialization] = useState("All");

  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("All");

  const [toasts, setToasts] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");

  useEffect(() => {
    localStorage.setItem("appointments", JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const cardClass = darkMode
    ? "bg-slate-900 border-slate-800 text-white"
    : "bg-white border-slate-200 text-slate-950";

  const inputClass = darkMode
    ? "bg-slate-950 border-slate-700 text-white placeholder-slate-500"
    : "bg-white border-slate-300 text-slate-950 placeholder-slate-500";

  const subTextClass = darkMode ? "text-slate-400" : "text-slate-600";

  const addToast = (title, message = "", type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedDoctor(null);
    setEditingId(null);
  };

  const validateForm = () => {
    if (!selectedDoctor) return "Please select a doctor.";
    if (selectedDoctor.status === "Unavailable") return `${selectedDoctor.name} is unavailable.`;
    if (!formData.patient.trim()) return "Please enter patient name.";
    if (!formData.age || Number(formData.age) < 1 || Number(formData.age) > 120) return "Age must be between 1 and 120.";
    if (!formData.phone.trim()) return "Please enter phone number.";
    if (!formData.symptoms.trim()) return "Please enter symptoms.";
    if (!formData.date) return "Please select date.";
    if (!formData.time) return "Please select time.";

    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    if (selectedDateTime < new Date()) return "Appointment must be in the future.";

    return null;
  };

  const handleBooking = () => {
    const error = validateForm();
    if (error) {
      addToast("Check details", error, "error");
      return;
    }

    const duplicate = appointments.some(
      (item) =>
        item.id !== editingId &&
        item.patient.toLowerCase() === formData.patient.trim().toLowerCase() &&
        item.doctor.toLowerCase() === selectedDoctor.name.toLowerCase() &&
        item.date === formData.date
    );

    if (duplicate) {
      addToast("Duplicate booking", "This patient already has an appointment with this doctor on the same date.", "error");
      return;
    }

    if (editingId) {
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                patient: formData.patient.trim(),
                age: Number(formData.age),
                phone: formData.phone.trim(),
                symptoms: formData.symptoms.trim(),
                date: formData.date,
                time: formData.time,
                doctor: selectedDoctor.name,
                spec: selectedDoctor.spec,
              }
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
    setFormData({
      patient: appointment.patient,
      age: appointment.age,
      phone: appointment.phone || "",
      symptoms: appointment.symptoms,
      date: appointment.date,
      time: appointment.time,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    addToast("Edit mode active", appointment.token, "info");
  };

  const deleteAppointment = (id) => {
    setAppointments((prev) => prev.filter((item) => item.id !== id));
    addToast("Deleted", "Appointment removed.", "info");
  };

  const updateStatus = (id, status) => {
    setAppointments((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    addToast("Status updated", `Marked as ${status}.`, "success");
  };

  const clearAll = () => {
    const confirmClear = window.confirm("Clear all appointments?");
    if (!confirmClear) return;

    setAppointments([]);
    addToast("Cleared", "All appointments removed.", "info");
  };

  const specializations = useMemo(() => ["All", ...new Set(DOCTORS.map((doc) => doc.spec))], []);

  const filteredDoctors = DOCTORS.filter((doctor) => {
    const searchText = doctorSearch.toLowerCase();
    const matchesSearch = doctor.name.toLowerCase().includes(searchText) || doctor.spec.toLowerCase().includes(searchText);
    const matchesSpec = specialization === "All" || doctor.spec === specialization;
    return matchesSearch && matchesSpec;
  });

  const pendingCount = appointments.filter((item) => item.status === "Pending").length;
  const confirmedCount = appointments.filter((item) => item.status === "Confirmed").length;
  const completedCount = appointments.filter((item) => item.status === "Completed").length;

  const filteredHistory = appointments.filter((item) => {
    const searchText = historySearch.toLowerCase();
    const matchesSearch =
      item.patient.toLowerCase().includes(searchText) ||
      item.token.toLowerCase().includes(searchText) ||
      item.doctor.toLowerCase().includes(searchText) ||
      item.symptoms.toLowerCase().includes(searchText);

    const matchesStatus = historyStatus === "All" || item.status === historyStatus;

    return matchesSearch && matchesStatus;
  });

  const symptomSuggestion = getSymptomSuggestion(formData.symptoms);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className={`min-h-screen px-4 py-6 sm:px-8 transition-all ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"}`}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={() => setUser(null)}
            className="px-5 py-2 rounded-xl font-semibold shadow bg-red-600 text-white"
          >
            Logout
          </button>

          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className={`px-5 py-2 rounded-xl font-semibold shadow ${darkMode ? "bg-white text-slate-900" : "bg-slate-900 text-white"}`}
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>

        <section className="bg-gradient-to-r from-cyan-500 to-blue-700 p-6 sm:p-8 rounded-3xl shadow-2xl mb-8 text-white">
          <h1 className="text-3xl sm:text-5xl font-bold">🏥 Smart Healthcare Dashboard</h1>
          <p className="mt-2 text-blue-100">AI powered hospital appointment, queue, and patient history system</p>
        </section>

        <section className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <h2 className="text-2xl font-bold mb-5">🚑 Emergency & Bed Availability</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-emerald-950 text-emerald-300 p-4 rounded-2xl">
              <p className="text-sm">General Beds</p>
              <h3 className="text-3xl font-bold">42 / 120</h3>
              <p className="text-xs mt-1">Available now</p>
            </div>

            <div className="bg-cyan-950 text-cyan-300 p-4 rounded-2xl">
              <p className="text-sm">ICU Beds</p>
              <h3 className="text-3xl font-bold">8 / 20</h3>
              <p className="text-xs mt-1">Critical care ready</p>
            </div>

            <div className="bg-red-950 text-red-300 p-4 rounded-2xl">
              <p className="text-sm">Emergency</p>
              <h3 className="text-3xl font-bold">24/7</h3>
              <p className="text-xs mt-1">Call: 108</p>
            </div>

            <div className="bg-purple-950 text-purple-300 p-4 rounded-2xl">
              <p className="text-sm">Oxygen Support</p>
              <h3 className="text-xl font-bold">Available</h3>
              <p className="text-xs mt-1">Ambulance ready</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className={`${cardClass} border rounded-2xl p-5`}>
            <p className={subTextClass}>Total Appointments</p>
            <h2 className="text-3xl font-bold">{appointments.length}</h2>
          </div>

          <div className={`${cardClass} border rounded-2xl p-5`}>
            <p className={subTextClass}>Pending</p>
            <h2 className="text-3xl font-bold">{pendingCount}</h2>
          </div>

          <div className={`${cardClass} border rounded-2xl p-5`}>
            <p className={subTextClass}>Confirmed</p>
            <h2 className="text-3xl font-bold">{confirmedCount}</h2>
          </div>

          <div className={`${cardClass} border rounded-2xl p-5`}>
            <p className={subTextClass}>Completed</p>
            <h2 className="text-3xl font-bold">{completedCount}</h2>
          </div>
        </section>

        <section className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <h2 className="text-2xl font-bold mb-5">👨‍⚕️ Select Doctor</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              value={doctorSearch}
              onChange={(event) => setDoctorSearch(event.target.value)}
              placeholder="🔍 Search doctor or specialization..."
              className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`}
            />

            <select
              value={specialization}
              onChange={(event) => setSpecialization(event.target.value)}
              className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`}
            >
              {specializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredDoctors.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => setSelectedDoctor(doctor)}
                className={`text-left border rounded-2xl p-5 transition-all ${
                  selectedDoctor?.id === doctor.id
                    ? "border-cyan-400 bg-cyan-950 text-white"
                    : `${cardClass} hover:border-cyan-400`
                }`}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg">{doctor.name}</h3>
                    <p className="text-sm text-cyan-400">{doctor.spec}</p>
                  </div>
                  <span>{doctor.status === "Available" ? "✅" : "🚫"}</span>
                </div>

                <p className={`text-sm mt-3 ${selectedDoctor?.id === doctor.id ? "text-cyan-100" : subTextClass}`}>Experience: {doctor.exp}</p>

                <span
                  className={`inline-block mt-3 px-3 py-1 text-xs rounded-full ${
                    doctor.status === "Available" ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"
                  }`}
                >
                  {doctor.status}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <h2 className="text-2xl font-bold">📝 Book Appointment</h2>
            {editingId && <span className="px-4 py-2 rounded-xl bg-purple-950 text-purple-300 text-sm font-bold">Edit Mode Active</span>}
          </div>

          {selectedDoctor ? (
            <p className="mb-4 text-cyan-400 font-semibold">Selected: {selectedDoctor.name} - {selectedDoctor.spec}</p>
          ) : (
            <p className={`mb-4 ${subTextClass}`}>Select a doctor above before booking.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={formData.patient} onChange={(event) => updateForm("patient", event.target.value)} placeholder="Patient name" className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`} />
            <input type="number" value={formData.age} onChange={(event) => updateForm("age", event.target.value)} placeholder="Age" className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`} />
            <input value={formData.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="Phone number" className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`} />
            <input type="date" value={formData.date} onChange={(event) => updateForm("date", event.target.value)} className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`} />
            <input type="time" value={formData.time} onChange={(event) => updateForm("time", event.target.value)} className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`} />
            <input value={formData.symptoms} onChange={(event) => updateForm("symptoms", event.target.value)} placeholder="Symptoms" className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`} />
          </div>

          {symptomSuggestion && (
            <div className="mt-5 rounded-2xl border border-cyan-700 bg-cyan-950 p-4 text-cyan-100">
              <h3 className="font-bold">🤖 AI Symptom Suggestion</h3>
              <p className="text-sm mt-1">Priority: {symptomSuggestion.level}</p>
              <p className="text-sm">Recommended: {symptomSuggestion.doctor}</p>
              <p className="text-xs mt-2 text-cyan-200">{symptomSuggestion.advice}</p>
              <p className="text-xs mt-2 text-red-300">Demo only, not a medical diagnosis.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            <button onClick={handleBooking} className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              {editingId ? "Update Appointment" : "Book Appointment"}
            </button>

            <button onClick={resetForm} className="px-6 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold">
              Cancel
            </button>
          </div>
        </section>

        <section className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h2 className="text-2xl font-bold">📋 Appointment Queue</h2>

            {appointments.length > 0 && (
              <button onClick={clearAll} className="px-4 py-2 rounded-xl bg-red-950 text-red-300 text-sm font-bold">
                🗑️ Clear All
              </button>
            )}
          </div>

          {appointments.length === 0 ? (
            <div className={`text-center p-8 rounded-2xl border ${subTextClass}`}>No appointments booked yet.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {appointments.map((appointment) => (
                <div key={appointment.id} className={`${cardClass} border rounded-2xl p-5 shadow`}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-cyan-400 font-bold">{appointment.token}</p>
                      <h3 className="text-xl font-bold">{appointment.patient}</h3>
                      <p className={`text-sm ${subTextClass}`}>Age: {appointment.age} • Phone: {appointment.phone || "N/A"}</p>
                    </div>

                    <span
                      className={`h-fit px-3 py-1 rounded-full text-xs font-bold ${
                        appointment.status === "Pending"
                          ? "bg-yellow-950 text-yellow-300"
                          : appointment.status === "Confirmed"
                          ? "bg-cyan-950 text-cyan-300"
                          : "bg-emerald-950 text-emerald-300"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1 text-sm">
                    <p>👨‍⚕️ {appointment.doctor}</p>
                    <p>🏥 {appointment.spec}</p>
                    <p>📅 {appointment.date} at {appointment.time}</p>
                    <p>📝 {appointment.symptoms}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-5">
                    <button onClick={() => updateStatus(appointment.id, "Pending")} className="px-3 py-2 rounded-xl bg-yellow-950 text-yellow-300 text-sm">Pending</button>
                    <button onClick={() => updateStatus(appointment.id, "Confirmed")} className="px-3 py-2 rounded-xl bg-cyan-950 text-cyan-300 text-sm">Confirm</button>
                    <button onClick={() => updateStatus(appointment.id, "Completed")} className="px-3 py-2 rounded-xl bg-emerald-950 text-emerald-300 text-sm">Complete</button>
                    <button onClick={() => startEdit(appointment)} className="px-3 py-2 rounded-xl bg-purple-950 text-purple-300 text-sm">Edit</button>
                    <button onClick={() => deleteAppointment(appointment.id)} className="px-3 py-2 rounded-xl bg-red-950 text-red-300 text-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${cardClass} border rounded-2xl p-6 shadow-xl`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold">📚 Patient History</h2>
              <p className={`${subTextClass} text-sm mt-1`}>Search records by patient, token, doctor, or symptoms.</p>
            </div>

            <span className="text-sm font-semibold text-cyan-400 bg-cyan-950 px-4 py-2 rounded-full w-fit">
              Records: {filteredHistory.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="🔍 Search patient history..."
              className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`}
            />

            <select
              value={historyStatus}
              onChange={(event) => setHistoryStatus(event.target.value)}
              className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {filteredHistory.length === 0 ? (
            <div className={`text-center p-8 rounded-2xl border ${subTextClass}`}>No patient history found.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-700">
              <table className="w-full text-sm min-w-[900px]">
                <thead className={darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-800"}>
                  <tr>
                    <th className="text-left p-4">Token</th>
                    <th className="text-left p-4">Patient</th>
                    <th className="text-left p-4">Age</th>
                    <th className="text-left p-4">Phone</th>
                    <th className="text-left p-4">Doctor</th>
                    <th className="text-left p-4">Symptoms</th>
                    <th className="text-left p-4">Date & Time</th>
                    <th className="text-left p-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredHistory.map((appointment) => (
                    <tr key={appointment.id} className="border-t border-slate-700">
                      <td className="p-4 font-semibold text-cyan-400">{appointment.token}</td>
                      <td className="p-4">{appointment.patient}</td>
                      <td className="p-4">{appointment.age}</td>
                      <td className="p-4">{appointment.phone || "N/A"}</td>
                      <td className="p-4">{appointment.doctor}</td>
                      <td className="p-4 max-w-xs truncate">{appointment.symptoms}</td>
                      <td className="p-4">{appointment.date} at {appointment.time}</td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            appointment.status === "Pending"
                              ? "bg-yellow-950 text-yellow-300"
                              : appointment.status === "Confirmed"
                              ? "bg-cyan-950 text-cyan-300"
                              : "bg-emerald-950 text-emerald-300"
                          }`}
                        >
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
