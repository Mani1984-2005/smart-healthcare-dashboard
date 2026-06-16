
// src/pages/ComplaintsPage.jsx
import { useState, useEffect } from "react";
import { getLS, setLS } from "../utils/localStorage";

export default function ComplaintsPage({ darkMode, addToast }) {
  const [complaints, setComplaints] = useState(() => getLS("complaints", []));
  const [form, setForm] = useState({ name: "", dept: "", subject: "", desc: "" });

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
    setForm({ name: "", dept: "", subject: "", desc: "" });
    addToast("Complaint registered", `Reference: ${newComplaint.ref}`, "success");
  }

  const inputClass = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-cyan-500 transition-all ${
    darkMode
      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
      : "bg-white border-slate-300"
  }`;

  const labelClass = `block text-xs font-medium mb-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
            Complaints & Feedback
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            We take every complaint seriously and respond as quickly as possible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Form */}
          <div className={`p-6 rounded-2xl border shadow-lg ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <h2 className={`font-bold text-lg mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>
              Register Complaint
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {[
                { label: "Your Name *", key: "name", placeholder: "Full name" },
                { label: "Department", key: "dept", placeholder: "e.g. OPD, ICU, Pharmacy" },
                { label: "Subject *", key: "subject", placeholder: "Brief subject" },
              ].map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  <input
                    type="text"
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                </div>
              ))}
              <div>
                <label className={labelClass}>Description *</label>
                <textarea
                  rows={4}
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  placeholder="Describe your complaint..."
                  className={`${inputClass} resize-none`}
                />
              </div>
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl transition-all hover:shadow-lg"
              >
                Submit Complaint
              </button>
            </form>
          </div>

          {/* History */}
          <div>
            <h2 className={`font-bold text-lg mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>
              Complaint History ({complaints.length})
            </h2>
            {complaints.length === 0 ? (
              <div className={`text-center py-12 rounded-2xl border ${
                darkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"
              }`}>
                No complaints registered
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                {complaints.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all hover:shadow ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className={`font-semibold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>
                        {item.subject}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.status === "Resolved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      By {item.name} {item.dept ? `· ${item.dept}` : ""}
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {item.desc}
                    </p>
                    <p className={`text-xs mt-2 font-mono ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      Ref: {item.ref} · {item.date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}