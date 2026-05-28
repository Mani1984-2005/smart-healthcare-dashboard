import React, { useEffect, useState, useCallback } from "react";
import DoctorCard from "./components/DoctorCard";
import BookingForm from "./components/BookingForm";

const DOCTORS = [
  { id: 1, name: "Dr. Arjun Raza", spec: "Cardiologist", exp: "18 Years", status: "Available" },
  { id: 2, name: "Dr. Sunita Sharma", spec: "Neurologist", exp: "14 Years", status: "Available" },
  { id: 3, name: "Dr. Vikram Patel", spec: "Orthopedic", exp: "11 Years", status: "Unavailable" },
];

function generateToken(count) {
  return `TOKEN-${String(count + 1).padStart(3, "0")}`;
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
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("All");
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    localStorage.setItem("appointments", JSON.stringify(appointments));
  }, [appointments]);

  const addToast = useCallback((title, message = "") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message }]);
    setTimeout(() => removeToast(id), 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleBooking = useCallback(
    (doctor) => {
      const { patient, age, symptoms, date, time } = formData;

      if (!patient.trim()) return addToast("Missing patient name");
      if (!age || Number(age) < 1 || Number(age) > 120) return addToast("Invalid age", "Age must be between 1 and 120");
      if (!symptoms.trim()) return addToast("Missing symptoms");
      if (!date || !time) return addToast("Select date and time");
      if (doctor.status === "Unavailable") return addToast("Doctor unavailable", `${doctor.name} is not available`);

      const appointmentDate = new Date(`${date}T${time}`);
      if (appointmentDate < new Date()) return addToast("Invalid time", "Please select a future date/time");

      const newAppointment = {
        id: Date.now(),
        token: generateToken(appointments.length),
        doctor: doctor.name,
        spec: doctor.spec,
        patient: patient.trim(),
        age: Number(age),
        symptoms: symptoms.trim(),
        date,
        time,
        status: "Pending",
        bookedAt: new Date().toISOString(),
      };

      setAppointments((prev) => [newAppointment, ...prev]);
      addToast("Appointment booked 🎉", `${newAppointment.token} created successfully`);

      setFormData({ patient: "", age: "", symptoms: "", date: "", time: "" });
      setSelectedDoctor(null);
    },
    [formData, appointments.length, addToast]
  );

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

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="min-h-screen bg-slate-950 text-white px-4 py-6 sm:px-6 lg:px-10">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-700 p-6 rounded-3xl shadow-2xl mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold">🏥 Smart Healthcare Dashboard</h1>
          <p className="mt-2 text-sm sm:text-lg text-blue-100">
            Smart Appointment Management System
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p className="text-slate-400">Total Appointments</p>
            <h2 className="text-3xl font-bold">{appointments.length}</h2>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p className="text-slate-400">Available Doctors</p>
            <h2 className="text-3xl font-bold">
              {DOCTORS.filter((d) => d.status === "Available").length}
            </h2>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p className="text-slate-400">Pending Cases</p>
            <h2 className="text-3xl font-bold">
              {appointments.filter((a) => a.status === "Pending").length}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <input
            type="text"
            placeholder="🔍 Search doctors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl outline-none text-white focus:border-cyan-500"
          />

          <select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl outline-none text-white focus:border-cyan-500"
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

        {selectedDoctor && (
          <BookingForm
            formData={formData}
            setFormData={setFormData}
            handleBooking={handleBooking}
            selectedDoctor={selectedDoctor}
            onCancel={() => setSelectedDoctor(null)}
          />
        )}

        <h2 className="text-2xl sm:text-3xl font-bold mb-6">📋 Appointment Queue</h2>

        {appointments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            No appointments booked yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {appointments.map((a) => (
              <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex justify-between gap-4 mb-3">
                  <div>
                    <p className="text-cyan-400 font-bold">{a.token}</p>
                    <h3 className="text-xl font-bold">{a.patient}</h3>
                    <p className="text-slate-400 text-sm">
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

                <p className="text-sm text-slate-300">👨‍⚕️ {a.doctor}</p>
                <p className="text-sm text-slate-300">🏥 {a.spec}</p>
                <p className="text-sm text-slate-300">📅 {a.date} at {a.time}</p>

                <div className="flex flex-wrap gap-2 mt-5">
                  <button
                    onClick={() => updateStatus(a.id, "Pending")}
                    className="px-3 py-2 rounded-xl bg-yellow-950 text-yellow-300 text-sm"
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => updateStatus(a.id, "Confirmed")}
                    className="px-3 py-2 rounded-xl bg-cyan-950 text-cyan-300 text-sm"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => updateStatus(a.id, "Completed")}
                    className="px-3 py-2 rounded-xl bg-emerald-950 text-emerald-300 text-sm"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => deleteAppointment(a.id)}
                    className="px-3 py-2 rounded-xl bg-red-950 text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}