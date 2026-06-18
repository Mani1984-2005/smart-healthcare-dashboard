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

  const [medicalRecords, setMedicalRecords] = useState(() => {
    return JSON.parse(localStorage.getItem("medicalRecords")) || [];
  });

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    bloodGroup: "O+",
    phone: "",
    disease: "",
    address: "",
  });

  const [recordForm, setRecordForm] = useState({
    patientId: "",
    diagnosis: "",
    prescription: "",
    doctorNotes: "",
    followUpDate: "",
  });

  useEffect(() => {
    localStorage.setItem("patients", JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem("medicalRecords", JSON.stringify(medicalRecords));
  }, [medicalRecords]);

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
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this patient?")) return;
    setPatients(patients.filter((patient) => patient.id !== id));
  };

  const addMedicalRecord = () => {
    if (!recordForm.patientId || !recordForm.diagnosis || !recordForm.prescription) {
      alert("Please fill Patient ID, Diagnosis and Prescription");
      return;
    }

    const newRecord = {
      id: `EMR-${Date.now()}`,
      ...recordForm,
      visitDate: new Date().toISOString().split("T")[0],
    };

    setMedicalRecords([newRecord, ...medicalRecords]);

    setRecordForm({
      patientId: "",
      diagnosis: "",
      prescription: "",
      doctorNotes: "",
      followUpDate: "",
    });
  };

  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <h1 className="text-2xl font-bold">Patients</h1>
      <p className="text-slate-500 mt-2">
        Register, search, edit and manage patient records.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-cyan-600 text-white p-4 rounded-xl">
          <h3 className="text-sm">Total Patients</h3>
          <p className="text-2xl font-bold">{patients.length}</p>
        </div>

        <div className="bg-green-600 text-white p-4 rounded-xl">
          <h3 className="text-sm">Medical Records</h3>
          <p className="text-2xl font-bold">{medicalRecords.length}</p>
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
      </div>

      <form
        onSubmit={handleSubmit}
        className={`mt-6 p-5 rounded-xl shadow grid grid-cols-1 md:grid-cols-4 gap-3 ${darkMode ? "bg-slate-900" : "bg-white"}`}
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

      <div className={`mt-6 rounded-xl shadow overflow-x-auto ${darkMode ? "bg-slate-900" : "bg-white"}`}>
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
              <tr key={patient.id} className={`border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
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
                  <button onClick={() => alert(JSON.stringify(patient, null, 2))} className="bg-cyan-600 text-white px-3 py-1 rounded-lg">
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

      <div className={`mt-6 p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <h2 className="text-xl font-bold mb-4">Medical Records / EMR</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className={inputClass} placeholder="Patient ID" value={recordForm.patientId} onChange={(e) => setRecordForm({ ...recordForm, patientId: e.target.value })} />
          <input className={inputClass} placeholder="Diagnosis" value={recordForm.diagnosis} onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })} />
          <input className={inputClass} placeholder="Prescription" value={recordForm.prescription} onChange={(e) => setRecordForm({ ...recordForm, prescription: e.target.value })} />
          <input className={inputClass} placeholder="Doctor Notes" value={recordForm.doctorNotes} onChange={(e) => setRecordForm({ ...recordForm, doctorNotes: e.target.value })} />
          <input type="date" className={inputClass} value={recordForm.followUpDate} onChange={(e) => setRecordForm({ ...recordForm, followUpDate: e.target.value })} />
        </div>

        <button onClick={addMedicalRecord} className="mt-4 bg-cyan-600 text-white px-5 py-2 rounded-lg font-semibold">
          Add Medical Record
        </button>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cyan-600 text-white">
              <tr>
                <th className="p-3 text-left">Patient ID</th>
                <th className="p-3 text-left">Diagnosis</th>
                <th className="p-3 text-left">Prescription</th>
                <th className="p-3 text-left">Doctor Notes</th>
                <th className="p-3 text-left">Visit Date</th>
                <th className="p-3 text-left">Follow Up</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {medicalRecords.map((record) => (
                <tr key={record.id} className={`border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                  <td className="p-3">{record.patientId}</td>
                  <td className="p-3">{record.diagnosis}</td>
                  <td className="p-3">{record.prescription}</td>
                  <td className="p-3">{record.doctorNotes}</td>
                  <td className="p-3">{record.visitDate}</td>
                  <td className="p-3">{record.followUpDate}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => alert(JSON.stringify(record, null, 2))} className="bg-cyan-600 text-white px-3 py-1 rounded-lg">
                      View
                    </button>
                    <button onClick={() => setMedicalRecords(medicalRecords.filter((r) => r.id !== record.id))} className="bg-red-600 text-white px-3 py-1 rounded-lg">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {medicalRecords.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-5 text-center text-slate-500">
                    No medical records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}