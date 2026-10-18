import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DOCTORS } from "../data/doctors";
import { StatCard, StatusBadge, ActionButton, SearchInput } from "../components/ui";

const SPECIALTIES = ["All", ...new Set(DOCTORS.map((d) => d.spec))];

export default function DoctorsPage({ darkMode, setPage, setSelectedDoctorFromPage }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("All");

  const filtered = useMemo(() => DOCTORS.filter((d) => {
    const q = search.toLowerCase();
    return (d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q) || d.hospital?.toLowerCase().includes(q)) && (specFilter === "All" || d.spec === specFilter);
  }), [search, specFilter]);

  const stats = useMemo(() => ({
    total: DOCTORS.length,
    available: DOCTORS.filter((d) => d.status === "Available").length,
    unavailable: DOCTORS.filter((d) => d.status === "Unavailable").length,
    specializations: new Set(DOCTORS.map((d) => d.spec)).size,
  }), []);

  const handleBookAppointment = (doctor) => {
    if (typeof setSelectedDoctorFromPage === "function") {
      setSelectedDoctorFromPage(doctor);
    }
    if (typeof setPage === "function") {
      setPage("Dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Gorgeous Hero Background Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-cyan-900 via-teal-900 to-blue-900 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-xl">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay z-0"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1600&q=80')` }}
        />
        <div className="w-full relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
              🩺 MediCare Pro Clinical Expert Network
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Specialist Physicians & Consultants
            </h1>
            <p className="text-cyan-100 text-sm sm:text-base mt-2 max-w-2xl font-normal">
              Connect with leading board-certified physicians, surgeons, and healthcare specialists with instant appointment booking.
            </p>
          </div>
          <div className="shrink-0">
            <ActionButton 
              icon={() => "📥"} 
              label="Export Directory" 
              variant="secondary" 
              onClick={() => alert("Directory exported successfully!")} 
            />
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Doctors" value={stats.total} icon="👥" color="indigo" darkMode={darkMode} />
          <StatCard label="Available Today" value={stats.available} icon="✓" color="emerald" darkMode={darkMode} />
          <StatCard label="Unavailable" value={stats.unavailable} icon="○" color="rose" darkMode={darkMode} />
          <StatCard label="Specializations" value={stats.specializations} icon="🔬" color="cyan" darkMode={darkMode} />
        </div>

        <div className={`p-5 rounded-2xl border mb-8 shadow-sm backdrop-blur-xl ${darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <SearchInput value={search} onChange={setSearch} placeholder="Search by name, specialization, or hospital..." darkMode={darkMode} />
            </div>
            <select
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className={`px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 font-medium ${
                darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s} {s === "All" ? `(${DOCTORS.length})` : `(${DOCTORS.filter((d) => d.spec === s).length})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((doctor) => (
            <div
              key={doctor.id}
              className={`rounded-2xl border p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group ${
                darkMode ? "bg-slate-900/90 border-slate-800 text-white" : "bg-white border-slate-200/80 text-slate-900"
              }`}
            >
              <div className="flex items-start gap-4 mb-5">
                {doctor.photo ? (
                  <img src={doctor.photo} alt={doctor.name} className="w-16 h-16 rounded-2xl object-cover shrink-0 shadow-lg border-2 border-cyan-500/20" />
                ) : (
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-lg ${
                    doctor.status === "Available" ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-slate-400 to-slate-600"
                  }`}>
                    {doctor.name?.split(" ")[1]?.charAt(0) || doctor.name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-lg leading-tight ${darkMode ? "text-white" : "text-slate-900"}`}>{doctor.name}</h3>
                  <p className="text-sm text-cyan-500 font-semibold mt-0.5">{doctor.spec}</p>
                  <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{doctor.hospital || "MediCare Pro Hospital"}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={doctor.status} />
                  {doctor.status === "Available" && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ready
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <div className={`rounded-xl p-3 text-center border ${darkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-100"}`}>
                  <p className={`text-[11px] font-medium uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Experience</p>
                  <p className={`text-sm font-bold mt-0.5 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{doctor.exp}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${darkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-100"}`}>
                  <p className={`text-[11px] font-medium uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Rating</p>
                  <p className="text-sm font-bold text-amber-500 mt-0.5">{doctor.rating} ⭐</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${darkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-100"}`}>
                  <p className={`text-[11px] font-medium uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Reviews</p>
                  <p className={`text-sm font-bold mt-0.5 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{doctor.reviews}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${darkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-100"}`}>
                  <p className={`text-[11px] font-medium uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Fee</p>
                  <p className={`text-sm font-bold mt-0.5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>₹{doctor.fee || "500"}</p>
                </div>
              </div>

              <button
                onClick={() => handleBookAppointment(doctor)}
                disabled={doctor.status !== "Available"}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  doctor.status === "Available"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-md hover:shadow-lg active:scale-[0.98]"
                    : darkMode ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                {doctor.status === "Available" ? "Book Consultation →" : "Currently Unavailable"}
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">🔍</div>
            <p className={`font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>No doctors match your search</p>
            <p className={`text-sm mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Try adjusting your filters or search keywords</p>
          </div>
        )}
      </div>
    </div>
  );
}
