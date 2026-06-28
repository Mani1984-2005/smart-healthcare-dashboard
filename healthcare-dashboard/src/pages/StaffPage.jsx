// src/pages/StaffPage.jsx
import { useState } from "react";
import { STAFF } from "../data/staff";

export default function StaffPage({ darkMode }) {
  const [deptFilter, setDeptFilter] = useState("All");
  const [attendanceFilter, setAttendanceFilter] = useState("All");
  const [salaryFilter, setSalaryFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [search, setSearch] = useState("");

  const departments = ["All", ...new Set(STAFF.map((item) => item.dept))];
  const roles = ["All", ...new Set(STAFF.map((item) => item.role))];

  const filtered = STAFF.filter((item) => {
    const matchDept = deptFilter === "All" || item.dept === deptFilter;
    const matchAttendance = attendanceFilter === "All" || item.attendance === attendanceFilter;
    const matchSalary = salaryFilter === "All" || item.salary === salaryFilter;
    const matchRole = roleFilter === "All" || item.role === roleFilter;
    const matchSearch =
      search === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.role.toLowerCase().includes(search.toLowerCase()) ||
      item.dept.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchAttendance && matchSalary && matchRole && matchSearch;
  });

  const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";

  const stats = [
    { label: "Total Staff", value: STAFF.length, color: "text-cyan-500", icon: "👥" },
    { label: "Present Today", value: STAFF.filter((s) => s.attendance === "Present").length, color: "text-emerald-500", icon: "✅" },
    { label: "Absent", value: STAFF.filter((s) => s.attendance === "Absent").length, color: "text-rose-500", icon: "❌" },
    { label: "Salary Pending", value: STAFF.filter((s) => s.salary === "Pending").length, color: "text-amber-500", icon: "⏳" },
  ];

  const FilterPill = ({ value, active, onClick }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
        active
          ? "bg-cyan-600 text-white shadow"
          : darkMode
          ? "bg-slate-800 text-slate-300 border border-slate-700 hover:border-cyan-700"
          : "bg-white text-slate-600 border border-slate-200 hover:border-cyan-400"
      }`}
    >
      {value}
    </button>
  );

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"} py-8 px-4`}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page Header */}
        <div className={`p-6 rounded-2xl border ${card}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">👩‍⚕️</span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Staff Management</h1>
              <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Hospital staff directory, attendance tracking, and salary status overview.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={`p-4 rounded-2xl border hover:-translate-y-0.5 transition-all ${card}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{s.icon}</span>
                <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
              </div>
              <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className={`p-5 rounded-2xl border ${card} space-y-4`}>
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, or department..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:border-cyan-500 transition-all ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                  : "bg-white border-slate-300 text-slate-900"
              }`}
            />
          </div>

          {/* Department Filter */}
          <div>
            <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Department</p>
            <div className="flex gap-2 flex-wrap">
              {departments.map((dept) => (
                <FilterPill key={dept} value={dept} active={deptFilter === dept} onClick={() => setDeptFilter(dept)} />
              ))}
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Role</p>
            <div className="flex gap-2 flex-wrap">
              {roles.map((role) => (
                <FilterPill key={role} value={role} active={roleFilter === role} onClick={() => setRoleFilter(role)} />
              ))}
            </div>
          </div>

          {/* Attendance + Salary Filters */}
          <div className="flex flex-wrap gap-6">
            <div>
              <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Attendance</p>
              <div className="flex gap-2">
                {["All", "Present", "Absent"].map((val) => (
                  <FilterPill key={val} value={val} active={attendanceFilter === val} onClick={() => setAttendanceFilter(val)} />
                ))}
              </div>
            </div>
            <div>
              <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Salary Status</p>
              <div className="flex gap-2">
                {["All", "Paid", "Pending"].map((val) => (
                  <FilterPill key={val} value={val} active={salaryFilter === val} onClick={() => setSalaryFilter(val)} />
                ))}
              </div>
            </div>
          </div>

          <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            Showing {filtered.length} of {STAFF.length} staff members
          </p>
        </div>

        {/* Staff Cards */}
        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${card}`}>
            <span className="text-5xl mb-4">🔍</span>
            <p className="font-bold text-lg">No staff members found</p>
            <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  darkMode ? "bg-slate-900 border-slate-800 hover:border-cyan-800" : "bg-white border-slate-200 hover:border-cyan-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow flex-shrink-0 ${
                    darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-100 text-cyan-700"
                  }`}>
                    {item.name[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{item.name}</p>
                    <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {item.role} &mdash; {item.dept}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                        {item.exp} exp
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                        {item.shift} shift
                      </span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      item.attendance === "Present"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-600"
                    }`}>
                      {item.attendance === "Present" ? "✓ " : "✗ "}{item.attendance}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      item.salary === "Paid"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {item.salary === "Paid" ? "💳 " : "⏳ "}Salary {item.salary}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}