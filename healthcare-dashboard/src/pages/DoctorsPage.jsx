import { useState } from "react";
import { DOCTORS } from "../data/doctors";

export default function DoctorsPage({ darkMode, setPage, setSelectedDoctorFromPage }) {
  const [doctors, setDoctors] = useState(DOCTORS);
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("All");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    spec: "",
    exp: "",
    fee: "",
    status: "Available",
    slots: "",
    photo: "",
  });

  const specs = ["All", ...new Set(doctors.map((doctor) => doctor.spec))];

  const filtered = doctors.filter(
    (doctor) =>
      (spec === "All" || doctor.spec === spec) &&
      (doctor.name.toLowerCase().includes(search.toLowerCase()) ||
        doctor.spec.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDoctorPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm({ ...form, photo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm({ name: "", spec: "", exp: "", fee: "", status: "Available", slots: "", photo: "" });
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.spec || !form.exp || !form.fee || !form.slots) {
      alert("Please fill all fields");
      return;
    }
    const doctorData = {
      name: form.name,
      spec: form.spec,
      exp: form.exp,
      fee: form.fee,
      status: form.status,
      slots: form.slots.split(",").map((slot) => slot.trim()),
      rating: 4.5,
      reviews: 20,
      photo: form.photo,
    };
    if (editingId) {
      setDoctors((prev) =>
        prev.map((doctor) =>
          doctor.id === editingId ? { ...doctor, ...doctorData } : doctor
        )
      );
      resetForm();
      return;
    }
    setDoctors([{ id: Date.now(), ...doctorData }, ...doctors]);
    resetForm();
  };

  const handleEdit = (doctor) => {
    setEditingId(doctor.id);
    setForm({
      name: doctor.name,
      spec: doctor.spec,
      exp: doctor.exp,
      fee: doctor.fee || "",
      status: doctor.status,
      slots: doctor.slots.join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this doctor?")) return;
    setDoctors(doctors.filter((doctor) => doctor.id !== id));
  };

  const handleView = (doctor) => {
    alert(
      `Doctor Profile\n\nName: ${doctor.name}\n\nSpecialization: ${doctor.spec}\n\nExperience: ${doctor.exp}\n\nConsultation Fee: \u20b9${doctor.fee || "Not set"}\n\nStatus: ${doctor.status}\n\nRating: ${doctor.rating}/5\n\nReviews: ${doctor.reviews}\n\nSlots: ${doctor.slots.join(", ")}`
    );
  };

  const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const inputBase = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-cyan-500 transition-all ${
    darkMode
      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
      : "bg-white border-slate-300 text-slate-900"
  }`;

  const stats = [
    { label: "Total Doctors", value: doctors.length, color: "text-cyan-500", bg: darkMode ? "bg-cyan-950" : "bg-cyan-50" },
    { label: "Available", value: doctors.filter((d) => d.status === "Available").length, color: "text-emerald-500", bg: darkMode ? "bg-emerald-950" : "bg-emerald-50" },
    { label: "Unavailable", value: doctors.filter((d) => d.status === "Unavailable").length, color: "text-rose-500", bg: darkMode ? "bg-rose-950" : "bg-rose-50" },
    { label: "Specializations", value: new Set(doctors.map((d) => d.spec)).size, color: "text-violet-500", bg: darkMode ? "bg-violet-950" : "bg-violet-50" },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page Header */}
        <div className={`p-6 rounded-2xl border ${card}`}>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🏥</span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Doctor Management</h1>
              <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Add, edit, and manage doctor profiles and availability across all departments.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={`p-4 rounded-2xl border ${card} hover:-translate-y-0.5 transition-all`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                <span className={`text-lg font-black ${s.color}`}>{s.value}</span>
              </div>
              <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{s.label}</p>
              <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Add / Edit Form */}
        <div className={`p-6 rounded-2xl border shadow-sm ${card}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-base">
                {editingId ? "Update Doctor Profile" : "Register New Doctor"}
              </h2>
              <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {editingId ? "Modify the details below and save changes." : "Fill in the doctor's details to add them to the directory."}
              </p>
            </div>
            {editingId && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">Editing Mode</span>
            )}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Doctor Name *</label>
              <input className={inputBase} placeholder="e.g. Dr. Aisha Sharma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Specialization *</label>
              <input className={inputBase} placeholder="e.g. Cardiology" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Experience *</label>
              <input className={inputBase} placeholder="e.g. 8 years" value={form.exp} onChange={(e) => setForm({ ...form, exp: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Consultation Fee (INR) *</label>
              <input className={inputBase} placeholder="e.g. 500" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Availability Status</label>
              <select className={inputBase} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Available</option>
                <option>Unavailable</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Time Slots *</label>
              <input className={inputBase} placeholder="10:00 AM, 2:00 PM, 5:00 PM" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Profile Photo</label>
              <input className={inputBase} type="file" accept="image/*" onChange={handleDoctorPhotoUpload} />
            </div>
            <div className="flex gap-2 items-end">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm"
              >
                {editingId ? "Save Changes" : "Add Doctor"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    darkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              placeholder="Search by name or specialization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:border-cyan-500 transition-all ${
                darkMode
                  ? "bg-slate-900 border-slate-700 text-white placeholder-slate-400"
                  : "bg-white border-slate-300 text-slate-900"
              }`}
            />
          </div>
          <select
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
              darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
            }`}
          >
            {specs.map((item) => <option key={item}>{item}</option>)}
          </select>
          <span className={`text-xs px-3 py-2 rounded-xl border font-medium ${darkMode ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
            {filtered.length} doctor{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Doctor Cards */}
        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${card}`}>
            <span className="text-5xl mb-4">🔍</span>
            <p className="font-bold text-lg">No doctors found</p>
            <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Try adjusting your search or specialization filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((doctor) => (
              <div
                key={doctor.id}
                className={`p-5 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-xl ${
                  darkMode
                    ? "bg-slate-900 border-slate-800 hover:border-cyan-800"
                    : "bg-white border-slate-200 hover:border-cyan-300"
                }`}
              >
                {/* Doctor Header */}
                <div className="flex items-center gap-3 mb-4">
                  {doctor.photo ? (
                    <img
                      src={doctor.photo}
                      alt={doctor.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-200 shadow"
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow ${darkMode ? "bg-slate-800" : "bg-cyan-50"}`}>
                      👨‍⚕️
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight truncate">{doctor.name}</p>
                    <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{doctor.spec}</p>
                    <p className="text-xs text-amber-500 mt-0.5">⭐ {doctor.rating}/5 · {doctor.reviews} reviews</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    doctor.status === "Available"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-600"
                  }`}>
                    {doctor.status === "Available" ? "✓ " : "✗ "}{doctor.status}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    {doctor.exp}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-cyan-100 text-cyan-700">
                    ₹{doctor.fee || "N/A"}
                  </span>
                </div>

                {/* Slots */}
                {doctor.status === "Available" && doctor.slots.length > 0 && (
                  <div className="mb-4">
                    <p className={`text-xs font-semibold mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Available Slots</p>
                    <div className="flex flex-wrap gap-1">
                      {doctor.slots.map((slot) => (
                        <span key={slot} className={`text-xs px-2 py-0.5 rounded-lg font-medium ${darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-50 text-cyan-700"}`}>
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button
                    onClick={() => handleView(doctor)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => handleEdit(doctor)}
                    className="py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(doctor.id)}
                    className="py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all"
                  >
                    Delete
                  </button>
                  {doctor.status === "Available" ? (
                    <button
                      onClick={() => { setSelectedDoctorFromPage(doctor); setPage("Dashboard"); }}
                      className="py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-all"
                    >
                      Book Slot
                    </button>
                  ) : (
                    <button
                      disabled
                      className={`py-2 rounded-xl text-xs font-semibold cursor-not-allowed ${darkMode ? "bg-slate-800 text-slate-600" : "bg-slate-100 text-slate-400"}`}
                    >
                      Unavailable
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}