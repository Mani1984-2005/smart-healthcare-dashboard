import React, { useEffect, useState, useCallback } from "react";
import DoctorCard from "./components/DoctorCard";
import BookingForm from "./components/BookingForm";
import AppointmentQueue from "./components/AppointmentQueue";

// ── Doctor data ─────────────────────────────────────────
const DOCTORS = [
  {
    id: 1,
    name: "Dr. Arjun Raza",
    spec: "Cardiologist",
    exp: "18 Years",
    status: "Available",
  },
  {
    id: 2,
    name: "Dr. Sunita Sharma",
    spec: "Neurologist",
    exp: "14 Years",
    status: "Available",
  },
  {
    id: 3,
    name: "Dr. Vikram Patel",
    spec: "Orthopedic",
    exp: "11 Years",
    status: "Unavailable",
  },
];

// ── Token generator ────────────────────────────────────
function generateToken() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);

  return `APT-${date}-${rand}`;
}

// ── Date formatter ─────────────────────────────────────
function formatDateTime(isoString) {
  const d = new Date(isoString);

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Toast Component ────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-[slideIn_0.3s_ease_both]
          ${
            t.type === "success"
              ? "bg-emerald-950 border-emerald-700 text-emerald-200"
              : t.type === "error"
              ? "bg-red-950 border-red-700 text-red-200"
              : "bg-slate-800 border-slate-700 text-white"
          }`}
        >
          <span className="text-xl">
            {t.type === "success"
              ? "✅"
              : t.type === "error"
              ? "🚫"
              : "ℹ️"}
          </span>

          <div className="flex-1">
            <p className="font-semibold">{t.title}</p>
            <p className="text-sm opacity-80">{t.message}</p>
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="opacity-50 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────
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
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ── Save appointments ───────────────────────────────
  useEffect(() => {
    localStorage.setItem("appointments", JSON.stringify(appointments));
  }, [appointments]);

  // ── Toast helpers ───────────────────────────────────
  const addToast = useCallback(
    (title, message = "", type = "info", duration = 4500) => {
      const id = Date.now() + Math.random();

      setToasts((prev) => [
        ...prev,
        { id, title, message, type },
      ]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    []
  );

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Booking handler ─────────────────────────────────
  const handleBooking = useCallback(
    (doctor) => {
      const { patient, age, symptoms, date, time } = formData;

      if (!patient.trim()) {
        addToast("Missing patient name", "", "error");
        return;
      }

      if (!age || isNaN(age) || Number(age) < 1 || Number(age) > 120) {
        addToast(
          "Invalid age",
          "Age must be between 1 and 120",
          "error"
        );
        return;
      }

      if (!symptoms.trim()) {
        addToast("Missing symptoms", "", "error");
        return;
      }

      if (!date) {
        addToast("Select appointment date", "", "error");
        return;
      }

      if (!time) {
        addToast("Select appointment time", "", "error");
        return;
      }

      const chosenDateTime = new Date(`${date}T${time}`);

      if (chosenDateTime < new Date()) {
        addToast(
          "Invalid appointment",
          "Please select a future date/time",
          "error"
        );
        return;
      }

      // Duplicate prevention
      const duplicate = appointments.some(
        (a) =>
          a.patient.toLowerCase() === patient.trim().toLowerCase() &&
          a.doctor.toLowerCase() === doctor.name.toLowerCase() &&
          a.date === date
      );

      if (duplicate) {
        addToast(
          "Duplicate appointment",
          "This patient already booked with this doctor on this date",
          "error"
        );
        return;
      }

      if (doctor.status === "Unavailable") {
        addToast(
          "Doctor unavailable",
          `${doctor.name} is unavailable`,
          "error"
        );
        return;
      }

      const token = generateToken();
      const bookedAt = new Date().toISOString();

      const newAppointment = {
        id: bookedAt + Math.random(),
        token,
        doctor: doctor.name,
        spec: doctor.spec,
        patient: patient.trim(),
        age: Number(age),
        symptoms: symptoms.trim(),
        date,
        time,
        bookedAt,
      };

      setAppointments((prev) => [newAppointment, ...prev]);

      addToast(
        "Appointment Confirmed 🎉",
        `${doctor.name} booked successfully`,
        "success",
        6000
      );

      setFormData({
        patient: "",
        age: "",
        symptoms: "",
        date: "",
        time: "",
      });

      setSelectedDoctor(null);
    },
    [formData, appointments, addToast]
  );

  // ── Clear appointments ──────────────────────────────
  const handleClearAll = () => {
    setAppointments([]);
    setShowClearConfirm(false);

    addToast(
      "Appointments cleared",
      "All appointments removed",
      "info"
    );
  };

  // ── Search doctors ──────────────────────────────────
  const filteredDoctors = DOCTORS.filter(
    (doc) =>
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.spec.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="min-h-screen bg-slate-950 text-white px-4 py-6 sm:px-6 lg:px-10">

        {/* Hero */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-700 p-6 rounded-3xl shadow-2xl mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold">
            🏥 Smart Healthcare Dashboard
          </h1>

          <p className="mt-2 text-sm sm:text-lg text-blue-100">
            AI Powered Hospital Management System
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="🔍 Search doctors or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl outline-none text-white focus:border-cyan-500"
          />
        </div>

        {/* Doctors */}
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">
          👨‍⚕️ Our Doctors
        </h2>

        {filteredDoctors.length > 0 ? (
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
        ) : (
          <div className="text-center py-10 text-slate-500">
            No doctors found.
          </div>
        )}

        {/* Booking Form */}
        {selectedDoctor && (
          <BookingForm
            formData={formData}
            setFormData={setFormData}
            handleBooking={handleBooking}
            selectedDoctor={selectedDoctor}
            onCancel={() => setSelectedDoctor(null)}
          />
        )}

        {/* Appointment Header */}
        {appointments.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">

            <h2 className="text-2xl sm:text-3xl font-bold">
              📋 Appointments
              <span className="ml-3 bg-cyan-950 text-cyan-400 px-3 py-1 rounded-full text-sm">
                {appointments.length}
              </span>
            </h2>

            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="bg-red-950 border border-red-700 text-red-400 px-4 py-2 rounded-xl hover:bg-red-900"
              >
                🗑️ Clear All
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">
                  Are you sure?
                </span>

                <button
                  onClick={handleClearAll}
                  className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded-lg text-sm"
                >
                  Yes
                </button>

                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Queue */}
        <AppointmentQueue
          appointments={appointments}
          formatDateTime={formatDateTime}
        />
      </div>
    </>
  );
}