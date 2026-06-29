// src/pages/PrescriptionPage.jsx
// MediCare Pro — Prescription & Pharmacy Management
// Phase 6 Part 2 — localStorage persistence, QR payload, rule-based engine

import { useState, useEffect, useMemo, useCallback } from "react";
import PrescriptionBuilder from "../components/pharmacy/PrescriptionBuilder";

// ─── QR Payload Builder ───────────────────────────────────────────────────────
const buildQRPayload = (prescription, medicines) => {
  const payload = {
    rxId:      prescription.prescription_id,
    patId:     prescription.patient_id,
    patient:   prescription.patient_name,
    doctor:    prescription.doctor_name || "—",
    date:      prescription.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    diagnosis: prescription.diagnosis || "",
    drugs:     medicines.map((m) => ({
      name: m.medicine_name,
      dose: m.dosage_strength,
      freq: m.frequency,
      dur:  m.duration,
    })),
  };
  return JSON.stringify(payload);
};

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Active:     "bg-green-100 text-green-700",
  Dispensed:  "bg-blue-100 text-blue-700",
  Cancelled:  "bg-red-100 text-red-700",
  Expired:    "bg-slate-200 text-slate-500",
};

const STATUSES = ["Active", "Dispensed", "Cancelled", "Expired"];

const emptyForm = () => ({
  patient_id:    "",
  patient_name:  "",
  doctor_name:   "",
  department:    "",
  diagnosis:     "",
  notes:         "",
  status:        "Active",
  medicines:     [],
});

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PrescriptionPage({ darkMode }) {
  const [prescriptions, setPrescriptions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("prescriptions") || "[]");
    } catch { return []; }
  });

  const [patients, setPatients] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("patients") || "[]");
    } catch { return []; }
  });

  const [showForm, setShowForm]             = useState(false);
  const [form, setForm]                     = useState(emptyForm());
  const [viewRx, setViewRx]                 = useState(null);   // prescription detail modal
  const [search, setSearch]                 = useState("");
  const [statusFilter, setStatusFilter]     = useState("All");
  const [patientFilter, setPatientFilter]   = useState("All");
  const [patientSearch, setPatientSearch]   = useState("");
  const [showPatientDrop, setShowPatientDrop] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("prescriptions", JSON.stringify(prescriptions));
    window.dispatchEvent(new CustomEvent("prescriptionsUpdated"));
  }, [prescriptions]);

  // Sync patients from cross-module updates
  useEffect(() => {
    const load = () => {
      try {
        setPatients(JSON.parse(localStorage.getItem("patients") || "[]"));
      } catch {}
    };
    window.addEventListener("patientsUpdated", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("patientsUpdated", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     prescriptions.length,
    active:    prescriptions.filter((r) => r.status === "Active").length,
    dispensed: prescriptions.filter((r) => r.status === "Dispensed").length,
    cancelled: prescriptions.filter((r) => r.status === "Cancelled").length,
    medicines: prescriptions.reduce((sum, r) => sum + (r.medicines?.length || 0), 0),
  }), [prescriptions]);

  // ─── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => prescriptions.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.prescription_id?.toLowerCase().includes(q) ||
      r.patient_name?.toLowerCase().includes(q) ||
      r.patient_id?.toLowerCase().includes(q) ||
      r.doctor_name?.toLowerCase().includes(q) ||
      r.diagnosis?.toLowerCase().includes(q);
    const matchStatus  = statusFilter  === "All" || r.status  === statusFilter;
    const matchPatient = patientFilter === "All" || r.patient_id === patientFilter;
    return matchSearch && matchStatus && matchPatient;
  }), [prescriptions, search, statusFilter, patientFilter]);

  // ─── Patient autocomplete in form ──────────────────────────────────────────
  const filteredPatients = useMemo(() =>
    patients.filter((p) =>
      p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.id?.toLowerCase().includes(patientSearch.toLowerCase())
    ).slice(0, 8),
    [patients, patientSearch]
  );

  const selectPatient = (p) => {
    setForm((f) => ({
      ...f,
      patient_id:   p.id,
      patient_name: p.name,
      doctor_name:  f.doctor_name || p.primaryDoctor || "",
      department:   f.department  || p.department    || "",
    }));
    setPatientSearch(p.name);
    setShowPatientDrop(false);
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!form.patient_id || !form.patient_name) {
      alert("Please select a patient.");
      return;
    }
    if (form.medicines.length === 0) {
      alert("Please add at least one medicine.");
      return;
    }
    const hasNames = form.medicines.every((m) => m.medicine_name.trim());
    if (!hasNames) {
      alert("Please fill in the medicine name for all entries.");
      return;
    }

    const rx_id = `RX-${Date.now()}`;
    const newRx = {
      prescription_id: rx_id,
      patient_id:      form.patient_id,
      patient_name:    form.patient_name,
      doctor_name:     form.doctor_name,
      department:      form.department,
      diagnosis:       form.diagnosis,
      notes:           form.notes,
      status:          form.status || "Active",
      medicines:       form.medicines,
      qr_payload:      buildQRPayload({ prescription_id: rx_id, ...form }, form.medicines),
      created_at:      new Date().toISOString(),
    };

    setPrescriptions((prev) => [newRx, ...prev]);

    // Also add a timeline entry to the linked patient
    try {
      const allPatients = JSON.parse(localStorage.getItem("patients") || "[]");
      const updated = allPatients.map((p) => {
        if (p.id !== form.patient_id) return p;
        return {
          ...p,
          timeline: [
            ...(p.timeline || []),
            {
              id:      Date.now(),
              date:    new Date().toISOString().split("T")[0],
              type:    "Prescription",
              title:   "Prescription Issued",
              details: `Rx ${rx_id}: ${form.medicines.map((m) => m.medicine_name).join(", ")} — Dr. ${form.doctor_name || "Unknown"}`,
            },
          ],
        };
      });
      localStorage.setItem("patients", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("patientsUpdated"));
    } catch {}

    setForm(emptyForm());
    setPatientSearch("");
    setShowForm(false);
  }, [form]);

  const updateStatus = (rx_id, status) => {
    setPrescriptions((prev) =>
      prev.map((r) => r.prescription_id === rx_id ? { ...r, status } : r)
    );
  };

  const deletePrescription = (rx_id) => {
    if (!window.confirm("Delete this prescription? This cannot be undone.")) return;
    setPrescriptions((prev) => prev.filter((r) => r.prescription_id !== rx_id));
  };

  const resetForm = () => {
    setForm(emptyForm());
    setPatientSearch("");
    setShowForm(false);
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const bg     = darkMode ? "bg-slate-950 text-white"  : "bg-slate-100 text-slate-900";
  const cardBg = darkMode ? "bg-slate-900"             : "bg-white";
  const inputCls = `border rounded-lg px-3 py-2.5 text-sm ${
    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
  } focus:outline-none focus:border-cyan-500 transition-colors`;
  const labelCls = "text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block";

  const StatCard = ({ icon, label, value, color }) => (
    <div className={`${color} text-white rounded-xl p-4 flex items-center gap-3 shadow`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className={`p-6 min-h-screen ${bg}`}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            💊 Prescription Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Pharmacy · Drug Interaction Check · QR-Linked Prescriptions</p>
        </div>
        <div className="flex items-center gap-3 mt-3 md:mt-0">
          <span className="text-sm font-medium text-cyan-600">
            {filtered.length} of {prescriptions.length} Rx
          </span>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {showForm ? "✕ Close" : "+ New Prescription"}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard icon="📋" label="Total Rx"     value={stats.total}     color="bg-cyan-600"   />
        <StatCard icon="✅" label="Active"        value={stats.active}    color="bg-green-600"  />
        <StatCard icon="📦" label="Dispensed"     value={stats.dispensed} color="bg-blue-600"   />
        <StatCard icon="❌" label="Cancelled"     value={stats.cancelled} color="bg-red-600"    />
        <StatCard icon="💊" label="Total Meds"    value={stats.medicines} color="bg-purple-600" />
      </div>

      {/* ── New Prescription Form ── */}
      {showForm && (
        <div className={`mb-6 rounded-2xl shadow-lg p-6 ${cardBg}`}>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            📝 New Prescription
          </h2>

          {/* Section 1 — Patient & Doctor Info */}
          <div className="mb-5">
            <p className={labelCls}>Patient & Doctor Information</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

              {/* Patient search */}
              <div className="md:col-span-2 relative">
                <label className={labelCls}>Select Patient *</label>
                <input
                  className={`${inputCls} w-full`}
                  placeholder="Search by name or ID..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientDrop(true);
                    if (!e.target.value) setForm((f) => ({ ...f, patient_id: "", patient_name: "" }));
                  }}
                  onFocus={() => setShowPatientDrop(true)}
                  onBlur={() => setTimeout(() => setShowPatientDrop(false), 200)}
                />
                {form.patient_id && (
                  <p className="text-xs text-cyan-500 mt-1 font-medium">
                    ✓ {form.patient_id} — {form.patient_name}
                  </p>
                )}
                {showPatientDrop && filteredPatients.length > 0 && (
                  <div className={`absolute z-30 top-full mt-1 w-full rounded-xl shadow-lg border max-h-52 overflow-y-auto ${
                    darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                  }`}>
                    {filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-cyan-50 transition-colors ${darkMode ? "hover:bg-slate-700 hover:text-cyan-400" : ""}`}
                        onClick={() => selectPatient(p)}
                      >
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.id} · {p.gender} · {p.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
                {patients.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No patients found. Register patients first.</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Doctor Name</label>
                <input
                  className={`${inputCls} w-full`}
                  placeholder="Dr. Name"
                  value={form.doctor_name}
                  onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls}>Department</label>
                <input
                  className={`${inputCls} w-full`}
                  placeholder="e.g. General Medicine"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2 — Diagnosis */}
          <div className="mb-5">
            <p className={labelCls}>Clinical Information</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Diagnosis</label>
                <input
                  className={`${inputCls} w-full`}
                  placeholder="Primary diagnosis / indication"
                  value={form.diagnosis}
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Clinical Notes</label>
                <input
                  className={`${inputCls} w-full`}
                  placeholder="Additional notes for pharmacist"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select
                  className={`${inputCls} w-full`}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3 — Prescription Builder */}
          <div className="mb-5">
            <p className={labelCls}>Medicines</p>
            <PrescriptionBuilder
              medicines={form.medicines}
              onChange={(meds) => setForm({ ...form, medicines: meds })}
              darkMode={darkMode}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              ✓ Issue Prescription
            </button>
            <button
              type="button"
              onClick={resetForm}
              className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                darkMode ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className={`flex flex-wrap gap-3 mb-4 p-4 rounded-xl ${cardBg} shadow`}>
        <input
          className={`${inputCls} flex-1 min-w-[200px]`}
          placeholder="🔍 Search by Rx ID, patient, doctor, diagnosis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={`${inputCls} min-w-[150px]`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          className={`${inputCls} min-w-[180px]`}
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
        >
          <option value="All">All Patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
          ))}
        </select>
      </div>

      {/* ── Prescription Table ── */}
      <div className={`rounded-2xl shadow overflow-x-auto ${cardBg}`}>
        <table className="w-full text-sm min-w-[900px]">
          <thead className={`${darkMode ? "bg-slate-800" : "bg-slate-50"} border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
            <tr>
              {["Rx ID", "Patient", "Doctor", "Diagnosis", "Medicines", "Status", "Date", "Actions"].map((h) => (
                <th key={h} className="p-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((rx) => (
              <tr
                key={rx.prescription_id}
                className={`border-b transition-colors ${darkMode ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-50"}`}
              >
                {/* Rx ID */}
                <td className="p-3">
                  <span className="font-mono font-bold text-cyan-500 text-xs">{rx.prescription_id}</span>
                </td>
                {/* Patient */}
                <td className="p-3">
                  <div className="font-semibold text-sm">{rx.patient_name}</div>
                  <div className="text-xs text-slate-400">{rx.patient_id}</div>
                </td>
                {/* Doctor */}
                <td className="p-3 text-xs">{rx.doctor_name || <span className="text-slate-400">—</span>}</td>
                {/* Diagnosis */}
                <td className="p-3 text-xs max-w-[160px] truncate">{rx.diagnosis || <span className="text-slate-400">—</span>}</td>
                {/* Medicine count */}
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    rx.medicines?.length > 0 ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {rx.medicines?.length || 0} drug{(rx.medicines?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </td>
                {/* Status */}
                <td className="p-3">
                  <select
                    value={rx.status}
                    onChange={(e) => updateStatus(rx.prescription_id, e.target.value)}
                    className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none ${STATUS_COLORS[rx.status] || "bg-slate-100 text-slate-600"}`}
                  >
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                {/* Date */}
                <td className="p-3 text-xs text-slate-500">
                  {rx.created_at ? rx.created_at.split("T")[0] : "—"}
                </td>
                {/* Actions */}
                <td className="p-3">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setViewRx(rx)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => deletePrescription(rx.prescription_id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" className="p-10 text-center text-slate-400">
                  <div className="text-4xl mb-2">💊</div>
                  <p className="font-medium">No prescriptions found</p>
                  <p className="text-sm">Issue a new prescription or adjust your filters</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Prescription Detail Modal ── */}
      {viewRx && (
        <PrescriptionModal rx={viewRx} onClose={() => setViewRx(null)} darkMode={darkMode} />
      )}
    </div>
  );
}

// ─── Prescription Detail Modal ─────────────────────────────────────────────────
function PrescriptionModal({ rx, onClose, darkMode }) {
  const cardBg = darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900";
  const rowCls = darkMode ? "border-slate-700" : "border-slate-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className={`${cardBg} rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto`}>

        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              💊 {rx.prescription_id}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{rx.patient_name} · {rx.patient_id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-6">

          {/* Prescription Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ["Doctor",     rx.doctor_name  || "—"],
              ["Department", rx.department   || "—"],
              ["Diagnosis",  rx.diagnosis    || "—"],
              ["Status",     rx.status       || "—"],
              ["Date",       rx.created_at?.split("T")[0] || "—"],
              ["Notes",      rx.notes        || "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Medicines Table */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">
              Medicines ({rx.medicines?.length || 0})
            </h3>
            <div className="space-y-3">
              {(rx.medicines || []).map((med, i) => (
                <div
                  key={i}
                  className={`border rounded-xl p-4 ${darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                    <span className="font-semibold">{med.medicine_name}</span>
                    {med.generic_name && <span className="text-xs text-slate-500">({med.generic_name})</span>}
                    {med.category && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{med.category}</span>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {[
                      ["Strength",   med.dosage_strength || "—"],
                      ["Form",       med.dosage_form     || "—"],
                      ["Frequency",  med.frequency       || "—"],
                      ["Duration",   med.duration        || "—"],
                      ["Timing",     med.timing          || "—"],
                      ["Route",      med.route           || "—"],
                      ["Quantity",   med.quantity ? `${med.quantity} units` : "—"],
                      ["Refills",    med.refills ?? "0"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate-500 font-medium">{k}: </span>
                        <span className="font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                  {med.instructions && (
                    <p className="text-xs text-slate-500 mt-2 italic">📌 {med.instructions}</p>
                  )}
                  {med.warnings?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {med.warnings.map((w, wi) => (
                        <span key={wi} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">⚠ {w}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* QR Payload */}
          {rx.qr_payload && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">QR Code Payload</h3>
              <div className={`rounded-xl p-4 font-mono text-xs break-all leading-relaxed ${
                darkMode ? "bg-slate-800 text-cyan-400" : "bg-slate-100 text-slate-700"
              }`}>
                {rx.qr_payload}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Encode this string in any QR generator to create a scannable prescription QR code.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              darkMode ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
