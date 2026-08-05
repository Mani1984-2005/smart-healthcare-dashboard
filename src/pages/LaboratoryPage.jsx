import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LAB_MASTER_LIBRARY, TEST_CATEGORIES, STATUS_OPTIONS, PRIORITY_OPTIONS,
  STORAGE_KEY, PATIENTS_KEY, statusTableBadgeClass, judgeTestResult, judgeLabResult,
  computeTrend, isAbnormal, generateProfileSummary, statusBadgeClass,
} from "../data/labMasterLibrary";
import { downloadLabReportPDF } from "../utils/labPDF";
import { StatCard, PageHeader, SearchInput, StatusBadge, DataTable, ActionButton } from "../components/ui";

function TrendBadge({ trend }) {
  if (!trend) return <span className="text-xs text-gray-400">&mdash;</span>;
  const { direction, percentChange } = trend;
  const icon = direction === "up" ? "\u2191" : direction === "down" ? "\u2193" : "\u2192";
  const cls  = direction === "up" ? "text-red-600" : direction === "down" ? "text-blue-600" : "text-gray-500";
  return <span className={`text-xs font-bold ${cls}`} title={`${trend.difference} (${percentChange}%)`}>{icon} {percentChange}%</span>;
}

function CriticalAlertBanner({ profileResults }) {
  const criticals = Object.entries(profileResults || {}).filter(([, r]) => r?.status === "Critical Low" || r?.status === "Critical High");
  if (!criticals.length) return null;
  return (
    <div className="bg-red-700 text-white rounded-xl p-4 mb-4 flex items-start gap-3 shadow-lg border-2 border-red-400">
      <span className="text-2xl mt-0.5">&#x1F6A8;</span>
      <div className="flex-1">
        <p className="font-bold text-base">CRITICAL LABORATORY ALERT &mdash; Immediate Physician Notification Required</p>
        <ul className="mt-2 text-sm space-y-1 list-disc list-inside">
          {criticals.map(([testName, r]) => (
            <li key={testName}><strong>{testName}:</strong> {r.value} {r.unit} &mdash; {r.status} (Reference: {r.referenceRange})</li>
          ))}
        </ul>
        <div className="mt-3 text-xs bg-red-800/50 rounded-lg p-2 space-y-0.5">
          <p>Verify sample integrity and patient identity before reporting.</p>
          <p>Consider repeat testing if result is clinically discordant.</p>
          <p>Notify attending physician immediately. Document notification time.</p>
        </div>
      </div>
    </div>
  );
}

