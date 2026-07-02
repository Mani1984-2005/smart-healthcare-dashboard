import { useState, useMemo } from "react";
import { DOCTORS } from "../data/doctors";
import { StatCard, StatusBadge, ActionButton, PageHeader, SearchInput } from "../components/ui";

const SPECIALTIES = ["All", ...new Set(DOCTORS.map((d) => d.spec))];

export default function DoctorsPage({ darkMode, setPage, setSelectedDoctorFromPage }) {
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("All");
  const [selectedDoctor, setSelectedDoctor] = useState(null);

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
    setSelectedDoctorFromPage(doctor);
    setPage("Dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <PageHeader
          title="Doctors Directory"
          subtitle="Browse specialist physicians and book appointments"
          icon="👨‍⚕️"
          actions={<ActionButton icon={() => null} label="Export Directory" variant="ghost" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Doctors" value={stats.total} icon="👥" color="indigo" />
          <StatCard label="Available Today" value={stats.available} icon="✓" color="emerald" />
          <StatCard label="Unavailable" value={stats.unavailable} icon="○" color="rose" />
          <StatCard label="Specializations" value={stats.specializations} icon="🔬" color="cyan" />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex-1 min-w-[240px]"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, specialization, or hospital..." /></div>
          <select value={specFilter} onChange={(e) => setSpecFilter(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s} {s === "All" ? `(${DOCTORS.length})` : `(${DOCTORS.filter((d) => d.spec === s).length})`}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((doctor) => (
            <div key={doctor.id}
              className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0 ${
                  doctor.status === "Available" ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}>
                  {doctor.name?.split(" ")[1]?.charAt(0) || doctor.name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-lg leading-tight">{doctor.name}</h3>
                  <p className="text-sm text-indigo-600 font-medium">{doctor.spec}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{doctor.hospital || "MediCare Pro Hospital"}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={doctor.status} />
                  {doctor.status === "Available" && <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Available now</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-slate-400">Experience</p>
                  <p className="text-sm font-semibold text-slate-700">{doctor.exp}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-slate-400">Rating</p>
                  <p className="text-sm font-semibold text-amber-600">{doctor.rating} ⭐</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-slate-400">Reviews</p>
                  <p className="text-sm font-semibold text-slate-700">{doctor.reviews}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-slate-400">Fee</p>
                  <p className="text-sm font-semibold text-slate-700">{doctor.fee || "₹500"}</p>
                </div>
              </div>

              <button onClick={() => handleBookAppointment(doctor)}
                disabled={doctor.status !== "Available"}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  doctor.status === "Available"
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-500 hover:to-indigo-600 shadow-md hover:shadow-lg active:scale-[0.98]"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                {doctor.status === "Available" ? "Book Appointment →" : "Currently Unavailable"}
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">🔍</div>
            <p className="text-slate-500 font-medium">No doctors match your search</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
