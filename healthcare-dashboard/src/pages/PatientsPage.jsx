import { useState, useEffect } from "react";

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
  },
];

export default function PatientsPage({ darkMode }) {
  const [patients, setPatients] = useState(() => {
    return JSON.parse(localStorage.getItem("patients")) || initialPatients;
  });

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [selectedPatient, setSelectedPatient] = useState(null);

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    bloodGroup: "O+",
    phone: "",
    disease: "",
    address: "",
    emergencyContact: "",
    allergies: "",
    medicalHistory: "",
    visitNotes: "",
  });

  useEffect(() => {
    localStorage.setItem("patients", JSON.stringify(patients));
  }, [patients]);

  const inputClass = "border p-3 rounded-lg text-slate-900";

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(search.toLowerCase()) ||
      patient.id.toLowerCase().includes(search.toLowerCase()) ||
      patient.phone.includes(search)
  );

  const resetForm = () => {
    setForm({
      name: "",
      age: "",
      gender: "Male",
      bloodGroup: "O+",
      phone: "",
      disease: "",
      address: "",
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
      address: patient.address,
      emergencyContact: patient.emergencyContact || "",
      allergies: patient.allergies || "",
      medicalHistory: patient.medicalHistory || "",
      visitNotes: patient.visitNotes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this patient?")) return;
    setPatients(patients.filter((patient) => patient.id !== id));
  };

  return (
    <div
      className={`p-6 min-h-screen ${
        darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"
      }`}
    >
      <h1 className="text-2xl font-bold">Patients</h1>
      <p className="text-slate-500 mt-2">
        Register, search, edit and manage patient records.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-cyan-600 text-white p-4 rounded-xl">
          <h3 className="text-sm">Total Patients</h3>
          <p className="text-2xl font-bold">{patients.length}</p>
        </div>

        <div className="bg-purple-600 text-white p-4 rounded-xl">
          <h3 className="text-sm">Male Patients</h3>
          <p className="text-2xl font-bold">
            {patients.filter((p) => p.gender === "Male").length}
          </p>
        </div>

        <div className="bg-pink-600 text-white p-4 rounded-xl">
          <h3 className="text-sm">Female Patients</h3>
          <p className="text-2xl font-bold">
            {patients.filter((p) => p.gender === "Female").length}
          </p>
        </div>

        <div className="bg-green-600 text-white p-4 rounded-xl">
          <h3 className="text-sm">Other Patients</h3>
          <p className="text-2xl font-bold">
            {patients.filter((p) => p.gender === "Other").length}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`mt-6 p-5 rounded-xl shadow grid grid-cols-1 md:grid-cols-4 gap-3 ${
          darkMode ? "bg-slate-900" : "bg-white"
        }`}
      >
        <input className={inputClass} placeholder="Patient Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputClass} placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />

        <select className={inputClass} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>

        <select className={inputClass} value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
          <option>O+</option>
          <option>O-</option>
          <option>A+</option>
          <option>A-</option>
          <option>B+</option>
          <option>B-</option>
          <option>AB+</option>
          <option>AB-</option>
        </select>

        <input className={inputClass} placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={inputClass} placeholder="Disease / Condition" value={form.disease} onChange={(e) => setForm({ ...form, disease: e.target.value })} />
        <input className={inputClass} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className={inputClass} placeholder="Emergency Contact" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />

<input className={inputClass} placeholder="Allergies" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />

<input className={inputClass} placeholder="Medical History" value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} />

<input className={inputClass} placeholder="Visit Notes" value={form.visitNotes} onChange={(e) => setForm({ ...form, visitNotes: e.target.value })} />

        <button className="bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700">
          {editingId ? "Update Patient" : "Register Patient"}
        </button>

        {editingId && (
          <button type="button" onClick={resetForm} className="bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600">
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

      <div
        className={`mt-6 rounded-xl shadow overflow-x-auto ${
          darkMode ? "bg-slate-900" : "bg-white"
        }`}
      >
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-cyan-600 text-white">
            <tr>
              <th className="p-3 text-left">Patient ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Age</th>
              <th className="p-3 text-left">Gender</th>
              <th className="p-3 text-left">Blood</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Disease</th>
              <th className="p-3 text-left">Address</th>
              <th className="p-3 text-left">Registered</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredPatients.map((patient) => (
              <tr
                key={patient.id}
                className={`border-b ${
                  darkMode ? "border-slate-700" : "border-slate-200"
                }`}
              >
                <td className="p-3 font-bold text-cyan-500">{patient.id}</td>
                <td className="p-3 font-medium">{patient.name}</td>
                <td className="p-3">{patient.age}</td>
                <td className="p-3">{patient.gender}</td>
                <td className="p-3">{patient.bloodGroup}</td>
                <td className="p-3">{patient.phone}</td>
                <td className="p-3">{patient.disease}</td>
                <td className="p-3">{patient.address}</td>
                <td className="p-3">{patient.registeredDate}</td>

                <td className="p-3 flex gap-2">
                  <button onClick={() => handleEdit(patient)} className="bg-yellow-500 text-white px-3 py-1 rounded-lg">
                    Edit
                  </button>

                  <button onClick={() => setSelectedPatient(patient)} className="bg-cyan-600 text-white px-3 py-1 rounded-lg">
                    View
                  </button>

                  <button onClick={() => handleDelete(patient.id)} className="bg-red-600 text-white px-3 py-1 rounded-lg">
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filteredPatients.length === 0 && (
              <tr>
                <td colSpan="10" className="p-5 text-center text-slate-500">
                  No patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedPatient && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
    <div className={`w-full max-w-2xl rounded-2xl shadow-xl p-6 ${
      darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Patient Profile</h2>
        <button
          onClick={() => setSelectedPatient(null)}
          className="text-2xl font-bold"
        >
          ×
        </button>
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

      <div className="mt-6 text-right">
        <button
          onClick={() => setSelectedPatient(null)}
          className="bg-cyan-600 text-white px-4 py-2 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
    </div>
    
  );
}