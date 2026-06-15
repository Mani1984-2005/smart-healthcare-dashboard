// src/pages/DoctorsPage.jsx
import { useState } from "react";
import { DOCTORS } from "../data/doctors";

export default function DoctorsPage({ darkMode, setPage, setSelectedDoctorFromPage }) {
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

        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
            Our Doctors
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Expert healthcare professionals ready to help you.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            placeholder="Search by name or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 min-w-48 px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-cyan-500 ${
              darkMode
                ? "bg-slate-900 border-slate-700 text-white placeholder-slate-400"
                : "bg-white border-slate-300"
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

        {/* Doctor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((doctor) => (
            <div
              key={doctor.id}
              className={`p-5 rounded-2xl border transition-all hover:-translate-y-1.5 hover:shadow-xl ${
                darkMode
                  ? "bg-slate-900 border-slate-800 hover:border-cyan-800"
                  : "bg-white border-slate-200 hover:border-cyan-300"
              }`}
            >
              {/* Doctor Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow ${darkMode ? "bg-slate-800" : "bg-cyan-50"}`}>
                  👨‍⚕️
                </div>
                <div>
                  <p className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{doctor.name}</p>
                  <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{doctor.spec}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs text-yellow-500">⭐ {doctor.rating}/5</span>
                    <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      ({doctor.reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                  {doctor.exp} experience
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${doctor.status === "Available" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {doctor.status}
                </span>
              </div>

              {/* Slots */}
              {doctor.status === "Available" && doctor.slots.length > 0 && (
                <div className="mb-3">
                  <p className={`text-xs font-medium mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Available Slots:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {doctor.slots.map((slot) => (
                      <span key={slot} className={`text-xs px-2 py-1 rounded-lg ${darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-50 text-cyan-700"}`}>
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Book Button */}
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