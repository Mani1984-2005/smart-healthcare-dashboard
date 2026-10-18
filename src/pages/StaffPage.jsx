import { useState } from "react";
import { STAFF } from "../data/staff";
import { StatCard, StatusBadge, ActionButton, SearchInput } from "../components/ui";

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

  const card = darkMode ? "bg-slate-900/90 border-slate-800 text-white" : "bg-white/90 border-slate-200 text-slate-900";

  const FilterPill = ({ value, active, onClick }) => (
    <button onClick={onClick} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
      active 
        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md" 
        : darkMode 
          ? "bg-slate-800 text-slate-300 border border-slate-700 hover:border-cyan-500" 
          : "bg-slate-100 text-slate-700 border border-slate-200 hover:border-cyan-400"
    }`}>{value}</button>
  );

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Gorgeous Photographic Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-xl">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay z-0"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1600&q=80')` }}
        />
        <div className="w-full relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
              👩‍⚕️ MediCare Pro Staff & Personnel Directory
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Hospital Staff Directory & Payroll
            </h1>
            <p className="text-blue-100 text-sm sm:text-base mt-2 max-w-2xl font-normal">
              Manage clinical personnel, attendance tracking, shift scheduling, and salary payroll overview.
            </p>
          </div>
          <div className="shrink-0">
            <ActionButton 
              icon={() => "📥"} 
              label="Export Directory" 
              variant="secondary" 
              onClick={() => alert("Staff directory exported successfully!")} 
            />
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Staff" value={STAFF.length} icon="👥" color="indigo" darkMode={darkMode} />
          <StatCard label="Present Today" value={STAFF.filter((s) => s.attendance === "Present").length} icon="✓" color="emerald" darkMode={darkMode} />
          <StatCard label="Absent" value={STAFF.filter((s) => s.attendance === "Absent").length} icon="✕" color="rose" darkMode={darkMode} />
          <StatCard label="Salary Pending" value={STAFF.filter((s) => s.salary === "Pending").length} icon="⏱" color="amber" darkMode={darkMode} />
        </div>

        <div className={`p-6 rounded-2xl border ${card} shadow-sm backdrop-blur-xl space-y-5`}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, role, or department..." darkMode={darkMode} />
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Department</p>
            <div className="flex gap-2 flex-wrap">
              {departments.map((dept) => <FilterPill key={dept} value={dept} active={deptFilter === dept} onClick={() => setDeptFilter(dept)} />)}
            </div>
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Role</p>
            <div className="flex gap-2 flex-wrap">
              {roles.map((role) => <FilterPill key={role} value={role} active={roleFilter === role} onClick={() => setRoleFilter(role)} />)}
            </div>
          </div>
          <div className="flex flex-wrap gap-8 pt-2 border-t border-slate-200/50">
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Attendance</p>
              <div className="flex gap-2">
                {["All", "Present", "Absent"].map((val) => <FilterPill key={val} value={val} active={attendanceFilter === val} onClick={() => setAttendanceFilter(val)} />)}
              </div>
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Salary Status</p>
              <div className="flex gap-2">
                {["All", "Paid", "Pending"].map((val) => <FilterPill key={val} value={val} active={salaryFilter === val} onClick={() => setSalaryFilter(val)} />)}
              </div>
            </div>
          </div>
          <p className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Showing {filtered.length} of {STAFF.length} staff members</p>
        </div>

        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${card}`}>
            <span className="text-5xl mb-4">🔍</span>
            <p className="font-bold text-lg">No staff members found</p>
            <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((item) => (
              <div key={item.id} className={`p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-xl ${card}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-md flex-shrink-0 ${darkMode ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-cyan-100 text-cyan-700"}`}>
                    {item.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base">{item.name}</p>
                    <p className={`text-xs font-medium mt-0.5 ${darkMode ? "text-cyan-400" : "text-cyan-600"}`}>{item.role} &mdash; {item.dept}</p>
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{item.exp} exp</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{item.shift} shift</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
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
