// src/components/patient/PatientProfileModal.jsx
// MediCare Pro — Enterprise Patient Profile
// Upgraded: Phase 1 (DOB + Gov ID) | Phase 2 (QR Code)
//           Phase 3 (Visit Counter + 4-tier Priority) | Phase 4 (Family Info)

import { useState, useMemo, useCallback } from "react";
import PatientTimeline      from "./PatientTimeline";
import PatientVitals        from "./PatientVitals";
import PatientMedicalHistory from "./PatientMedicalHistory";
import PatientQRCode        from "./PatientQRCode";
import PriorityBadge        from "./PriorityBadge";
import { FamilyInfoDisplay } from "./FamilyInfoSection";
import {
  getRiskLevel,
  getClinicalAlerts,
  getPatientLabReports,
  getOutstandingBalance,
  getVisitCount,
  statusColor,
  ageDisplay,
  calculateAge,
} from "../../utils/patientHelpers";

// ─── Sub-components ───────────────────────────────────────────────────────────
const InfoCard = ({ label, value, darkMode }) => (
  <div className={`flex flex-col gap-0.5 p-3 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50 border border-slate-200"}`}>
    <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
    <span className={`text-sm font-medium ${value ? "" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
      {value || "Not Recorded"}
    </span>
  </div>
);

const SectionHead = ({ title, icon, darkMode }) => (
  <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
    <span className="text-lg">{icon}</span>
    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3>
  </div>
);

const riskBadge = (level) => {
  switch (level) {
    case "Critical": return "bg-red-700 text-white";
    case "High":     return "bg-orange-500 text-white";
    case "Medium":   return "bg-yellow-500 text-white";
    default:         return "bg-green-600 text-white";
  }
};

// ─── TAB CONFIG ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",   label: "Overview",   icon: "🗂"  },
  { id: "vitals",     label: "Vitals",     icon: "💓"  },
  { id: "medical",    label: "Medical",    icon: "🩺"  },
  { id: "family",     label: "Family",     icon: "👨‍👩‍👧‍👦" },   // Phase 4
  { id: "qr",         label: "QR Code",    icon: "📱"  },   // Phase 2
  { id: "laboratory", label: "Lab",        icon: "🔬"  },
  { id: "timeline",   label: "Timeline",   icon: "📋"  },
  { id: "medications",label: "Medications",icon: "💊"  },
  { id: "visits",     label: "Visits",     icon: "📅"  },
  { id: "billing",    label: "Billing",    icon: "💳"  },
  { id: "documents",  label: "Documents",  icon: "📁"  },
  { id: "alerts",     label: "Alerts",     icon: "🚨"  },
  { id: "notes",      label: "Notes",      icon: "📝"  },
  { id: "ai",         label: "AI Summary", icon: "🤖"  },
];

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────
export default function PatientProfileModal({
  patient,
  onClose,
  onEdit,
  onExportPDF,
  patients,
  setPatients,
  darkMode,
}) {
  const [activeTab, setActiveTab]         = useState("overview");
  const [selectedPatient, setSelectedPatient] = useState(patient);
  const [timelineForm, setTimelineForm]   = useState({ type: "Consultation", title: "", details: "" });

  const today = new Date().toISOString().split("T")[0];

  const riskLevel  = useMemo(() => getRiskLevel(selectedPatient),                  [selectedPatient]);
  const alerts     = useMemo(() => getClinicalAlerts(selectedPatient),              [selectedPatient]);
  const labReports = useMemo(() => getPatientLabReports(selectedPatient.id, selectedPatient.name), [selectedPatient]);
  const balance    = useMemo(() => getOutstandingBalance(selectedPatient.id),       [selectedPatient]);
  const visitCount = useMemo(() => getVisitCount(selectedPatient.timeline),         [selectedPatient]);
  const age        = useMemo(() => calculateAge(selectedPatient.dob, selectedPatient.age), [selectedPatient]);

  const addTimelineEvent = useCallback(() => {
    if (!timelineForm.title || !timelineForm.details) {
      alert("Please fill timeline title and details.");
      return;
    }
    const newEvent = {
      id: Date.now(),
      date: today,
      type: timelineForm.type,
      title: timelineForm.title,
      details: timelineForm.details,
    };
    const updated = patients.map((p) =>
      p.id === selectedPatient.id
        ? { ...p, timeline: [...(p.timeline || []), newEvent] }
        : p
    );
    setPatients(updated);
    setSelectedPatient((sp) => ({ ...sp, timeline: [...(sp.timeline || []), newEvent] }));
    setTimelineForm({ type: "Consultation", title: "", details: "" });
  }, [selectedPatient, timelineForm, patients, setPatients, today]);

  // Theme shortcuts
  const modal      = darkMode ? "bg-slate-900 text-white"            : "bg-white text-slate-900";
  const header     = darkMode ? "bg-slate-800"                       : "bg-gradient-to-r from-cyan-600 to-blue-700";
  const tabBar     = darkMode ? "bg-slate-900 border-slate-700"      : "bg-white border-slate-200";
  const tabActive  = "bg-cyan-600 text-white shadow";
  const tabInactive= darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  const panelBg    = darkMode ? "bg-slate-900"                       : "bg-slate-50";
  const footerBg   = darkMode ? "bg-slate-800 border-slate-700"      : "bg-slate-50 border-slate-200";

  // Quick stat strip — Phase 3: show visit counter
  const quickStats = [
    { label: "Visits",         value: visitCount > 0 ? `Visit #${visitCount}` : "No visits", icon: "📋", color: visitCount > 0 ? "text-cyan-500" : "text-slate-400" },
    { label: "Lab Reports",    value: labReports.length,     icon: "🔬", color: "text-blue-500"  },
    { label: "Balance",        value: `₹${balance}`,         icon: "💳", color: balance > 0 ? "text-red-500" : "text-green-600" },
    { label: "Registered",     value: selectedPatient.registeredDate, icon: "📅", color: "text-slate-500" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full max-w-5xl rounded-2xl shadow-2xl my-6 overflow-hidden ${modal}`}>

        {/* ── HEADER ── */}
        <div className={`p-6 ${header} text-white`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Avatar + identity */}
            <div className="flex items-center gap-5">
              {selectedPatient.photo ? (
                <img
                  src={selectedPatient.photo}
                  alt={selectedPatient.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold shadow-lg flex-shrink-0 ring-4 ring-white/20">
                  {selectedPatient.name?.charAt(0) || "?"}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight leading-tight">{selectedPatient.name}</h2>
                <p className="font-mono text-sm opacity-75 mt-0.5">{selectedPatient.id}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-semibold backdrop-blur-sm">
                    {selectedPatient.gender}
                  </span>
                  {/* Phase 1: show calculated age + DOB */}
                  <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-semibold backdrop-blur-sm">
                    {age !== null ? `${age} yrs` : "Age N/A"}
                    {selectedPatient.dob ? ` · ${selectedPatient.dob}` : ""}
                  </span>
                  <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-bold backdrop-blur-sm">
                    {selectedPatient.bloodGroup || "—"}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${statusColor(selectedPatient.status)}`}>
                    {selectedPatient.status || "Unknown"}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${riskBadge(riskLevel)}`}>
                    ⚠ {riskLevel} Risk
                  </span>
                  {/* Phase 3: Priority badge in header */}
                  <PriorityBadge priority={selectedPatient.priority || "Normal"} size="sm" />
                </div>
                {/* Phase 3: Visit counter in header */}
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-semibold backdrop-blur-sm">
                    📋 {visitCount > 0 ? `Visit #${visitCount}` : "No visits yet"}
                  </span>
                  {/* Phase 1: Gov ID badge */}
                  {selectedPatient.govIdType && (
                    <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-semibold backdrop-blur-sm">
                      🪪 {selectedPatient.govIdType}
                    </span>
                  )}
                </div>
                {alerts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {alerts.map((a, i) => (
                      <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${a.color}`}>
                        {a.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap items-start">
              {onEdit && (
                <button
                  onClick={() => { onClose(); onEdit(selectedPatient); }}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors backdrop-blur-sm"
                >
                  ✏ Edit
                </button>
              )}
              {onExportPDF && (
                <button
                  onClick={() => onExportPDF(selectedPatient)}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors backdrop-blur-sm"
                >
                  📄 PDF
                </button>
              )}
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors backdrop-blur-sm"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>

        {/* ── QUICK STATS STRIP ── */}
        <div className={`grid grid-cols-4 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
          {quickStats.map((s, i) => (
            <div
              key={s.label}
              className={`p-4 text-center ${i < 3 ? `border-r ${darkMode ? "border-slate-700" : "border-slate-100"}` : ""}`}
            >
              <div className="text-lg mb-0.5">{s.icon}</div>
              <div className={`text-lg font-bold leading-tight ${s.color}`}>{s.value}</div>
              <div className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── TAB BAR ── */}
        <div className={`flex flex-wrap gap-1 px-4 pt-3 pb-0 border-b ${tabBar} sticky top-0 z-10`}>
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg mb-0 transition-all ${
                activeTab === id ? tabActive : tabInactive
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className={`p-6 ${panelBg} min-h-[400px]`}>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <SectionHead title="Personal Information" icon="👤" darkMode={darkMode} />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <InfoCard label="Full Name"      value={selectedPatient.name}                         darkMode={darkMode} />
                  {/* Phase 1: Show DOB-derived age */}
                  <InfoCard label="Age / DOB"      value={ageDisplay(selectedPatient.dob, selectedPatient.age)} darkMode={darkMode} />
                  <InfoCard label="Gender"         value={selectedPatient.gender}                       darkMode={darkMode} />
                  <InfoCard label="Blood Group"    value={selectedPatient.bloodGroup}                   darkMode={darkMode} />
                  <InfoCard label="Marital Status" value={selectedPatient.maritalStatus}                darkMode={darkMode} />
                  <InfoCard label="Occupation"     value={selectedPatient.occupation}                   darkMode={darkMode} />
                  {/* Phase 3: Priority */}
                  <div className={`flex flex-col gap-0.5 p-3 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50 border border-slate-200"}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Priority</span>
                    <div className="mt-1">
                      <PriorityBadge priority={selectedPatient.priority || "Normal"} size="md" />
                    </div>
                  </div>
                  {/* Phase 3: Visit count */}
                  <div className={`flex flex-col gap-0.5 p-3 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50 border border-slate-200"}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Total Visits</span>
                    <span className="text-sm font-bold text-cyan-600">
                      {visitCount > 0 ? `Visit #${visitCount}` : "No visits yet"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phase 1: Government Identity */}
              <div>
                <SectionHead title="Government Identity" icon="🪪" darkMode={darkMode} />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <InfoCard label="ID Type"   value={selectedPatient.govIdType}   darkMode={darkMode} />
                  <InfoCard label="ID Number" value={selectedPatient.govIdNumber} darkMode={darkMode} />
                </div>
              </div>

              <div>
                <SectionHead title="Contact Details" icon="📞" darkMode={darkMode} />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <InfoCard label="Phone"             value={selectedPatient.phone}            darkMode={darkMode} />
                  <InfoCard label="Address"           value={selectedPatient.address}          darkMode={darkMode} />
                  <InfoCard label="Emergency Contact" value={selectedPatient.emergencyContact} darkMode={darkMode} />
                  <InfoCard label="Emergency Notes"   value={selectedPatient.emergencyNotes}   darkMode={darkMode} />
                </div>
              </div>

              <div>
                <SectionHead title="Clinical Assignment" icon="🏥" darkMode={darkMode} />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <InfoCard label="Primary Doctor"  value={selectedPatient.primaryDoctor}  darkMode={darkMode} />
                  <InfoCard label="Department"      value={selectedPatient.department}      darkMode={darkMode} />
                  <InfoCard label="Registered Date" value={selectedPatient.registeredDate}  darkMode={darkMode} />
                </div>
              </div>

              <div>
                <SectionHead title="Insurance" icon="🛡" darkMode={darkMode} />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <InfoCard label="Insurance Provider" value={selectedPatient.insuranceProvider} darkMode={darkMode} />
                  <InfoCard label="Insurance Number"   value={selectedPatient.insuranceNumber}   darkMode={darkMode} />
                  <InfoCard label="Organ Donor"        value={selectedPatient.organDonor}        darkMode={darkMode} />
                </div>
              </div>

              {/* Future modules */}
              <div>
                <SectionHead title="Upcoming Modules" icon="🔒" darkMode={darkMode} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {["Appointments","Radiology","Surgery History","Vaccinations",
                    "Consent Forms","Referrals","ICU History","Discharge Summary",
                    "AI Prediction","Lab Trends","Admission History","Telemedicine"].map((mod) => (
                    <div
                      key={mod}
                      className={`p-3 rounded-xl text-center border-2 border-dashed text-xs ${
                        darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"
                      }`}
                    >
                      🔒 {mod}<br /><span className="opacity-60 text-[10px]">Coming Soon</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VITALS */}
          {activeTab === "vitals" && (
            <div>
              <SectionHead title="Vital Signs" icon="💓" darkMode={darkMode} />
              <PatientVitals patient={selectedPatient} darkMode={darkMode} />
            </div>
          )}

          {/* MEDICAL */}
          {activeTab === "medical" && (
            <div>
              <SectionHead title="Medical History" icon="🩺" darkMode={darkMode} />
              <PatientMedicalHistory patient={selectedPatient} darkMode={darkMode} />
            </div>
          )}

          {/* PHASE 4 — FAMILY */}
          {activeTab === "family" && (
            <div>
              <SectionHead title="Family Information" icon="👨‍👩‍👧‍👦" darkMode={darkMode} />
              <FamilyInfoDisplay family={selectedPatient.family || []} darkMode={darkMode} />
              {(selectedPatient.family || []).length > 0 && (
                <div className={`mt-4 p-3 rounded-xl border text-xs ${
                  darkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-blue-50 border-blue-200 text-blue-700"
                }`}>
                  💡 To update family information, use the Edit button above.
                </div>
              )}
            </div>
          )}

          {/* PHASE 2 — QR CODE */}
          {activeTab === "qr" && (
            <div>
              <SectionHead title="Patient QR Code" icon="📱" darkMode={darkMode} />
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* QR display */}
                <div className="flex flex-col items-center gap-4">
                  <PatientQRCode patient={selectedPatient} size={200} darkMode={darkMode} showLabel />
                  <p className={`text-xs text-center max-w-[220px] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Scan with any QR reader to identify this patient instantly.
                  </p>
                </div>

                {/* QR details panel */}
                <div className="flex-1 space-y-4">
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      QR Payload Contents
                    </p>
                    <div className={`p-4 rounded-xl font-mono text-xs break-all ${darkMode ? "bg-slate-800 text-cyan-400" : "bg-slate-100 text-slate-700"}`}>
                      {[
                        `MEDICARE_PRO`,
                        `ID: ${selectedPatient.id}`,
                        `NAME: ${selectedPatient.name}`,
                        `DOB: ${selectedPatient.dob || "—"}`,
                        `BLOOD: ${selectedPatient.bloodGroup || "—"}`,
                        `PHONE: ${selectedPatient.phone || "—"}`,
                      ].map((line, i) => (
                        <div key={i} className="mb-1">{line}</div>
                      ))}
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Use Cases
                    </p>
                    <div className="space-y-2">
                      {[
                        { icon: "🏥", label: "Reception Desk", desc: "Scan on arrival for instant patient lookup" },
                        { icon: "🧪", label: "Lab Check-in",   desc: "Link lab orders to the correct patient" },
                        { icon: "💊", label: "Pharmacy",       desc: "Verify patient before dispensing medicines" },
                        { icon: "📄", label: "PDF Reports",    desc: "Embedded in exported medical records" },
                      ].map((u) => (
                        <div key={u.label} className="flex items-start gap-3">
                          <span className="text-lg">{u.icon}</span>
                          <div>
                            <p className="text-xs font-semibold">{u.label}</p>
                            <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{u.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border-2 border-dashed text-xs ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    📷 QR Scanner support (camera-based intake) — coming in next sprint.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LABORATORY */}
          {activeTab === "laboratory" && (
            <div>
              <SectionHead title="Laboratory Reports" icon="🔬" darkMode={darkMode} />
              {labReports.length === 0 ? (
                <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                  <div className="text-5xl mb-3">🔬</div>
                  <p className="font-semibold">No lab reports found</p>
                  <p className="text-sm mt-1">Lab reports linked by Patient ID or name will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {labReports.map((lab, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-semibold text-sm">{lab.testName || lab.profileName || "Lab Test"}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Requested: {lab.requestDate || "N/A"} · Result: {lab.resultDate || "Pending"}
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                          {lab.critical && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">🚨 Critical</span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            lab.status === "Completed" ? "bg-green-100 text-green-700" :
                            lab.status === "Pending"   ? "bg-yellow-100 text-yellow-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>{lab.status || "Unknown"}</span>
                        </div>
                      </div>
                      {lab.impression && (
                        <div className={`mt-3 p-3 rounded-lg text-sm ${darkMode ? "bg-slate-700" : "bg-slate-50 border border-slate-200"}`}>
                          <span className="font-bold text-xs text-slate-500 uppercase tracking-wide">Impression: </span>
                          {lab.impression}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TIMELINE */}
          {activeTab === "timeline" && (
            <div>
              <SectionHead title="EMR Timeline" icon="📋" darkMode={darkMode} />
              <PatientTimeline
                timeline={selectedPatient.timeline || []}
                onAddEvent={addTimelineEvent}
                timelineForm={timelineForm}
                setTimelineForm={setTimelineForm}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* MEDICATIONS */}
          {activeTab === "medications" && (
            <div>
              <SectionHead title="Medication History" icon="💊" darkMode={darkMode} />
              <div className={`mb-4 p-4 rounded-xl border ${darkMode ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                <p className={`text-sm font-semibold mb-1 ${darkMode ? "text-blue-300" : "text-blue-700"}`}>📋 Current Medications</p>
                <p className="text-sm">{selectedPatient.currentMedications || <span className="text-slate-400">No current medications recorded.</span>}</p>
              </div>
              <div className={`rounded-xl border overflow-hidden ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <table className="w-full text-sm">
                  <thead className={`${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                    <tr>
                      {["Medicine","Dose","Morning","Afternoon","Night","Days","Status"].map((h) => (
                        <th key={h} className="p-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        <div className="text-3xl mb-2">💊</div>
                        <p className="font-medium">Prescription module coming soon</p>
                        <p className="text-xs mt-1">Medicines, dosage, and schedule will appear here</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISITS — Phase 3: visit counter display */}
          {activeTab === "visits" && (
            <div>
              <SectionHead title="Visit History" icon="📅" darkMode={darkMode} />
              {/* Visit counter summary */}
              <div className={`mb-4 p-4 rounded-xl flex items-center gap-4 ${darkMode ? "bg-cyan-950 border border-cyan-800" : "bg-cyan-50 border border-cyan-200"}`}>
                <div className="text-4xl font-extrabold text-cyan-600">#{visitCount}</div>
                <div>
                  <p className={`font-bold text-sm ${darkMode ? "text-cyan-300" : "text-cyan-700"}`}>
                    {visitCount === 0 ? "No consultations yet" : visitCount === 1 ? "1 Consultation on record" : `${visitCount} Consultations on record`}
                  </p>
                  <p className={`text-xs mt-0.5 ${darkMode ? "text-cyan-500" : "text-cyan-600"}`}>
                    Counted from Consultation entries in this patient's EMR timeline.
                  </p>
                </div>
              </div>

              <div className={`rounded-xl border overflow-hidden ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <table className="w-full text-sm">
                  <thead className={`${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                    <tr>
                      {["#","Date","Doctor","Diagnosis","Lab","Medicines","Advice","Follow-up"].map((h) => (
                        <th key={h} className="p-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPatient.timeline || []).filter((t) => t.type === "Consultation").length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-slate-400">
                          <div className="text-3xl mb-2">📅</div>
                          <p className="font-medium">No visit records yet</p>
                          <p className="text-xs mt-1">Add consultation events via the Timeline tab</p>
                        </td>
                      </tr>
                    ) : (
                      (selectedPatient.timeline || [])
                        .filter((t) => t.type === "Consultation")
                        .map((v, i) => (
                          <tr key={v.id} className={`border-t ${darkMode ? "border-slate-700" : "border-slate-100"}`}>
                            <td className="p-3 text-slate-500 text-xs font-bold">#{i + 1}</td>
                            <td className="p-3 text-xs font-mono">{v.date}</td>
                            <td className="p-3 text-xs">{selectedPatient.primaryDoctor || "—"}</td>
                            <td className="p-3 text-xs">{v.details}</td>
                            <td className="p-3 text-xs text-slate-400">—</td>
                            <td className="p-3 text-xs text-slate-400">—</td>
                            <td className="p-3 text-xs text-slate-400">—</td>
                            <td className="p-3 text-xs text-slate-400">—</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BILLING */}
          {activeTab === "billing" && (
            <div>
              <SectionHead title="Billing Summary" icon="💳" darkMode={darkMode} />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Total Bills",        value: "₹0",          color: "text-cyan-600",   icon: "📄" },
                  { label: "Paid Amount",         value: "₹0",          color: "text-green-600",  icon: "✅" },
                  { label: "Pending",             value: "₹0",          color: "text-orange-500", icon: "⏳" },
                  { label: "Insurance Coverage",  value: "₹0",          color: "text-blue-600",   icon: "🛡" },
                  { label: "Outstanding Balance", value: `₹${balance}`, color: balance > 0 ? "text-red-600" : "text-green-600", icon: "⚠️" },
                  { label: "Insurance Provider",  value: selectedPatient.insuranceProvider || "None", color: "text-slate-600", icon: "🏢" },
                ].map((item) => (
                  <div key={item.label} className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className="text-xl mb-1">{item.icon}</div>
                    <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className={`p-4 rounded-2xl border-2 border-dashed text-center ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                <p className="text-sm font-medium">Full billing history — available once billing module is connected</p>
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {activeTab === "documents" && (
            <div>
              <SectionHead title="Uploaded Documents" icon="📁" darkMode={darkMode} />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Prescription PDFs", icon: "💊", count: 0 },
                  { label: "Lab Reports",        icon: "🔬", count: labReports.length },
                  { label: "X-Rays",             icon: "🩻", count: 0 },
                  { label: "MRI Scans",          icon: "🧲", count: 0 },
                  { label: "CT Scans",           icon: "💿", count: 0 },
                  { label: "Discharge Summary",  icon: "🚪", count: 0 },
                ].map((doc) => (
                  <div key={doc.label} className={`p-4 rounded-xl border flex items-center gap-3 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                      {doc.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{doc.label}</p>
                      <p className={`text-xs ${doc.count > 0 ? "text-cyan-600 font-bold" : "text-slate-400"}`}>
                        {doc.count > 0 ? `${doc.count} file${doc.count > 1 ? "s" : ""}` : "No files"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-4 p-4 rounded-xl border-2 border-dashed text-center ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                <p className="text-sm font-medium">Document upload & DICOM viewer — coming soon</p>
              </div>
            </div>
          )}

          {/* ALERTS */}
          {activeTab === "alerts" && (
            <div>
              <SectionHead title="Clinical Alerts" icon="🚨" darkMode={darkMode} />
              {alerts.length === 0 ? (
                <div className={`text-center py-14 rounded-2xl border-2 border-dashed ${darkMode ? "border-green-900 text-slate-500" : "border-green-200 text-slate-400"}`}>
                  <div className="text-5xl mb-3">✅</div>
                  <p className="font-semibold text-green-600">No active clinical alerts</p>
                  <p className="text-sm mt-1">Alerts are generated automatically from patient data.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {alerts.map((a, i) => (
                    <div key={i} className={`p-5 rounded-2xl ${a.color} text-white`}>
                      <div className="text-2xl mb-2">⚠️</div>
                      <p className="font-bold text-base">{a.label}</p>
                      <p className="text-xs opacity-75 mt-1">Auto-detected from patient record</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTES */}
          {activeTab === "notes" && (
            <div>
              <SectionHead title="Doctor Notes" icon="📝" darkMode={darkMode} />
              <div className={`p-5 rounded-2xl border min-h-[200px] ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                {selectedPatient.visitNotes ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedPatient.visitNotes}</p>
                ) : (
                  <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    No doctor notes recorded. Use the Edit button to add clinical notes.
                  </p>
                )}
              </div>
              <div className={`mt-4 p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
                <p className="text-xs font-medium text-blue-600">
                  💡 Rich text editor with templates, dictation, and co-signature support — coming soon.
                </p>
              </div>
            </div>
          )}

          {/* AI SUMMARY */}
          {activeTab === "ai" && (
            <div>
              <SectionHead title="AI Health Summary" icon="🤖" darkMode={darkMode} />
              <div className={`p-8 rounded-2xl border-2 border-dashed text-center mb-6 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <div className="text-5xl mb-3">🤖</div>
                <h3 className="text-lg font-bold mb-1">AI Analysis Coming Soon</h3>
                <p className={`text-sm max-w-md mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  The AI engine will analyze patient data and generate intelligent health summaries automatically.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { icon: "📊", title: "Health Score",         desc: "AI-computed health index from vitals, labs, and history"    },
                  { icon: "📈", title: "Lab Trends",           desc: "Pattern analysis across multiple lab reports over time"     },
                  { icon: "⚠️", title: "Risk Prediction",      desc: "Predictive alerts for deterioration or disease progression" },
                  { icon: "💊", title: "Medication Analysis",  desc: "Drug interactions, adherence scoring, alternatives"         },
                  { icon: "🏥", title: "Visit Patterns",       desc: "Frequency, severity trends, department routing"             },
                  { icon: "🔮", title: "Discharge Prediction", desc: "Expected recovery timeline and discharge readiness"         },
                ].map((item) => (
                  <div key={item.title} className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className={`flex justify-between items-center px-6 py-4 border-t ${footerBg}`}>
          <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            <span className="font-mono font-bold">{selectedPatient.id}</span>
            {" · "}Registered: {selectedPatient.registeredDate}
            {" · "}
            <span className="font-semibold">
              {visitCount > 0 ? `Visit #${visitCount}` : "0 visits"}
            </span>
            {selectedPatient.primaryDoctor && ` · Dr. ${selectedPatient.primaryDoctor}`}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => { onClose(); onEdit(selectedPatient); }}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                ✏ Edit Record
              </button>
            )}
            {onExportPDF && (
              <button
                onClick={() => onExportPDF(selectedPatient)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                📄 Export PDF
              </button>
            )}
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${darkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-700"}`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}