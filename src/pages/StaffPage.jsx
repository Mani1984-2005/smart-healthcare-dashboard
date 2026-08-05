import { useState } from "react";
import { STAFF } from "../data/staff";
import { StatCard, StatusBadge, PageHeader, SearchInput } from "../components/ui";

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
    const matchSearch = search === "" || item.name.toLowerCase().includes(search.toLowerCase()) || item.role.toLowerCase().includes(search.toLowerCase()) || item.dept.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchAttendance && matchSalary && matchRole && matchSearch;
  });

  const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";

  const FilterPill = ({ value, active, onClick }) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${active ? "bg-indigo-600 text-white shadow" : darkMode ? "bg-slate-800 text-slate-300 border border-slate-700 hover:border-indigo-700" : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-400"}`}>{value}</button>
  );

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"} py-8 px-4`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader title="Staff Management" subtitle="Hospital staff directory, attendance tracking, and salary status overview" icon="staff" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Staff" value={STAFF.length} icon="users" color="indigo" />
          <StatCard label="Present Today" value={STAFF.filter((s) => s.attendance === "Present").length} icon="check" color="emerald" />
          <StatCard label="Absent" value={STAFF.filter((s) => s.attendance === "Absent").length} icon="x" color="rose" />
          <StatCard label="Salary Pending" value={STAFF.filter((s) => s.salary === "Pending").length} icon="clock" color="amber" />
        </div>

        <div className={`p-5 rounded-2xl border ${card} space-y-4`}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, role, or department..." />
          <div>
            <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Department</p>
            <div className="flex gap-2 flex-wrap">
              {departments.map((dept) => <FilterPill key={dept} value={dept} active={deptFilter === dept} onClick={() => setDeptFilter(dept)} />)}
            </div>
          </div>
          <div>
            <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Role</p>
            <div className="flex gap-2 flex-wrap">
              {roles.map((role) => <FilterPill key={role} value={role} active={roleFilter === role} onClick={() => setRoleFilter(role)} />)}
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Attendance</p>
              <div className="flex gap-2">
                {["All", "Present", "Absent"].map((val) => <FilterPill key={val} value={val} active={attendanceFilter === val} onClick={() => setAttendanceFilter(val)} />)}
              </div>
            </div>
            <div>
              <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Salary Status</p>
              <div className="flex gap-2">
                {["All", "Paid", "Pending"].map((val) => <FilterPill key={val} value={val} active={salaryFilter === val} onClick={() => setSalaryFilter(val)} />)}
              </div>
            </div>
          </div>
          <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Showing {filtered.length} of {STAFF.length} staff members</p>
        </div>

        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${card}`}>
            <span className="text-5xl mb-4">🔍</span>
            <p className="font-bold text-lg">No staff members found</p>
            <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className={`p-5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${darkMode ? "bg-slate-900 border-slate-800 hover:border-indigo-800" : "bg-white border-slate-200 hover:border-indigo-300"}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow flex-shrink-0 ${darkMode ? "bg-indigo-950 text-indigo-300" : "bg-indigo-100 text-indigo-700"}`}>
                    {item.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{item.name}</p>
                    <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{item.role} &mdash; {item.dept}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{item.exp} exp</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{item.shift} shift</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <StatusBadge status={item.attendance} />
                    <StatusBadge status={item.salary === "Paid" ? "Paid" : "Pending"} />
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
