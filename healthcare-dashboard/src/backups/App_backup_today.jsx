import React, { useEffect, useState, useCallback } from "react";
import DoctorCard from "../components/DoctorCard";
import BookingForm from "../components/BookingForm";

const DOCTORS = [
  { id: 1, name: "Dr. Arjun Raza", spec: "Cardiologist", exp: "18 Years", status: "Available" },
  { id: 2, name: "Dr. Sunita Sharma", spec: "Neurologist", exp: "14 Years", status: "Available" },
  { id: 3, name: "Dr. Vikram Patel", spec: "Orthopedic", exp: "11 Years", status: "Unavailable" },
];

function generateToken(count) {
  return `TOKEN-${String(count + 1).padStart(3, "0")}`;
}

function getSymptomSuggestion(symptoms) {
  const text = symptoms.toLowerCase();

  if (!text.trim()) return null;

  if (text.includes("chest") || text.includes("heart")) {
    return {
      level: "High Priority",
      advice: "Chest-related symptoms may need quick attention. Recommended doctor: Cardiologist.",
    };
  }

  if (text.includes("headache") || text.includes("migraine") || text.includes("brain")) {
    return {
      level: "Medium Priority",
      advice: "Headache-related symptoms may need neurological checkup. Recommended doctor: Neurologist.",
    };
  }

  if (text.includes("bone") || text.includes("fracture") || text.includes("leg") || text.includes("joint")) {
    return {
      level: "Medium Priority",
      advice: "Bone or joint-related symptoms may need orthopedic care. Recommended doctor: Orthopedic.",
    };
  }

  if (text.includes("fever") || text.includes("cold") || text.includes("cough")) {
    return {
      level: "Normal Priority",
      advice: "These symptoms may need general consultation and monitoring.",
    };
  }

  return {
    level: "General Checkup",
    advice: "Please consult an available doctor for proper medical guidance.",
  };
}

