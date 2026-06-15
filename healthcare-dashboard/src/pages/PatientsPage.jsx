import { useState } from "react";
import { PATIENTS } from "../data/patients";

export default function PatientsPage() {
  const [patients, setPatients] = useState(PATIENTS);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    phone: "",
    disease: "",
  });

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddPatient = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.age || !formData.phone || !formData.disease) {
      alert("Please fill all fields");
      return;
    }

    const newPatient = {
      id: Date.now(),
      ...formData,
    };

    setPatients([newPatient, ...patients]);
    setFormData({ name: "", age: "", phone: "", disease: "" });
  };

  const handleDeletePatient = (id) => {
    setPatients(patients.filter((patient) => patient.id !== id));
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
      <p className="text-slate-500 mt-2">Add, search and manage patient records.</p>

      <form onSubmit={handleAddPatient} className="mt-6 bg-white p-5 rounded-xl shadow grid grid-cols-1 md:grid-cols-5 gap-3">
        <input className="border p-3 rounded-lg" placeholder="Patient name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        <input className="border p-3 rounded-lg" placeholder="Age" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
        <input className="border p-3 rounded-lg" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        <input className="border p-3 rounded-lg" placeholder="Disease" value={formData.disease} onChange={(e) => setFormData({ ...formData, disease: e.target.value })} />
        <button className="bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700">
          Add Patient
        </button>
      </form>

      <input
        className="mt-6 w-full md:w-96 border p-3 rounded-lg"
        placeholder="Search patient by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mt-6 bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cyan-600 text-white">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Age</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Disease</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => (
              <tr key={patient.id} className="border-b">
                <td className="p-3 font-medium">{patient.name}</td>
                <td className="p-3">{patient.age}</td>
                <td className="p-3">{patient.phone}</td>
                <td className="p-3">{patient.disease}</td>
                <td className="p-3">
                  <button onClick={() => handleDeletePatient(patient.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600">
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filteredPatients.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-slate-500">
                  No patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}