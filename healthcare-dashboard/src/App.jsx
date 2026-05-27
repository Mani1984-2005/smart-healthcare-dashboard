import React, { useEffect, useState } from "react";
import DoctorCard from "./components/DoctorCard";
import BookingForm from "./components/BookingForm";
import AppointmentQueue from "./components/AppointmentQueue";

const doctors = [
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

export default function App() {
  const [appointments, setAppointments] = useState(() => {
    const savedAppointments = localStorage.getItem("appointments");
    return savedAppointments ? JSON.parse(savedAppointments) : [];
  });

  const [formData, setFormData] = useState({
    patient: "",
    age: "",
    symptoms: "",
  });

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem("appointments", JSON.stringify(appointments));
  }, [appointments]);

  const handleBooking = (doctor) => {
    if (!formData.patient || !formData.age || !formData.symptoms) {
      alert("Please fill all fields");
      return;
    }

    const newAppointment = {
      id: Date.now(),
      token: appointments.length + 1,
      doctor: doctor.name,
      patient: formData.patient,
      age: formData.age,
      symptoms: formData.symptoms,
    };

    setAppointments((prevAppointments) => [
      ...prevAppointments,
      newAppointment,
    ]);

    alert(`Appointment Confirmed!\n\nToken: ${newAppointment.token}`);

    setFormData({
      patient: "",
      age: "",
      symptoms: "",
    });

    setSelectedDoctor(null);
  };

  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.spec.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="bg-gradient-to-r from-cyan-500 to-blue-700 p-6 rounded-3xl shadow-2xl mb-8">
        <h1 className="text-4xl font-bold">🏥 Smart Healthcare Dashboard</h1>
        <p className="mt-2 text-lg text-blue-100">
          AI Powered Hospital Management System
        </p>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Search doctors or specialization..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none text-white"
        />
      </div>

      <h2 className="text-3xl font-bold mb-6">👨‍⚕️ Doctors</h2>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {filteredDoctors.map((doc) => (
          <DoctorCard
            key={doc.id}
            doc={doc}
            setSelectedDoctor={setSelectedDoctor}
          />
        ))}
      </div>

      {selectedDoctor && (
        <BookingForm
          formData={formData}
          setFormData={setFormData}
          handleBooking={handleBooking}
          selectedDoctor={selectedDoctor}
        />
      )}

      <AppointmentQueue appointments={appointments} />
    </div>
  );
}