function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm px-4">
      {toasts.map((t) => (
        <div key={t.id} className="p-4 rounded-2xl shadow-2xl border bg-slate-900 border-slate-700 text-white">
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-semibold">{t.title}</p>
              <p className="text-sm text-slate-300">{t.message}</p>
            </div>
            <button onClick={() => removeToast(t.id)}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem("appointments");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [formData, setFormData] = useState({
    patient: "",
    age: "",
    symptoms: "",
    date: "",
    time: "",
  });

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("All");
  const [toasts, setToasts] = useState([]);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") !== "light";
  });

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
    ? "bg-slate-900 border-slate-700 text-white"
    : "bg-white border-slate-300 text-slate-950";

  const subTextClass = darkMode ? "text-slate-400" : "text-slate-600";

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (title, message = "") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, title, message }]);
      setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  const resetForm = () => {
    setFormData({ patient: "", age: "", symptoms: "", date: "", time: "" });
    setSelectedDoctor(null);
    setEditingId(null);
  };

  const validateForm = (doctor) => {
    const { patient, age, symptoms, date, time } = formData;

    if (!patient.trim()) return "Missing patient name";
    if (!age || Number(age) < 1 || Number(age) > 120) return "Invalid age";
    if (!symptoms.trim()) return "Missing symptoms";
    if (!date || !time) return "Select date and time";
    if (doctor.status === "Unavailable") return `${doctor.name} is not available`;

    const appointmentDate = new Date(`${date}T${time}`);
    if (appointmentDate < new Date()) return "Please select a future date/time";

    return null;
  };

  const handleBooking = useCallback(
    (doctor) => {
      const error = validateForm(doctor);
      if (error) return addToast("Check details", error);

      if (editingId) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === editingId
              ? {
                  ...a,
                  doctor: doctor.name,
                  spec: doctor.spec,
                  patient: formData.patient.trim(),
                  age: Number(formData.age),
                  symptoms: formData.symptoms.trim(),
                  date: formData.date,
                  time: formData.time,
                }
              : a
          )
        );

        addToast("Appointment updated ✅", "Changes saved successfully");
        resetForm();
        return;
      }

      const newAppointment = {
        id: Date.now(),
        token: generateToken(appointments.length),
        doctor: doctor.name,
        spec: doctor.spec,
        patient: formData.patient.trim(),
        age: Number(formData.age),
        symptoms: formData.symptoms.trim(),
        date: formData.date,
        time: formData.time,
        status: "Pending",
        bookedAt: new Date().toISOString(),
      };

      setAppointments((prev) => [newAppointment, ...prev]);
      addToast("Appointment booked 🎉", `${newAppointment.token} created successfully`);
      resetForm();
    },
    [formData, appointments.length, editingId, addToast]
  );

  const startEdit = (appointment) => {
    const doctor = DOCTORS.find((d) => d.name === appointment.doctor);
    setEditingId(appointment.id);
    setSelectedDoctor(doctor || DOCTORS[0]);

    setFormData({
      patient: appointment.patient,
      age: appointment.age,
      symptoms: appointment.symptoms,
      date: appointment.date,
      time: appointment.time,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    addToast("Editing appointment", `${appointment.token} is ready to edit`);
  };

  const deleteAppointment = (id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    addToast("Appointment deleted");
  };

  const updateStatus = (id, status) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    addToast("Status updated", `Appointment marked as ${status}`);
  };

  const specializations = ["All", ...new Set(DOCTORS.map((d) => d.spec))];

  const filteredDoctors = DOCTORS.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.spec.toLowerCase().includes(search.toLowerCase());

    const matchesSpec = specialization === "All" || doc.spec === specialization;
    return matchesSearch && matchesSpec;
  });

  const pendingCount = appointments.filter((a) => a.status === "Pending").length;
  const confirmedCount = appointments.filter((a) => a.status === "Confirmed").length;
  const completedCount = appointments.filter((a) => a.status === "Completed").length;

  const doctorWorkload = DOCTORS.map((doctor) => ({
    name: doctor.name,
    count: appointments.filter((a) => a.doctor === doctor.name).length,
  }));

  const symptomSuggestion = getSymptomSuggestion(formData.symptoms);

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div
        className={`min-h-screen px-4 py-6 sm:px-6 lg:px-10 transition-all duration-300 ${
          darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"
        }`}
      >
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-5 py-2 rounded-xl font-semibold shadow ${
              darkMode ? "bg-white text-slate-900" : "bg-slate-900 text-white"
            }`}
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>

        <div className="bg-gradient-to-r from-cyan-500 to-blue-700 p-6 rounded-3xl shadow-2xl mb-8 text-white">
          <h1 className="text-2xl sm:text-4xl font-bold">🏥 Smart Healthcare Dashboard</h1>
          <p className="mt-2 text-sm sm:text-lg text-blue-100">
            Smart Appointment Management System
          </p>
        </div>

        <div className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <h2 className="text-2xl font-bold mb-5">🚑 Emergency & Bed Availability</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-red-950 text-red-300 p-4 rounded-2xl">
              <p className="text-sm">Emergency</p>
              <h3 className="text-xl font-bold">24/7 Active</h3>
              <p className="text-xs mt-1">Call: 108</p>
            </div>

            <div className="bg-emerald-950 text-emerald-300 p-4 rounded-2xl">
              <p className="text-sm">General Beds</p>
              <h3 className="text-3xl font-bold">42</h3>
              <p className="text-xs mt-1">Available now</p>
            </div>

            <div className="bg-cyan-950 text-cyan-300 p-4 rounded-2xl">
              <p className="text-sm">ICU Beds</p>
              <h3 className="text-3xl font-bold">8</h3>
              <p className="text-xs mt-1">Critical care ready</p>
            </div>

            <div className="bg-purple-950 text-purple-300 p-4 rounded-2xl">
              <p className="text-sm">Oxygen Support</p>
              <h3 className="text-xl font-bold">Available</h3>
              <p className="text-xs mt-1">Ambulance: Ready</p>
            </div>
          </div>
        </div>

        {editingId && (
          <div className="mb-6 bg-purple-950 border border-purple-700 text-purple-200 p-4 rounded-2xl">
            ✏️ Edit mode is active. Update the details and click book/update.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className={`${cardClass} p-5 rounded-2xl border`}>
            <p className={subTextClass}>Total Appointments</p>
            <h2 className="text-3xl font-bold">{appointments.length}</h2>
          </div>

          <div className={`${cardClass} p-5 rounded-2xl border`}>
            <p className={subTextClass}>Available Doctors</p>
            <h2 className="text-3xl font-bold">
              {DOCTORS.filter((d) => d.status === "Available").length}
            </h2>
          </div>

          <div className={`${cardClass} p-5 rounded-2xl border`}>
            <p className={subTextClass}>Pending Cases</p>
            <h2 className="text-3xl font-bold">{pendingCount}</h2>
          </div>
        </div>

        <div className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
          <h2 className="text-2xl font-bold mb-5">📊 Analytics Dashboard</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-950 text-yellow-300 p-4 rounded-2xl">
              <p className="text-sm">Pending</p>
              <h3 className="text-3xl font-bold">{pendingCount}</h3>
            </div>

            <div className="bg-cyan-950 text-cyan-300 p-4 rounded-2xl">
              <p className="text-sm">Confirmed</p>
              <h3 className="text-3xl font-bold">{confirmedCount}</h3>
            </div>

            <div className="bg-emerald-950 text-emerald-300 p-4 rounded-2xl">
              <p className="text-sm">Completed</p>
              <h3 className="text-3xl font-bold">{completedCount}</h3>
            </div>
          </div>

          <h3 className="font-bold mb-3">Doctor Workload</h3>

          <div className="space-y-3">
            {doctorWorkload.map((doctor) => (
              <div key={doctor.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{doctor.name}</span>
                  <span>{doctor.count} appointments</span>
                </div>

                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-cyan-500 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${appointments.length ? (doctor.count / appointments.length) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <input
            type="text"
            placeholder="🔍 Search doctors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`}
          />

          <select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className={`w-full border p-4 rounded-2xl outline-none focus:border-cyan-500 ${inputClass}`}
          >
            {specializations.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold mb-6">👨‍⚕️ Our Doctors</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {filteredDoctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              doc={doc}
              setSelectedDoctor={setSelectedDoctor}
              isSelected={selectedDoctor?.id === doc.id}
            />
          ))}
        </div>

        {symptomSuggestion && selectedDoctor && (
          <div className={`${cardClass} border rounded-2xl p-5 mb-6 shadow-xl`}>
            <h2 className="text-xl font-bold mb-2">🤖 AI Symptom Suggestion</h2>

            <p className="text-sm mb-2">
              Priority:{" "}
              <span className="font-bold text-cyan-400">
                {symptomSuggestion.level}
              </span>
            </p>

            <p className={subTextClass}>{symptomSuggestion.advice}</p>

            <p className="text-xs mt-3 text-red-400">
              Note: This is only a demo suggestion, not a medical diagnosis.
            </p>
          </div>
        )}

        {selectedDoctor && (
          <BookingForm
            formData={formData}
            setFormData={setFormData}
            handleBooking={handleBooking}
            selectedDoctor={selectedDoctor}
            onCancel={resetForm}
          />
        )}

        <h2 className="text-2xl sm:text-3xl font-bold mb-6">📋 Appointment Queue</h2>

        {appointments.length === 0 ? (
          <div className={`${cardClass} border rounded-2xl p-8 text-center ${subTextClass}`}>
            No appointments booked yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {appointments.map((a) => (
              <div key={a.id} className={`${cardClass} border rounded-2xl p-5 shadow-xl`}>
                <div className="flex justify-between gap-4 mb-3">
                  <div>
                    <p className="text-cyan-400 font-bold">{a.token}</p>
                    <h3 className="text-xl font-bold">{a.patient}</h3>
                    <p className={`${subTextClass} text-sm`}>
                      Age: {a.age} • {a.symptoms}
                    </p>
                  </div>

                  <span
                    className={`h-fit px-3 py-1 rounded-full text-xs font-bold ${
                      a.status === "Pending"
                        ? "bg-yellow-950 text-yellow-300"
                        : a.status === "Confirmed"
                        ? "bg-cyan-950 text-cyan-300"
                        : "bg-emerald-950 text-emerald-300"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <p className="text-sm">👨‍⚕️ {a.doctor}</p>
                <p className="text-sm">🏥 {a.spec}</p>
                <p className="text-sm">📅 {a.date} at {a.time}</p>

                <div className="flex flex-wrap gap-2 mt-5">
                  <button onClick={() => updateStatus(a.id, "Pending")} className="px-3 py-2 rounded-xl bg-yellow-950 text-yellow-300 text-sm">Pending</button>
                  <button onClick={() => updateStatus(a.id, "Confirmed")} className="px-3 py-2 rounded-xl bg-cyan-950 text-cyan-300 text-sm">Confirm</button>
                  <button onClick={() => updateStatus(a.id, "Completed")} className="px-3 py-2 rounded-xl bg-emerald-950 text-emerald-300 text-sm">Complete</button>
                  <button onClick={() => startEdit(a)} className="px-3 py-2 rounded-xl bg-purple-950 text-purple-300 text-sm">Edit</button>
                  <button onClick={() => deleteAppointment(a.id)} className="px-3 py-2 rounded-xl bg-red-950 text-red-300 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}