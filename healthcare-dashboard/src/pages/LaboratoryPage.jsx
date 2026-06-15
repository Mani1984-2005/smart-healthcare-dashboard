import { useState } from "react";

export default function LaboratoryPage({ darkMode }) {
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState({
    patientName: "",
    testName: "",
    cost: "",
    status: "Pending",
  });

  const addTest = (e) => {
    e.preventDefault();
    if (!form.patientName || !form.testName || !form.cost) {
      alert("Please fill all fields");
      return;
    }

    setTests([{ id: Date.now(), ...form }, ...tests]);
    setForm({ patientName: "", testName: "", cost: "", status: "Pending" });
  };

  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <h1 className="text-2xl font-bold">Laboratory</h1>
      <p className="text-slate-500 mt-2">Manage lab tests and reports.</p>

      <form onSubmit={addTest} className={`mt-6 p-5 rounded-xl shadow grid grid-cols-1 md:grid-cols-5 gap-3 ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <input className="border p-3 rounded-lg text-slate-900" placeholder="Patient Name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
        <input className="border p-3 rounded-lg text-slate-900" placeholder="Test Name" value={form.testName} onChange={(e) => setForm({ ...form, testName: e.target.value })} />
        <input className="border p-3 rounded-lg text-slate-900" placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        <select className="border p-3 rounded-lg text-slate-900" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>Pending</option>
          <option>Processing</option>
          <option>Completed</option>
        </select>
        <button className="bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700">
          Add Test
        </button>
      </form>
    </div>
  );
}