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
  });

  const inputClass = "border p-3 rounded-lg text-slate-900";

  const specs = ["All", ...new Set(doctors.map((doctor) => doctor.spec))];

  const filtered = doctors.filter(
    (doctor) =>
      (spec === "All" || doctor.spec === spec) &&
      (doctor.name.toLowerCase().includes(search.toLowerCase()) ||
        doctor.spec.toLowerCase().includes(search.toLowerCase()))
  );

  const resetForm = () => {
    setForm({
      name: "",
      spec: "",
      exp: "",
      fee: "",
      status: "Available",
      slots: "",
    });
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

    setDoctors([
      {
        id: Date.now(),
        ...doctorData,
      },
      ...doctors,
    ]);

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
      `Doctor Profile

Name: ${doctor.name}

Specialization: ${doctor.spec}

Experience: ${doctor.exp}

Consultation Fee: ₹${doctor.fee || "Not set"}

Status: ${doctor.status}

Rating: ${doctor.rating}/5

Reviews: ${doctor.reviews}

Slots: ${doctor.slots.join(", ")}`
    );
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-black">Doctors Management</h1>
          <p className="text-sm mt-1 text-slate-500">
            Add, edit, delete, view and manage doctor availability.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={`mb-6 p-5 rounded-xl shadow grid grid-cols-1 md:grid-cols-4 gap-3 ${darkMode ? "bg-slate-900" : "bg-white"}`}>
          <input className={inputClass} placeholder="Doctor Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputClass} placeholder="Specialization" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} />
          <input className={inputClass} placeholder="Experience e.g. 8 years" value={form.exp} onChange={(e) => setForm({ ...form, exp: e.target.value })} />
          <input className={inputClass} placeholder="Consultation Fee" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />

          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Available</option>
            <option>Unavailable</option>
          </select>

          <input className={inputClass} placeholder="Slots: 10:00 AM, 2:00 PM" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} />

          <button className="bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700">
            {editingId ? "Update Doctor" : "Add Doctor"}
          </button>

          {editingId && (
            <button type="button" onClick={resetForm} className="bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600">
              Cancel Edit
            </button>
          )}
        </form>

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
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow ${darkMode ? "bg-slate-800" : "bg-cyan-50"}`}>
                  👨‍⚕️
                </div>
                <div>
                  <p className="font-bold">{doctor.name}</p>
                  <p className="text-sm text-slate-500">{doctor.spec}</p>
                  <span className="text-xs text-yellow-500">⭐ {doctor.rating}/5 ({doctor.reviews} reviews)</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  {doctor.exp} experience
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${doctor.status === "Available" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {doctor.status}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-cyan-100 text-cyan-700">
                  ₹{doctor.fee || "N/A"}
                </span>
              </div>

              {doctor.status === "Available" && doctor.slots.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-1 text-slate-500">Available Slots:</p>
                  <div className="flex flex-wrap gap-1">
                    {doctor.slots.map((slot) => (
                      <span key={slot} className="text-xs px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700">
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => handleView(doctor)} className="bg-slate-700 text-white py-2 rounded-xl text-sm">
                  View
                </button>
                <button onClick={() => handleEdit(doctor)} className="bg-yellow-500 text-white py-2 rounded-xl text-sm">
                  Edit
                </button>
                <button onClick={() => handleDelete(doctor.id)} className="bg-red-600 text-white py-2 rounded-xl text-sm">
                  Delete
                </button>

                {doctor.status === "Available" ? (
                  <button
                    onClick={() => { setSelectedDoctorFromPage(doctor); setPage("Dashboard"); }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl text-sm"
                  >
                    Book
                  </button>
                ) : (
                  <button disabled className="bg-slate-300 text-slate-500 py-2 rounded-xl text-sm cursor-not-allowed">
                    Unavailable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}