function ProfileResultsTable({ profileResults, profileKey, previousResults = {} }) {
  if (!profileResults || !Object.keys(profileResults).length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-indigo-50 text-indigo-800 text-xs uppercase">
          <tr>
            <th className="px-3 py-2.5 text-left">Test</th>
            <th className="px-3 py-2.5 text-right">Value</th>
            <th className="px-3 py-2.5 text-center">Unit</th>
            <th className="px-3 py-2.5 text-center">Status</th>
            <th className="px-3 py-2.5 text-left">Reference Range</th>
            <th className="px-3 py-2.5 text-center">Prev</th>
            <th className="px-3 py-2.5 text-center">Trend</th>
            <th className="px-3 py-2.5 text-left">Interpretation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Object.entries(profileResults).map(([testName, result]) => {
            const prev  = previousResults[testName];
            const trend = prev?.value != null ? computeTrend(result?.value, prev.value) : null;
            const cls   = result?.status?.startsWith("Critical") ? "bg-red-50" : isAbnormal(result) ? "bg-yellow-50/40" : "hover:bg-slate-50";
            return (
              <tr key={testName} className={cls}>
                <td className="px-3 py-2 font-medium text-slate-800 text-xs">{LAB_MASTER_LIBRARY[profileKey]?.tests?.[testName]?.professionalName || testName}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">{result?.value ?? <>&mdash;</>}</td>
                <td className="px-3 py-2 text-center text-slate-500 text-xs">{result?.unit || <>&mdash;</>}</td>
                <td className="px-3 py-2 text-center"><StatusBadge status={result?.status || "Manual Review"} /></td>
                <td className="px-3 py-2 text-xs text-slate-500">{result?.referenceRange || <>&mdash;</>}</td>
                <td className="px-3 py-2 text-center text-xs text-slate-400">{prev?.value ?? <>&mdash;</>}</td>
                <td className="px-3 py-2 text-center"><TrendBadge trend={trend} /></td>
                <td className="px-3 py-2 text-xs text-slate-600 max-w-[180px]">{result?.interpretation || <>&mdash;</>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LabSummaryPanel({ profileKey, profileResults, previousResults = {} }) {
  const summary = useMemo(() => generateProfileSummary(profileKey, profileResults, previousResults), [profileKey, profileResults, previousResults]);
  if (!summary.lines.length) return null;
  return (
    <div className={`rounded-xl border p-4 mt-4 ${summary.hasCritical ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
      <p className={`font-bold text-sm mb-3 ${summary.hasCritical ? "text-red-800" : "text-blue-800"}`}>
        Laboratory Summary &mdash; {profileKey}
      </p>
      <ul className="space-y-1.5 mb-3">
        {summary.lines.map(({ testName, text, status }) => (
          <li key={testName} className={`text-xs flex items-start gap-1.5 ${
            status === "Within Normal Limits" || status === "Normal" ? "text-green-700"
            : (status === "Critical Low" || status === "Critical High") ? "text-red-700 font-semibold" : "text-amber-700"}`}>
            <span>{(status === "Within Normal Limits" || status === "Normal") ? "\u2705" : (status === "Critical Low" || status === "Critical High") ? "\uD83D\uDEA8" : "\u26A0\uFE0F"}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
      {summary.clinicalPatterns.length > 0 && (
        <div className="border-t border-blue-200 pt-3 mt-2 mb-3">
          <p className="text-xs font-bold text-indigo-800 mb-2">Clinical Pattern Recognition</p>
          <ul className="space-y-2">
            {summary.clinicalPatterns.map(({ id, pattern }) => (
              <li key={id} className="text-xs bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-indigo-800">{pattern}</li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 italic mt-1">Clinical correlation is recommended for all pattern-based interpretations.</p>
        </div>
      )}
      <div className={`border-t pt-2 text-xs font-semibold ${summary.hasCritical ? "border-red-200 text-red-800" : "border-blue-200 text-blue-800"}`}>
        Overall Impression: {summary.overallImpression}
      </div>
      <p className="text-xs text-gray-400 mt-1 italic">This report is system-assisted and must be reviewed by a qualified medical professional before any clinical decision.</p>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: "bg-emerald-600", error: "bg-red-600", warning: "bg-amber-500" };
  return (
    <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-white shadow-xl flex items-center gap-3 ${colors[type] || "bg-gray-700"}`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="font-bold text-xl leading-none opacity-80 hover:opacity-100">&times;</button>
    </div>
  );
}

const emptyForm = {
  testId: "", patientName: "", patientId: "", patientGender: "", patientAge: "",
  testName: "", category: "", priority: "Routine", requestedBy: "", requestDate: "",
  resultDate: "", status: "Pending", result: "", profileResults: {}, resultStatus: "",
  referenceRange: "", interpretation: "", notes: "", previousReportId: "",
  previousProfileResults: {}, aiClinicalNotes: null, aiDifferentialSuggestions: [],
  aiRiskPrediction: null, aiComparisonSummary: null, labTechnicianName: "",
  verifyingDoctor: "", sampleType: "", sampleBarcode: "", sampleCollectedAt: "",
  sampleReceivedAt: "", sampleProcessedAt: "", attachments: [],
};

function genId() { return "LAB-" + Date.now().toString().slice(-6); }
function today() { return new Date().toISOString().split("T")[0]; }

function readArrayFromStorage(key) {
  try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; } catch { return []; }
}
function dispatchPatientsUpdate() { window.dispatchEvent(new Event("patientsUpdated")); }

export default function LaboratoryPage() {
  const [tests, setTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [toast, setToast] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewingTest, setViewingTest] = useState(null);

  useEffect(() => { setTests(readArrayFromStorage(STORAGE_KEY)); setPatients(readArrayFromStorage(PATIENTS_KEY)); setIsLoaded(true); }, []);
  useEffect(() => {
    const load = () => setPatients(readArrayFromStorage(PATIENTS_KEY));
    window.addEventListener("patientsUpdated", load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener("patientsUpdated", load); window.removeEventListener("storage", load); };
  }, []);
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(tests)); }, [tests, isLoaded]);

  const showToast = useCallback((message, type = "success") => setToast({ message, type }), []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "result") {
        const j = judgeLabResult(updated.testName, value);
        updated.resultStatus = j.status; updated.referenceRange = j.referenceRange; updated.interpretation = j.interpretation;
      }
      if (name === "testName") { updated.profileResults = {}; updated.result = ""; updated.resultStatus = ""; updated.referenceRange = ""; updated.interpretation = ""; }
      return updated;
    });
  }

  function handleProfileResultChange(profileKey, testName, value) {
    const judgement = judgeTestResult(profileKey, testName, value, form.patientGender);
    setForm((prev) => ({
      ...prev,
      profileResults: { ...prev.profileResults, [testName]: { value, unit: judgement.unit, status: judgement.status, referenceRange: judgement.referenceRange, interpretation: judgement.interpretation, isCritical: judgement.isCritical } },
    }));
  }

  function openAddForm() { setForm({ ...emptyForm, testId: genId(), requestDate: today() }); setEditingId(null); setShowForm(true); }
  function openEditForm(test) { setForm({ ...emptyForm, ...test }); setEditingId(test.testId); setShowForm(true); }
  function closeForm() { setForm(emptyForm); setEditingId(null); setShowForm(false); }

  function validate() {
    if (!form.patientId) return "Please select a patient.";
    if (!form.patientName.trim()) return "Patient Name is required.";
    if (!form.testName.trim()) return "Test Name is required.";
    if (!form.category) return "Category is required.";
    if (!form.requestedBy.trim()) return "Requested By is required.";
    if (!form.requestDate) return "Request Date is required.";
    return null;
  }

  function syncLabEventToPatientTimeline(test) {
    const savedPatients = readArrayFromStorage(PATIENTS_KEY);
    const updatedPatients = savedPatients.map((patient) => {
      const isSame = patient.id === test.patientId || patient.name?.toLowerCase() === test.patientName?.toLowerCase();
      if (!isSame) return patient;
      const timeline = patient.timeline || [];
      const ev = { id: `TL-${test.testId}`, labTestId: test.testId, date: test.resultDate || test.requestDate || today(), type: "Lab Test", title: `${test.testName} - ${test.status}`, details: `Lab test ${test.testId} \u2014 ${test.category}. Priority: ${test.priority}. Status: ${test.status}.` };
      const exists = timeline.some((e) => e.labTestId === test.testId || e.id === `TL-${test.testId}`);
      return { ...patient, status: test.status === "Completed" ? patient.status : "Lab Test", timeline: exists ? timeline.map((e) => e.labTestId === test.testId || e.id === `TL-${test.testId}` ? { ...e, ...ev } : e) : [...timeline, ev] };
    });
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(updatedPatients));
    setPatients(updatedPatients);
    dispatchPatientsUpdate();
  }

  function handleSubmit() {
    const error = validate();
    if (error) { showToast(error, "error"); return; }
    const savedTest = { ...form, resultDate: form.status === "Completed" && !form.resultDate ? today() : form.resultDate };
    if (editingId) { setTests((prev) => prev.map((t) => (t.testId === editingId ? savedTest : t))); } else { setTests((prev) => [savedTest, ...prev]); }
    syncLabEventToPatientTimeline(savedTest);
    showToast(editingId ? "Lab test updated and patient timeline synced." : "Lab test added and patient timeline synced.", "success");
    closeForm();
  }

  function handleDelete(testId) {
    if (!window.confirm("Delete this lab test record?")) return;
    setTests((prev) => prev.filter((t) => t.testId !== testId));
    showToast("Record deleted.", "warning");
  }

  function updateStatus(testId, newStatus) {
    setTests((prev) => prev.map((test) => {
      if (test.testId !== testId) return test;
      const updated = { ...test, status: newStatus, resultDate: newStatus === "Completed" ? today() : test.resultDate };
      syncLabEventToPatientTimeline(updated);
      return updated;
    }));
    showToast(`Status updated to ${newStatus}.`, "success");
  }

  const filtered = useMemo(() => tests.filter((test) => {
    const term = search.toLowerCase();
    return (test.patientName?.toLowerCase().includes(term) || test.testName?.toLowerCase().includes(term) || test.testId?.toLowerCase().includes(term) || test.requestedBy?.toLowerCase().includes(term)) && (filterCategory === "All" || test.category === filterCategory) && (filterStatus === "All" || test.status === filterStatus) && (filterPriority === "All" || test.priority === filterPriority);
  }), [tests, search, filterCategory, filterStatus, filterPriority]);

  const stats = useMemo(() => ({
    pending: tests.filter((t) => t.status === "Pending").length,
    inProgress: tests.filter((t) => t.status === "In Progress").length,
    completed: tests.filter((t) => t.status === "Completed").length,
    emergency: tests.filter((t) => t.priority === "Emergency").length,
    critical: tests.filter((t) => t.profileResults && Object.values(t.profileResults).some((r) => r?.isCritical)).length,
  }), [tests]);

  const activeProfileDef = LAB_MASTER_LIBRARY[form.testName];
  const formHasCritical = useMemo(() => Object.values(form.profileResults || {}).some((r) => r?.isCritical), [form.profileResults]);

  const statusColor = { Pending: "bg-yellow-100 text-yellow-700", "In Progress": "bg-blue-100 text-blue-700", Completed: "bg-green-100 text-green-700", Cancelled: "bg-gray-100 text-gray-500" };
  const priorityColor = { Routine: "bg-gray-100 text-gray-600", Urgent: "bg-orange-100 text-orange-700", Emergency: "bg-red-100 text-red-700" };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Laboratory Information System"
          subtitle="Professional diagnostics, test requests, results & clinical analysis"
          icon="&#x1F52C;"
          actions={<ActionButton onClick={openAddForm} label="New Test Request" variant="primary" size="md" />}
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard label="Pending" value={stats.pending} icon="hourglass" color="yellow" />
          <StatCard label="In Progress" value={stats.inProgress} icon="sync" color="blue" />
          <StatCard label="Completed" value={stats.completed} icon="check" color="emerald" />
          <StatCard label="Emergency" value={stats.emergency} icon="alert" color="rose" />
          <StatCard label="Critical" value={stats.critical} icon="warning" color="rose" />
        </div>

        {stats.emergency > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg mb-3 text-sm flex items-center gap-2">
            <strong className="text-base">&#x1F6A8;</strong> <strong>{stats.emergency} emergency test(s)</strong> require immediate attention!
          </div>
        )}
        {stats.critical > 0 && (
          <div className="bg-red-100 border-l-4 border-red-700 text-red-900 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <strong>&#x26A0;&#xFE0F;</strong> <strong>{stats.critical} test(s)</strong> have CRITICAL values &mdash; immediate physician notification required!
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Search patient, test, doctor..." />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
            <option value="All">All Categories</option>
            {TEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
            <option value="All">All Priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Test ID</th>
                  <th className="px-4 py-3.5 font-semibold">Patient</th>
                  <th className="px-4 py-3.5 font-semibold">Profile</th>
                  <th className="px-4 py-3.5 font-semibold">Category</th>
                  <th className="px-4 py-3.5 font-semibold">Priority</th>
                  <th className="px-4 py-3.5 font-semibold">Doctor</th>
                  <th className="px-4 py-3.5 font-semibold">Date</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Critical</th>
                  <th className="px-4 py-3.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">No lab tests found. Click "New Test Request" to add one.</td></tr>
                ) : (
                  filtered.map((test) => {
                    const hasCrit = test.profileResults && Object.values(test.profileResults).some((r) => r?.isCritical);
                    return (
                      <tr key={test.testId} className={`${hasCrit ? "bg-red-50" : test.priority === "Emergency" ? "bg-orange-50" : "hover:bg-slate-50"} transition-colors`}>
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{test.testId}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{test.patientName}</p>
                          <p className="text-xs text-slate-400">{test.patientId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {LAB_MASTER_LIBRARY[test.testName] && <span className="text-base">{LAB_MASTER_LIBRARY[test.testName].icon}</span>}
                            <span className="font-medium text-slate-700">{test.testName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{test.category}</td>
                        <td className="px-4 py-3"><StatusBadge status={test.priority} /></td>
                        <td className="px-4 py-3 text-slate-600 text-sm">Dr. {test.requestedBy}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{test.requestDate}</td>
                        <td className="px-4 py-3">
                          <select value={test.status} onChange={(e) => updateStatus(test.testId, e.target.value)} className={`px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${statusColor[test.status]}`}>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">{hasCrit && <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">Crit</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <ActionButton onClick={() => setViewingTest(test)} label="View" variant="ghost" size="sm" />
                            <ActionButton onClick={() => openEditForm(test)} label="Edit" variant="ghost" size="sm" />
                            <ActionButton onClick={() => downloadLabReportPDF(test)} label="PDF" variant="ghost" size="sm" />
                            <ActionButton onClick={() => handleDelete(test.testId)} label="Delete" variant="ghost" size="sm" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && <div className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100 bg-slate-50/50">Showing {filtered.length} of {tests.length} test(s)</div>}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={closeForm}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-t-2xl">
                <h2 className="text-lg font-bold text-white">{editingId ? "Edit Lab Test" : "New Test Request"}</h2>
                <button onClick={closeForm} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Test ID</label>
                  <input type="text" value={form.testId} disabled className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-100 cursor-not-allowed text-slate-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Patient *</label>
                  <select value={form.patientId} onChange={(e) => {
                    const patient = patients.find((p) => p.id === e.target.value);
                    setForm((prev) => ({ ...prev, patientId: patient?.id || "", patientName: patient?.name || "", patientGender: patient?.gender || "", patientAge: patient?.age || "" }));
                  }} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Select Patient</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.id} \u2013 {p.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Patient ID</label>
                  <input type="text" value={form.patientId} disabled className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-100 cursor-not-allowed text-slate-500" />
                </div>
                {form.patientGender && (
                  <div className="sm:col-span-2 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs text-indigo-700 flex gap-4">
                    <span>Gender: <strong>{form.patientGender}</strong></span>
                    {form.patientAge && <span>Age: <strong>{form.patientAge} yrs</strong></span>}
                    <span className="text-indigo-500 italic">(Gender-specific reference ranges will be applied where available)</span>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Lab Profile *</label>
                  <select name="testName" value={form.testName} onChange={handleChange} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Select Lab Profile...</option>
                    {Object.entries(LAB_MASTER_LIBRARY).map(([key, def]) => <option key={key} value={key}>{def.icon} {def.label}</option>)}
                  </select>
                </div>
                {activeProfileDef && (
                  <div className="sm:col-span-2 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-start gap-3">
                    <span className="text-2xl">{activeProfileDef.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-indigo-800">{activeProfileDef.label}</p>
                      <p className="text-xs text-indigo-600 mt-0.5">Sample: {activeProfileDef.sampleType}</p>
                      <p className="text-xs text-indigo-500 mt-1">Tests included: {Object.keys(activeProfileDef.tests).join(", ")}</p>
                    </div>
                  </div>
                )}
                {formHasCritical && <div className="sm:col-span-2"><CriticalAlertBanner profileResults={form.profileResults} /></div>}
                {activeProfileDef && (
                  <div className="sm:col-span-2">
                    <h3 className="font-semibold text-slate-800 mb-3">Enter Test Values</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(activeProfileDef.tests).map(([testName, refDef]) => {
                        const result = form.profileResults?.[testName] || {};
                        const badgeClass = statusBadgeClass[result.status] || "bg-gray-100 text-gray-600";
                        return (
                          <div key={testName} className={`rounded-xl border p-3 ${result.status?.startsWith("Critical") ? "bg-red-50 border-red-300" : isAbnormal(result) ? "bg-yellow-50 border-yellow-200" : "bg-slate-50 border-slate-200"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-semibold text-slate-700 leading-tight">{refDef.professionalName || testName}</label>
                              <span className="text-xs text-slate-400">{refDef.unit || ""}</span>
                            </div>
                            <input type="number" value={result.value || ""} onChange={(e) => handleProfileResultChange(form.testName, testName, e.target.value)} placeholder={`${refDef.min}\u2013${refDef.max === 999 ? "+" : refDef.max} ${refDef.unit || ""}`} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                            {result.status && (
                              <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>{result.status}</span>
                                <span className="text-xs text-slate-400">Ref: {result.referenceRange || <>&mdash;</>}</span>
                              </div>
                            )}
                            {result.interpretation && result.status !== "Within Normal Limits" && result.status !== "Normal" && <p className="mt-1 text-xs text-slate-500 italic">{result.interpretation}</p>}
                          </div>
                        );
                      })}
                    </div>
                    <LabSummaryPanel profileKey={form.testName} profileResults={form.profileResults} previousResults={form.previousProfileResults} />
                  </div>
                )}
                {!activeProfileDef && (
                  <div className="sm:col-span-2 flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">Result Value</label>
                    <input type="number" name="result" value={form.result} onChange={handleChange} placeholder="Enter numeric value" className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    {form.result !== "" && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">Auto Result:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${form.resultStatus === "Within Normal Limits" || form.resultStatus === "Normal" ? "bg-green-600" : form.resultStatus.includes("Decreased") ? "bg-yellow-500" : form.resultStatus.includes("Critical") ? "bg-red-600" : "bg-orange-500"}`}>{form.resultStatus}</span>
                        </div>
                        <p className="text-sm"><strong>Reference:</strong> {form.referenceRange}</p>
                        <p className="text-sm mt-1"><strong>Interpretation:</strong> {form.interpretation}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Category *</label>
                  <select name="category" value={form.category} onChange={handleChange} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Select category...</option>
                    {TEST_CATEGORIES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Priority</label>
                  <select name="priority" value={form.priority} onChange={handleChange} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {PRIORITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Requested By (Doctor) *</label>
                  <input type="text" name="requestedBy" value={form.requestedBy} onChange={handleChange} placeholder="Doctor name" className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Request Date *</label>
                  <input type="date" name="requestDate" value={form.requestDate} onChange={handleChange} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Result Date</label>
                  <input type="date" name="resultDate" value={form.resultDate} onChange={handleChange} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Doctor Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Any additional notes or clinical observations..." rows={3} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
                <ActionButton onClick={closeForm} label="Cancel" variant="default" size="md" />
                <ActionButton onClick={handleSubmit} label={editingId ? "Save Changes" : "Add Test"} variant="primary" size="md" />
              </div>
            </div>
          </div>
        )}

        {viewingTest && (
          <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewingTest(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-700 to-indigo-500 rounded-t-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white">Laboratory Result Report</h2>
                  <p className="text-indigo-200 text-xs mt-0.5">{viewingTest.testId} &mdash; {viewingTest.testName} &mdash; Generated: {new Date().toLocaleString("en-IN", { hour12:true, day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}</p>
                </div>
                <button onClick={() => setViewingTest(null)} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
              </div>
              <div className="px-6 py-5 space-y-6">
                <CriticalAlertBanner profileResults={viewingTest.profileResults} />
                <section>
                  <SectionHeading icon="&#x1F464;" title="Patient Details" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {[["Report ID", viewingTest.testId],["Patient Name", viewingTest.patientName],["Patient ID", viewingTest.patientId || "\u2014"],["Gender", viewingTest.patientGender || "\u2014"],["Profile", viewingTest.testName],["Category", viewingTest.category],["Priority", viewingTest.priority],["Status", viewingTest.status],["Ordered By", `Dr. ${viewingTest.requestedBy}`],["Request Date", viewingTest.requestDate],["Result Date", viewingTest.resultDate || "\u2014"],["Age", viewingTest.patientAge ? `${viewingTest.patientAge} yrs` : "\u2014"]].map(([k, v]) => (
                      <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-400 font-medium">{k}</p>
                        <p className="text-sm text-slate-800 font-semibold mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <SectionHeading icon="&#x1F9EA;" title="Sample Information" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {[["Sample Type", LAB_MASTER_LIBRARY[viewingTest.testName]?.sampleType || viewingTest.sampleType || "\u2014"],["Barcode", viewingTest.sampleBarcode || "\u2014"],["Collected At", viewingTest.sampleCollectedAt || "\u2014"],["Received At", viewingTest.sampleReceivedAt || "\u2014"],["Processed At", viewingTest.sampleProcessedAt || "\u2014"],["Lab Technician", viewingTest.labTechnicianName || "\u2014"],["Verifying Doctor", viewingTest.verifyingDoctor || "\u2014"]].map(([k, v]) => (
                      <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-400 font-medium">{k}</p>
                        <p className="text-sm text-slate-800 font-semibold mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <SectionHeading icon={LAB_MASTER_LIBRARY[viewingTest.testName]?.icon || "\uD83D\uDD2C"} title="Profile Results" />
                  <div className="mt-3">
                    {viewingTest.profileResults && Object.keys(viewingTest.profileResults).length > 0 ? (
                      <ProfileResultsTable profileResults={viewingTest.profileResults} profileKey={viewingTest.testName} previousResults={viewingTest.previousProfileResults || {}} />
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-4 text-slate-700 whitespace-pre-wrap text-sm">{viewingTest.result || "No result entered yet."}</div>
                    )}
                  </div>
                </section>
                {(() => {
                  const summary = generateProfileSummary(viewingTest.testName, viewingTest.profileResults, viewingTest.previousProfileResults || {});
                  return (
                    <>
                      {summary.clinicalPatterns.length > 0 && (
                        <section>
                          <SectionHeading icon="clinical" title="Clinical Interpretation" />
                          <div className="mt-3 space-y-2">
                            {summary.clinicalPatterns.map(({ id, pattern }) => (
                              <div key={id} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">{pattern}</div>
                            ))}
                            <p className="text-xs text-gray-400 italic">Pattern recognition is based on combined parameter analysis. Clinical correlation is mandatory. This does not constitute a medical diagnosis.</p>
                          </div>
                        </section>
                      )}
                      {viewingTest.profileResults && Object.keys(viewingTest.profileResults).length > 0 && (
                        <section>
                          <SectionHeading icon="summary" title="Overall Laboratory Impression" />
                          <LabSummaryPanel profileKey={viewingTest.testName} profileResults={viewingTest.profileResults} previousResults={viewingTest.previousProfileResults || {}} />
                        </section>
                      )}
                    </>
                  );
                })()}
                {viewingTest.notes && (
                  <section>
                    <SectionHeading icon="notes" title="Doctor Notes" />
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap">{viewingTest.notes}</div>
                  </section>
                )}
                <section>
                  <SectionHeading icon="ai" title="AI Doctor Assistant" badge="Coming Soon" />
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[{ icon:"\uD83D\uDCD1", label:"Automatic Clinical Notes", desc:"AI-generated clinical narrative based on all result parameters." },{ icon:"clinical", label:"Differential Diagnosis Suggestions", desc:"AI-assisted list of possible diagnoses based on laboratory patterns." },{ icon:"trend", label:"Previous Report AI Comparison", desc:"Trend analysis and interpretation across multiple reports." },{ icon:"risk", label:"Disease Risk Prediction", desc:"Risk scores for common conditions based on multi-parameter analysis." }].map(({ icon, label, desc }) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex gap-3 items-start opacity-60">
                        <span className="text-xl">{icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="bg-slate-100 rounded-xl px-4 py-4 text-xs text-slate-500 italic border border-slate-200">
                    <p className="font-semibold text-slate-600 not-italic mb-1">Laboratory Disclaimer</p>
                    This report has been generated by MediCare Pro Laboratory Information System and is intended for use by qualified medical professionals only. All results must be interpreted in the appropriate clinical context. Reference ranges are general adult guidelines and may vary with age, gender, and laboratory-specific methodology. Pattern-based interpretations are algorithmic suggestions and do not constitute a medical diagnosis. The attending physician bears final clinical responsibility for all diagnostic and therapeutic decisions. This is a confidential medical document.
                  </div>
                </section>
              </div>
              <div className="px-6 py-4 border-t flex justify-between items-center bg-slate-50 rounded-b-2xl">
                <ActionButton onClick={() => downloadLabReportPDF(viewingTest)} label="Download PDF" variant="primary" size="md" />
                <ActionButton onClick={() => setViewingTest(null)} label="Close" variant="default" size="md" />
              </div>
            </div>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}

function SectionHeading({ icon, title, badge }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
      <span className="text-base">{icon}</span>
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
      {badge && <span className="ml-auto text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
    </div>
  );
}
