// src/pages/PatientsPage.jsx
import { useState, useEffect } from "react";
import jsPDF from "jspdf";

const initialPatients = [
  {
    id: "PAT-1001",
    name: "Ravi Kumar",
    age: "32",
    gender: "Male",
    bloodGroup: "O+",
    phone: "9876543210",
    disease: "Fever",
    address: "Davangere",
    registeredDate: "2026-06-15",
    photo: "",
    timeline: [
      {
        id: 1,
        date: "2026-06-15",
        type: "Registration",
        title: "Patient Registered",
        details: "Patient record created in MediCare Pro.",
      },
      {
        id: 2,
        date: "2026-06-16",
        type: "Consultation",
        title: "Doctor Consultation",
        details: "Visited for fever and general checkup.",
      },
    ],
  },
];

// ─── Hospital-wide sync helper ───────────────────────────────────────────────
const dispatchUpdate = () =>
  window.dispatchEvent(new Event("patientsUpdated"));
// ─────────────────────────────────────────────────────────────────────────────

export default function PatientsPage({ darkMode }) {
 const [patients, setPatients] = useState(() => {
  const savedPatients = JSON.parse(localStorage.getItem("patients"));

  if (Array.isArray(savedPatients) && savedPatients.length > 0) {
    return savedPatients;
  }

  localStorage.setItem("patients", JSON.stringify(initialPatients));
  return initialPatients;
});

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [timelineForm, setTimelineForm] = useState({
    type: "Consultation",
    title: "",
    details: "",
  });
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    bloodGroup: "O+",
    phone: "",
    disease: "",
      status: "Waiting",
    address: "",
    emergencyContact: "",
    allergies: "",
    medicalHistory: "",
    visitNotes: "",
    photo: "",
    timeline: [
      {
        id: 1,
        date: "2026-06-15",
        type: "Registration",
        title: "Patient Registered",
        details: "Patient record created in MediCare Pro.",
      },
      {
        id: 2,
        date: "2026-06-16",
        type: "Consultation",
        title: "Doctor Consultation",
        details: "Visited for fever and general checkup.",
      },
    ],
    photoSource: "Browse Photo",
  });

  useEffect(() => {
    localStorage.setItem("patients", JSON.stringify(patients));
    dispatchUpdate(); // ← notify entire hospital on every patients change
  }, [patients]);
     useEffect(() => {
  const loadPatients = () => {
    try {
      const savedPatients = JSON.parse(localStorage.getItem("patients")) || [];
      setPatients(savedPatients);
    } catch (error) {
      console.error("Failed to sync patients:", error);
    }
  };

  window.addEventListener("patientsUpdated", loadPatients);
  window.addEventListener("storage", loadPatients);

  return () => {
    window.removeEventListener("patientsUpdated", loadPatients);
    window.removeEventListener("storage", loadPatients);
  };
}, []);

  const inputClass = "border p-3 rounded-lg text-slate-900";

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm({ ...form, photo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const generatePatientPDF = (patient) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("MediCare Pro", 20, 20);
    doc.setFontSize(12);
    doc.text("Smart Healthcare System", 20, 30);
    doc.text(`Patient ID: ${patient.id}`, 20, 50);
    doc.text(`Patient Name: ${patient.name}`, 20, 60);
    doc.text(`Age: ${patient.age}`, 20, 70);
    doc.text(`Gender: ${patient.gender}`, 20, 80);
    doc.text(`Blood Group: ${patient.bloodGroup}`, 20, 90);
    doc.text(`Phone: ${patient.phone}`, 20, 100);
    doc.text(`Disease: ${patient.disease}`, 20, 110);
    doc.text(`Address: ${patient.address}`, 20, 120);
    doc.text(`Registered Date: ${patient.registeredDate}`, 20, 130);
    doc.save(`${patient.id}_receipt.pdf`);
  };
const filteredPatients = patients.filter((patient) => {
  const searchText = search.toLowerCase();

  const matchesSearch =
    patient.name?.toLowerCase().includes(searchText) ||
    patient.id?.toLowerCase().includes(searchText) ||
    patient.phone?.toLowerCase().includes(searchText);

  const matchesGender =
    genderFilter === "All" || patient.gender === genderFilter;

  return matchesSearch && matchesGender;
});
  const resetForm = () => {
    setForm({
      name: "",
      age: "",
      gender: "Male",
      bloodGroup: "O+",
      phone: "",
      disease: "",
      status: "Waiting",
      address: "",
      emergencyContact: "",
      allergies: "",
      medicalHistory: "",
      visitNotes: "",
      photo: "",
      timeline: [
        {
          id: 1,
          date: "2026-06-15",
          type: "Registration",
          title: "Patient Registered",
          details: "Patient record created in MediCare Pro.",
        },
        {
          id: 2,
          date: "2026-06-16",
          type: "Consultation",
          title: "Doctor Consultation",
          details: "Visited for fever and general checkup.",
        },
      ],
      photoSource: "Browse Photo",
    });
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.phone || !form.disease || !form.address) {
      alert("Please fill all required fields");
      return;
    }

    if (editingId) {
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === editingId ? { ...patient, ...form } : patient
        )
      );
      resetForm();
      return;
    }

    const newPatient = {
      id: `PAT-${Date.now()}`,
      ...form,
      registeredDate: new Date().toISOString().split("T")[0],
      timeline: [
        {
          id: Date.now(),
          date: new Date().toISOString().split("T")[0],
          type: "Registration",
          title: "Patient Registered",
          details: "New patient record created.",
        },
      ],
    };

    setPatients([newPatient, ...patients]);
    resetForm();
  };

  const handleEdit = (patient) => {
    setEditingId(patient.id);
    setForm({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      phone: patient.phone,
      disease: patient.disease,
      status: patient.status || "Waiting",
      address: patient.address,
      emergencyContact: patient.emergencyContact || "",
      allergies: patient.allergies || "",
      medicalHistory: patient.medicalHistory || "",
      visitNotes: patient.visitNotes || "",
      photo: patient.photo || "",
      photoSource: patient.photoSource || "Browse Photo",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this patient?")) return;
    setPatients(patients.filter((patient) => patient.id !== id));
  };

  const addTimelineEvent = () => {
    if (!selectedPatient || !timelineForm.title || !timelineForm.details) {
      alert("Please fill timeline title and details");
      return;
    }

    const newEvent = {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      type: timelineForm.type,
      title: timelineForm.title,
      details: timelineForm.details,
    };

    const updatedPatients = patients.map((patient) =>
      patient.id === selectedPatient.id
        ? { ...patient, timeline: [...(patient.timeline || []), newEvent] }
        : patient
    );

    setPatients(updatedPatients); // ← useEffect above will persist + dispatch

    setSelectedPatient({
      ...selectedPatient,
      timeline: [...(selectedPatient.timeline || []), newEvent],
    });

    setTimelineForm({ type: "Consultation", title: "", details: "" });
  };

  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <h1 className="text-2xl font-bold">Patients</h1>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-2">
  <p className="text-slate-500">
    Register, search, edit and manage patient records.
  </p>

  <p className="font-semibold text-cyan-600">
    Showing {filteredPatients.length} of {patients.length} Patients
  </p>
</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-cyan-600 text-white p-4 rounded-xl">
          <h3 className="text-sm">Total Patients</h3>
          <p className="text-2xl font-bold">{patients.length}</p>
        </div>
        <div className="bg-purple-600 text-white p-4 rounded-xl">
          <h3 className="text-sm">Male Patients</h3>
          <p className="text-2xl font-bold">{patients.filter((p) => p.gender === "Male").length}</p>
        </div>
        <div className="bg-pink-600 text-white p-4 rounded-xl">
          <h3 className="text-sm">Female Patients</h3>
          <p className="text-2xl font-bold">{patients.filter((p) => p.gender === "Female").length}</p>
        </div>
        <div className="bg-green-600 text-white p-4 rounded-xl">
          <h3 className="text-sm">Other Patients</h3>
          <p className="text-2xl font-bold">{patients.filter((p) => p.gender === "Other").length}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`mt-6 p-5 rounded-xl shadow grid grid-cols-1 md:grid-cols-4 gap-3 ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <input className={inputClass} placeholder="Patient Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputClass} placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />

        <select className={inputClass} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>

        <select className={inputClass} value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
          <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
          <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
        </select>

        <input className={inputClass} placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={inputClass} placeholder="Disease / Condition" value={form.disease} onChange={(e) => setForm({ ...form, disease: e.target.value })} />
        <select
  className={inputClass}
  value={form.status}
  onChange={(e) => setForm({ ...form, status: e.target.value })}
>
  <option value="Waiting">🟢 Waiting</option>
  <option value="In Consultation">🔵 In Consultation</option>
  <option value="Lab Test">🟡 Lab Test</option>
  <option value="Billing">🟣 Billing</option>
  <option value="Completed">✅ Completed</option>
</select>
        <input className={inputClass} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className={inputClass} placeholder="Emergency Contact" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />

        <select className={inputClass} value={form.photoSource} onChange={(e) => setForm({ ...form, photoSource: e.target.value })}>
          <option>Browse Photo</option>
          <option>Live Camera</option>
          <option>Scanned Photo Copy</option>
          <option>WhatsApp Pending</option>
        </select>

        {form.photoSource === "Browse Photo" && (
          <input className={inputClass} type="file" accept="image/*" onChange={handlePhotoUpload} />
        )}
        {form.photoSource === "Live Camera" && (
          <>
            <input className={inputClass} type="file" accept="image/*" capture="user" onChange={handlePhotoUpload} />
            <p className="text-xs text-slate-500 md:col-span-2">On mobile, tap this field to open the camera and take patient photo.</p>
          </>
        )}
        {form.photoSource === "Scanned Photo Copy" && (
          <input className={inputClass} type="file" accept="image/*,.pdf" onChange={handlePhotoUpload} />
        )}
        {form.photoSource === "WhatsApp Pending" && (
          <p className="p-3 rounded-lg bg-yellow-100 text-yellow-800">Ask patient to share photo through WhatsApp.</p>
        )}

        <input className={inputClass} placeholder="Allergies" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
        <input className={inputClass} placeholder="Medical History" value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} />
        <input className={inputClass} placeholder="Visit Notes" value={form.visitNotes} onChange={(e) => setForm({ ...form, visitNotes: e.target.value })} />

        <button className="bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700">
          {editingId ? "Update Patient" : "Register Patient"}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} className="bg-slate-700 text-white rounded-lg font-semibold">
            Cancel Edit
          </button>
        )}
      </form>

      <input
        className="mt-6 w-full md:w-96 border p-3 rounded-lg text-slate-900"
        placeholder="Search by name, ID or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
  className="mt-3 w-full md:w-60 border p-3 rounded-lg text-slate-900"
  value={genderFilter}
  onChange={(e) => setGenderFilter(e.target.value)}
>
  <option value="All">All Genders</option>
  <option value="Male">Male</option>
  <option value="Female">Female</option>
  <option value="Other">Other</option>
</select>

      <div className={`mt-6 rounded-xl shadow overflow-x-auto ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <table className="w-full text-sm min-w-[1200px]">
          <thead className="bg-cyan-600 text-white">
            <tr>
              <th className="p-3 text-left">Photo</th>
              <th className="p-3 text-left">Patient ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Age</th>
              <th className="p-3 text-left">Gender</th>
              <th className="p-3 text-left">Blood</th>
              <th className="p-3 text-left">Phone</th>
               <th className="p-3 text-left">Disease</th>
               <th className="p-3 text-left">Status</th>
               <th className="p-3 text-left">Address</th>  
              <th className="p-3 text-left">Registered</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => (
              <tr key={patient.id} className={`border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <td className="p-3">
                  {patient.photo ? (
                    <img src={patient.photo} alt={patient.name} className="w-12 h-12 rounded-full object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center text-slate-700">👤</div>
                  )}
                </td>
                <td className="p-3 font-bold text-cyan-500">{patient.id}</td>
                <td className="p-3 font-medium">{patient.name}</td>
                <td className="p-3">{patient.age}</td>
                <td className="p-3">{patient.gender}</td>
                <td className="p-3">{patient.bloodGroup}</td>
                <td className="p-3">{patient.phone}</td>
                <td className="p-3">{patient.disease}</td>

<td className="p-3">
  <span
    className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
      patient.status === "Waiting"
        ? "bg-green-500"
        : patient.status === "In Consultation"
        ? "bg-blue-500"
        : patient.status === "Lab Test"
        ? "bg-yellow-500"
        : patient.status === "Billing"
        ? "bg-purple-500"
        : "bg-gray-600"
    }`}
  >
    {patient.status}
  </span>
</td>

<td className="p-3">{patient.address}</td>
                <td className="p-3">{patient.registeredDate}</td>
                <td className="p-3 flex gap-2 flex-wrap">
                  <button onClick={() => handleEdit(patient)} className="bg-yellow-500 text-white px-3 py-1 rounded-lg">Edit</button>
                  <button onClick={() => setSelectedPatient(patient)} className="bg-cyan-600 text-white px-3 py-1 rounded-lg">View</button>
                  <button onClick={() => generatePatientPDF(patient)} className="bg-green-600 text-white px-3 py-1 rounded-lg">PDF</button>
                  <button onClick={() => handleDelete(patient.id)} className="bg-red-600 text-white px-3 py-1 rounded-lg">Delete</button>
                </td>
              </tr>
            ))}
            {filteredPatients.length === 0 && (
              <tr>
                <td colSpan="11" className="p-5 text-center text-slate-500">No patients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl shadow-xl p-6 ${darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Patient Profile</h2>
              <button onClick={() => setSelectedPatient(null)} className="text-2xl font-bold">×</button>
            </div>

            <div className="flex justify-center mb-4">
              {selectedPatient.photo ? (
                <img src={selectedPatient.photo} alt={selectedPatient.name} className="w-28 h-28 rounded-full object-cover border" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-slate-300 flex items-center justify-center text-4xl">👤</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-blue-600 text-white p-4 rounded-xl"><p className="text-xs">Lab Reports</p><p className="text-2xl font-bold">0</p></div>
              <div className="bg-green-600 text-white p-4 rounded-xl"><p className="text-xs">Billing</p><p className="text-2xl font-bold">₹0</p></div>
              <div className="bg-purple-600 text-white p-4 rounded-xl"><p className="text-xs">Reports</p><p className="text-2xl font-bold">0</p></div>
              <div className="bg-orange-600 text-white p-4 rounded-xl"><p className="text-xs">Paid Amount</p><p className="text-2xl font-bold">₹0</p></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p><b>ID:</b> {selectedPatient.id}</p>
              <p><b>Name:</b> {selectedPatient.name}</p>
              <p><b>Age:</b> {selectedPatient.age}</p>
              <p><b>Gender:</b> {selectedPatient.gender}</p>
              <p><b>Blood Group:</b> {selectedPatient.bloodGroup}</p>
              <p><b>Phone:</b> {selectedPatient.phone}</p>
              <p><b>Disease:</b> {selectedPatient.disease}</p>
              <p><b>Address:</b> {selectedPatient.address}</p>
              <p><b>Emergency Contact:</b> {selectedPatient.emergencyContact || "-"}</p>
              <p><b>Allergies:</b> {selectedPatient.allergies || "-"}</p>
              <p><b>Medical History:</b> {selectedPatient.medicalHistory || "-"}</p>
              <p><b>Visit Notes:</b> {selectedPatient.visitNotes || "-"}</p>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-bold mb-3">Medical Timeline</h3>
              <div className="space-y-3">
                {(selectedPatient.timeline || []).map((event) => (
                  <div key={event.id} className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex justify-between gap-3">
                      <p className="font-bold text-cyan-500">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.date}</p>
                    </div>
                    <p className="text-sm mt-1"><b>Type:</b> {event.type}</p>
                    <p className="text-sm text-slate-500 mt-1">{event.details}</p>
                  </div>
                ))}
                {(!selectedPatient.timeline || selectedPatient.timeline.length === 0) && (
                  <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex justify-between gap-3">
                      <p className="font-bold text-cyan-500">Patient Registered</p>
                      <p className="text-xs text-slate-500">{selectedPatient.registeredDate}</p>
                    </div>
                    <p className="text-sm mt-1"><b>Type:</b> Registration</p>
                    <p className="text-sm text-slate-500 mt-1">Existing patient record imported into medical timeline.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-bold mb-3">Add Timeline Event</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select className={inputClass} value={timelineForm.type} onChange={(e) => setTimelineForm({ ...timelineForm, type: e.target.value })}>
                  <option>Consultation</option>
                  <option>Prescription</option>
                  <option>Lab Test</option>
                  <option>X-Ray</option>
                  <option>Billing</option>
                  <option>Follow-up</option>
                </select>
                <input className={inputClass} placeholder="Title" value={timelineForm.title} onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })} />
                <input className={inputClass} placeholder="Details" value={timelineForm.details} onChange={(e) => setTimelineForm({ ...timelineForm, details: e.target.value })} />
              </div>
              <button type="button" onClick={addTimelineEvent} className="mt-3 bg-cyan-600 text-white px-4 py-2 rounded-lg">
                Add Timeline Event
              </button>
            </div>

            <div className="mt-6 text-right">
              <button onClick={() => setSelectedPatient(null)} className="bg-cyan-600 text-white px-4 py-2 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}