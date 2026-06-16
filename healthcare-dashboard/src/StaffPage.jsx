// src/pages/StaffPage.jsx
import { useState } from "react";
import { STAFF } from "../data/staff";

export default function StaffPage({ darkMode }) {
  const [filter, setFilter] = useState("All");
  const departments = ["All", ...new Set(STAFF.map((item) => item.dept))];
  const filtered = filter === "All" ? STAFF : STAFF.filter((item) => item.dept === filter);

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
            Staff Management
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Hospital staff directory and attendance overview
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Staff", val: STAFF.length },
            { label: "Present Today", val: STAFF.filter((s) => s.attendance === "Present").length },
            { label: "Absent", val: STAFF.filter((s) => s.attendance === "Absent").length },
            { label: "Salary Pending", val: STAFF.filter((s) => s.salary === "Pending").length },
          ].map((item) => (
            <div
              key={item.label}
              className={`p-4 rounded-2xl border shadow hover:-translate-y-0.5 transition-all ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{item.label}</p>
              <p className={`text-2xl font-black mt-1 ${darkMode ? "text-white" : "text-slate-900"}`}>{item.val}</p>
            </div>
          ))}
        </div>

        {/* Department Filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setFilter(dept)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === dept
                  ? "bg-cyan-600 text-white shadow"
                  : darkMode
                  ? "bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-700"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-cyan-400"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Staff Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow ${darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-100 text-cyan-700"}`}>
                  {item.name[0]}
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{item.name}</p>
                  <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {item.role} - {item.dept}
                  </p>
                  <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    {item.exp} experience · {item.shift} shift
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.attendance === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {item.attendance}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.salary === "Paid" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                    Salary: {item.salary}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}