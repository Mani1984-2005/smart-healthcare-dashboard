import { useState } from "react";

export default function LaboratoryPage({ darkMode }) {
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({
    patientName: "",
    testName: "",
    result: "",
    cost: "",
    status: "Pending",
  });

  const pendingCount = reports.filter((report) => report.status === "Pending").length;
  const processingCount = reports.filter((report) => report.status === "Processing").length;
  const completedCount = reports.filter((report) => report.status === "Completed").length;
  const totalRevenue = reports.reduce((sum, report) => sum + Number(report.cost), 0);

  const resetForm = () => {
    setForm({
      patientName: "",
      testName: "",
      result: "",
      cost: "",
      status: "Pending",
    });
  };

  const addReport = (e) => {
    e.preventDefault();

    if (!form.patientName || !form.testName || !form.cost) {
      alert("Please fill patient name, test name and cost");
      return;
    }

    const newReport = {
      id: `LAB-${Date.now()}`,
      ...form,
      reportDate: new Date().toISOString().split("T")[0],
    };

    setReports([newReport, ...reports]);
    resetForm();
  };

  const deleteReport = (id) => {
    if (!window.confirm("Delete this lab report?")) return;
    setReports(reports.filter((report) => report.id !== id));
  };

  const viewReport = (report) => {
    alert(
      `Lab Report ID: ${report.id}

Patient: ${report.patientName}

Test: ${report.testName}

Result: ${report.result || "Not available yet"}

Cost: ₹${report.cost}

Status: ${report.status}

Report Date: ${report.reportDate}`
    );
  };

  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <h1 className="text-2xl font-bold">Laboratory</h1>
      <p className="text-slate-500 mt-2">Create lab reports, track status and manage test records.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className={`p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
          <p className="text-sm text-slate-500">Total Reports</p>
          <h2 className="text-3xl font-bold">{reports.length}</h2>
        </div>
        <div className={`p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
          <p className="text-sm text-slate-500">Pending</p>
          <h2 className="text-3xl font-bold text-yellow-500">{pendingCount}</h2>
        </div>
        <div className={`p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
          <p className="text-sm text-slate-500">Completed</p>
          <h2 className="text-3xl font-bold text-emerald-500">{completedCount}</h2>
        </div>
        <div className={`p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
          <p className="text-sm text-slate-500">Lab Revenue</p>
          <h2 className="text-3xl font-bold text-cyan-500">₹{totalRevenue}</h2>
        </div>
      </div>

      <form onSubmit={addReport} className={`mt-6 p-5 rounded-xl shadow grid grid-cols-1 md:grid-cols-6 gap-3 ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <input className="border p-3 rounded-lg text-slate-900" placeholder="Patient Name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
        <input className="border p-3 rounded-lg text-slate-900" placeholder="Test Name" value={form.testName} onChange={(e) => setForm({ ...form, testName: e.target.value })} />
        <input className="border p-3 rounded-lg text-slate-900" placeholder="Result Value" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
        <input className="border p-3 rounded-lg text-slate-900" placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />

        <select className="border p-3 rounded-lg text-slate-900" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>Pending</option>
          <option>Processing</option>
          <option>Completed</option>
        </select>

        <button className="bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700">
          Add Report
        </button>
      </form>

      <div className={`mt-6 rounded-xl shadow overflow-x-auto ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-cyan-600 text-white">
            <tr>
              <th className="p-3 text-left">Report ID</th>
              <th className="p-3 text-left">Patient</th>
              <th className="p-3 text-left">Test</th>
              <th className="p-3 text-left">Result</th>
              <th className="p-3 text-left">Cost</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className={`border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <td className="p-3 font-bold text-cyan-500">{report.id}</td>
                <td className="p-3">{report.patientName}</td>
                <td className="p-3">{report.testName}</td>
                <td className="p-3">{report.result || "Pending"}</td>
                <td className="p-3">₹{report.cost}</td>
                <td className="p-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    report.status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : report.status === "Processing"
                      ? "bg-cyan-100 text-cyan-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {report.status}
                  </span>
                </td>
                <td className="p-3">{report.reportDate}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => viewReport(report)} className="bg-cyan-600 text-white px-3 py-1 rounded-lg">
                      View
                    </button>
                    <button onClick={() => deleteReport(report.id)} className="bg-red-600 text-white px-3 py-1 rounded-lg">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {reports.length === 0 && (
              <tr>
                <td colSpan="8" className="p-5 text-center text-slate-500">
                  No lab reports created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}