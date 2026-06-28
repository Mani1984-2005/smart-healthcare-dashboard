// src/pages/ComplaintsPage.jsx
import { useState, useEffect } from "react";
import { getLS, setLS } from "../utils/localStorage";

export default function ComplaintsPage({ darkMode, addToast }) {
  const [complaints, setComplaints] = useState(() => getLS("complaints", []));
  const [form, setForm] = useState({ name: "", dept: "", subject: "", desc: "", priority: "Medium" });
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => { setLS("complaints", complaints); }, [complaints]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.subject || !form.desc) {
      addToast("Check details", "Fill all required complaint fields.", "error");
      return;
    }
    const newComplaint = {
      ...form,
      id: Date.now(),
      status: "Pending",
      date: new Date().toLocaleDateString(),
      ref: `CMP-${Date.now().toString().slice(-6)}`,
    };
    setComplaints((prev) => [newComplaint, ...prev]);
    setForm({ name: "", dept: "", subject: "", desc: "", priority: "Medium" });
    addToast("Complaint registered", `Reference: ${newComplaint.ref}`, "success");
  }

  const allDepts = ["All", ...new Set(complaints.map((c) => c.dept).filter(Boolean))];

  const filtered = complaints.filter((c) => {
    const matchSearch =
      search === "" ||
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.dept && c.dept.toLowerCase().includes(search.toLowerCase()));
    const matchDept = deptFilter === "All" || c.dept === deptFilter;
    const matchStatus = statusFilter === "All" || c.status === statusFilter;
    const matchDate = dateFilter === "" || c.date === new Date(dateFilter).toLocaleDateString();
    return matchSearch && matchDept && matchStatus && matchDate;
  });

  const analytics = [
    { label: "Total Complaints", value: complaints.length, color: "text-cyan-500", icon: "📋" },
    { label: "Pending", value: complaints.filter((c) => c.status === "Pending").length, color: "text-amber-500", icon: "⏳" },
    { label: "Resolved", value: complaints.filter((c) => c.status === "Resolved").length, color: "text-emerald-500", icon: "✅" },
    { label: "High Priority", value: complaints.filter((c) => c.priority === "High").length, color: "text-rose-500", icon: "🔴" },
  ];

  const priorityConfig = {
    High: { badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
    Medium: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    Low: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  };

  const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const inputBase = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-cyan-500 transition-all ${
    darkMode
      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
      : "bg-white border-slate-300 text-slate-900"
  }`;
  const labelClass = `block text-xs font-semibold mb-1 ${darkMode ? "text-slate-400" : "text-slate-600"}`;

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
            <span className="text-2xl">📣</span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Complaints & Feedback</h1>
              <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                We take every complaint seriously and aim to resolve all issues promptly.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analytics.map((s) => (
            <div key={s.label} className={`p-4 rounded-2xl border hover:-translate-y-0.5 transition-all ${card}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{s.icon}</span>
                <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
              </div>
              <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">

          {/* Complaint Form */}
          <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-sm ${card}`}>
            <h2 className={`font-bold text-base mb-1 ${darkMode ? "text-white" : "text-slate-900"}`}>
              Register Complaint
            </h2>
            <p className={`text-xs mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              All required fields are marked with *.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Your Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <input
                  type="text"
                  value={form.dept}
                  onChange={(e) => setForm({ ...form, dept: e.target.value })}
                  placeholder="e.g. OPD, ICU, Pharmacy"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelClass}>Subject *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Brief subject"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Low", "Medium", "High"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        form.priority === p
                          ? p === "High"
                            ? "bg-rose-600 text-white border-rose-600"
                            : p === "Medium"
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-emerald-600 text-white border-emerald-600"
                          : darkMode
                          ? "bg-slate-800 border-slate-700 text-slate-400"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      {p === "High" ? "🔴 " : p === "Medium" ? "🟡 " : "🟢 "}{p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Description *</label>
                <textarea
                  rows={4}
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  placeholder="Describe your complaint in detail..."
                  className={`${inputBase} resize-none`}
                />
              </div>
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl transition-all hover:shadow-lg text-sm"
              >
                Submit Complaint
              </button>
            </form>
          </div>

          {/* Complaint History */}
          <div className="lg:col-span-3 flex flex-col gap-4">

            {/* Filters */}
            <div className={`p-4 rounded-2xl border ${card} space-y-3`}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search complaints..."
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:border-cyan-500 transition-all ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Status:</span>
                {["All", "Pending", "Resolved"].map((val) => (
                  <FilterPill key={val} value={val} active={statusFilter === val} onClick={() => setStatusFilter(val)} />
                ))}
              </div>
              {allDepts.length > 1 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Dept:</span>
                  {allDepts.map((val) => (
                    <FilterPill key={val} value={val} active={deptFilter === val} onClick={() => setDeptFilter(val)} />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Date:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs outline-none focus:border-cyan-500 transition-all ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                  }`}
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter("")}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                {filtered.length} of {complaints.length} complaint{complaints.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Complaints List */}
            {complaints.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${card}`}>
                <span className="text-5xl mb-4">📭</span>
                <p className="font-bold text-lg">No complaints yet</p>
                <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Use the form to register your first complaint.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border ${card}`}>
                <span className="text-4xl mb-3">🔍</span>
                <p className="font-bold">No complaints match your filters</p>
                <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {filtered.map((item, index) => {
                  const priority = item.priority || "Medium";
                  const pConfig = priorityConfig[priority] || priorityConfig.Medium;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                        darkMode ? "bg-slate-900 border-slate-800 hover:border-cyan-800" : "bg-white border-slate-200 hover:border-cyan-200"
                      }`}
                    >
                      {/* Timeline indicator + content */}
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full mt-1 ${pConfig.dot}`} />
                          {index < filtered.length - 1 && (
                            <div className={`w-0.5 flex-1 mt-1 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <p className={`font-semibold text-sm leading-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                              {item.subject}
                            </p>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${pConfig.badge}`}>
                                {priority}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                item.status === "Resolved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                          <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            By {item.name}{item.dept ? ` · ${item.dept}` : ""}
                          </p>
                          <p className={`text-xs mt-1.5 leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                            {item.desc}
                          </p>
                          <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                            <span className={`text-xs font-mono font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                              {item.ref}
                            </span>
                            <span className={`text-slate-300 text-xs`}>·</span>
                            <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{item.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        {complaints.length > 0 && (
          <div className={`p-6 rounded-2xl border ${card}`}>
            <h2 className={`font-bold text-base mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>Complaint Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Resolution Rate */}
              <div className={`p-4 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Resolution Rate</p>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-black text-emerald-500">
                    {complaints.length > 0 ? Math.round((complaints.filter((c) => c.status === "Resolved").length / complaints.length) * 100) : 0}%
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full ${darkMode ? "bg-slate-700" : "bg-slate-200"}`}>
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${complaints.length > 0 ? (complaints.filter((c) => c.status === "Resolved").length / complaints.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Priority Breakdown */}
              <div className={`p-4 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Priority Breakdown</p>
                <div className="space-y-1.5">
                  {["High", "Medium", "Low"].map((p) => {
                    const count = complaints.filter((c) => (c.priority || "Medium") === p).length;
                    const pct = complaints.length > 0 ? (count / complaints.length) * 100 : 0;
                    const colors = { High: "bg-rose-500", Medium: "bg-amber-500", Low: "bg-emerald-500" };
                    return (
                      <div key={p} className="flex items-center gap-2">
                        <span className={`text-xs w-14 font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{p}</span>
                        <div className={`flex-1 h-1.5 rounded-full ${darkMode ? "bg-slate-700" : "bg-slate-200"}`}>
                          <div className={`h-1.5 rounded-full transition-all ${colors[p]}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs w-6 text-right font-bold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className={`p-4 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Overview</p>
                <div className="space-y-2">
                  {[
                    { label: "Total Submitted", value: complaints.length },
                    { label: "Awaiting Resolution", value: complaints.filter((c) => c.status === "Pending").length },
                    { label: "Departments Affected", value: new Set(complaints.map((c) => c.dept).filter(Boolean)).size },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{row.label}</span>
                      <span className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}