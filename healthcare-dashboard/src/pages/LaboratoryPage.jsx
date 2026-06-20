// FILE PATH: src/pages/LaboratoryPage.jsx
// Day 2 — Laboratory Module | MediCare Pro
// Features: Test requests, results entry, status tracking, search/filter, LocalStorage

import { useState, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "lab_tests";

const TEST_CATEGORIES = [
  "Blood Test",
  "Urine Test",
  "X-Ray",
  "MRI",
  "CT Scan",
  "ECG",
  "Ultrasound",
  "Biopsy",
  "Culture & Sensitivity",
  "Other",
];

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed", "Cancelled"];

const PRIORITY_OPTIONS = ["Routine", "Urgent", "Emergency"];

const emptyForm = {
  testId: "",
  patientName: "",
  patientId: "",
  testName: "",
  category: "",
  priority: "Routine",
  requestedBy: "",
  requestDate: "",
  resultDate: "",
  status: "Pending",
  result: "",
  notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return "LAB-" + Date.now().toString().slice(-6);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
  };

  return (
    <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg text-white shadow-lg flex items-center gap-3 ${colors[type] || "bg-gray-700"}`}>
      <span>{message}</span>
      <button onClick={onClose} className="font-bold text-xl leading-none">×</button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LaboratoryPage() {
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [toast, setToast] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // View result detail
  const [viewingTest, setViewingTest] = useState(null);

  // Load
  useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      setTests(JSON.parse(saved));
    } catch {
      setTests([]);
    }
  }
  setIsLoaded(true);
}, []);

useEffect(() => {
  if (isLoaded) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  }
}, [tests, isLoaded]);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openAddForm() {
    setForm({ ...emptyForm, testId: genId(), requestDate: today() });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(test) {
    setForm(test);
    setEditingId(test.testId);
    setShowForm(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function validate() {
    if (!form.patientName.trim()) return "Patient Name is required.";
    if (!form.testName.trim()) return "Test Name is required.";
    if (!form.category) return "Category is required.";
    if (!form.requestedBy.trim()) return "Requested By is required.";
    if (!form.requestDate) return "Request Date is required.";
    return null;
  }

  function handleSubmit() {
    const error = validate();
    if (error) { showToast(error, "error"); return; }

    if (editingId) {
      setTests((prev) => prev.map((t) => (t.testId === editingId ? { ...form } : t)));
      showToast("Test record updated.", "success");
    } else {
      setTests((prev) => [...prev, { ...form }]);
      showToast("Lab test added.", "success");
    }
    closeForm();
  }

  function handleDelete(testId) {
    if (!window.confirm("Delete this lab test record?")) return;
    setTests((prev) => prev.filter((t) => t.testId !== testId));
    showToast("Record deleted.", "warning");
  }

  // Quick status update inline
  function updateStatus(testId, newStatus) {
    setTests((prev) =>
      prev.map((t) =>
        t.testId === testId
          ? { ...t, status: newStatus, resultDate: newStatus === "Completed" ? today() : t.resultDate }
          : t
      )
    );
    showToast(`Status updated to ${newStatus}.`, "success");
  }

  const filtered = tests.filter((t) => {
    const term = search.toLowerCase();
    const matchSearch =
      t.patientName.toLowerCase().includes(term) ||
      t.testName.toLowerCase().includes(term) ||
      t.testId.toLowerCase().includes(term) ||
      t.requestedBy.toLowerCase().includes(term);
    const matchCat = filterCategory === "All" || t.category === filterCategory;
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchPriority = filterPriority === "All" || t.priority === filterPriority;
    return matchSearch && matchCat && matchStatus && matchPriority;
  });

  // Summary
  const pending = tests.filter((t) => t.status === "Pending").length;
  const inProgress = tests.filter((t) => t.status === "In Progress").length;
  const completed = tests.filter((t) => t.status === "Completed").length;
  const emergency = tests.filter((t) => t.priority === "Emergency").length;

  const statusColor = {
    Pending: "bg-yellow-100 text-yellow-700",
    "In Progress": "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-gray-100 text-gray-500",
  };

  const priorityColor = {
    Routine: "bg-gray-100 text-gray-600",
    Urgent: "bg-orange-100 text-orange-700",
    Emergency: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔬 Laboratory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage lab test requests and results.</p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition shadow"
        >
          + New Test Request
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending", value: pending, color: "yellow", icon: "⏳" },
          { label: "In Progress", value: inProgress, color: "blue", icon: "🔄" },
          { label: "Completed", value: completed, color: "green", icon: "✅" },
          { label: "Emergency", value: emergency, color: "red", icon: "🚨" },
        ].map((c) => (
          <SummaryCard key={c.label} {...c} />
        ))}
      </div>

      {/* Emergency Alert */}
      {emergency > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded mb-4 text-sm">
          🚨 {emergency} emergency test(s) require immediate attention!
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <input
          type="text"
          placeholder="Search patient, test, doctor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="All">All Categories</option>
          {TEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="All">All Priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Test ID</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Test</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Requested By</th>
              <th className="px-4 py-3">Request Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  No lab tests found. Click "+ New Test Request" to add one.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.testId} className={t.priority === "Emergency" ? "bg-red-50" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{t.testId}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{t.patientName}</p>
                    <p className="text-xs text-gray-400">{t.patientId}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700">{t.testName}</td>
                  <td className="px-4 py-3 text-gray-600">{t.category}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityColor[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">Dr. {t.requestedBy}</td>
                  <td className="px-4 py-3 text-gray-500">{t.requestDate}</td>
                  <td className="px-4 py-3">
                    {/* Inline status dropdown */}
                    <select
                      value={t.status}
                      onChange={(e) => updateStatus(t.testId, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${statusColor[t.status]}`}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setViewingTest(t)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium border border-indigo-200 hover:border-indigo-400 px-2 py-1 rounded transition">
                        View
                      </button>
                      <button onClick={() => openEditForm(t)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-2 py-1 rounded transition">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(t.testId)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-200 px-2 py-1 rounded transition">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t">
            Showing {filtered.length} of {tests.length} test(s)
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={closeForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? "✏️ Edit Lab Test" : "➕ New Test Request"}
              </h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabeledField label="Test ID" name="testId" value={form.testId} disabled />
              <LabeledField label="Patient Name *" name="patientName" value={form.patientName} onChange={handleChange} placeholder="Full name" />
              <LabeledField label="Patient ID" name="patientId" value={form.patientId} onChange={handleChange} placeholder="e.g. PAT-001" />
              <LabeledField label="Test Name *" name="testName" value={form.testName} onChange={handleChange} placeholder="e.g. Complete Blood Count" />
              <LabeledSelect label="Category *" name="category" value={form.category} onChange={handleChange} options={TEST_CATEGORIES} placeholder="Select category…" />
              <LabeledSelect label="Priority" name="priority" value={form.priority} onChange={handleChange} options={PRIORITY_OPTIONS} />
              <LabeledField label="Requested By (Doctor) *" name="requestedBy" value={form.requestedBy} onChange={handleChange} placeholder="Doctor name" />
              <LabeledField label="Request Date *" name="requestDate" value={form.requestDate} onChange={handleChange} type="date" />
              <LabeledField label="Result Date" name="resultDate" value={form.resultDate} onChange={handleChange} type="date" />
              <LabeledSelect label="Status" name="status" value={form.status} onChange={handleChange} options={STATUS_OPTIONS} />
              {/* Result & Notes span full width */}
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Result</label>
                <textarea name="result" value={form.result} onChange={handleChange}
                  placeholder="Enter test result here…" rows={3}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange}
                  placeholder="Any additional notes…" rows={2}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={closeForm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition">Cancel</button>
              <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow">
                {editingId ? "Save Changes" : "Add Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Result Modal */}
      {viewingTest && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewingTest(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">🧾 Test Result</h2>
              <button onClick={() => setViewingTest(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-3 text-sm">
              {[
                ["Test ID", viewingTest.testId],
                ["Patient", viewingTest.patientName],
                ["Test", viewingTest.testName],
                ["Category", viewingTest.category],
                ["Priority", viewingTest.priority],
                ["Requested By", `Dr. ${viewingTest.requestedBy}`],
                ["Request Date", viewingTest.requestDate],
                ["Result Date", viewingTest.resultDate || "—"],
                ["Status", viewingTest.status],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 font-medium">{k}</span>
                  <span className="text-gray-800 text-right max-w-[60%]">{v}</span>
                </div>
              ))}
              <div>
                <p className="text-gray-500 font-medium mb-1">Result</p>
                <p className="bg-gray-50 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">
                  {viewingTest.result || "No result entered yet."}
                </p>
              </div>
              {viewingTest.notes && (
                <div>
                  <p className="text-gray-500 font-medium mb-1">Notes</p>
                  <p className="bg-gray-50 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">{viewingTest.notes}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t text-right">
              <button onClick={() => setViewingTest(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Shared small components ──────────────────────────────────────────────────

function SummaryCard({ label, value, color, icon }) {
  const colorMap = {
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorMap[color]}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
}

function LabeledField({ label, name, value, onChange, type = "text", placeholder, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""}`} />
    </div>
  );
}

function LabeledSelect({ label, name, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select name={name} value={value} onChange={onChange}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}