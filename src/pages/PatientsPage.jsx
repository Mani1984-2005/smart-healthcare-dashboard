import { useState, useEffect, useMemo } from "react";
import DuplicateAlert from "../components/patient/DuplicateAlert";
import PriorityBadge from "../components/patient/PriorityBadge";
import { generatePatientPDF } from "../utils/patientPDF";
import {
  calculateAge, calculateBMI, getBMICategory, getRiskLevel, getClinicalAlerts,
  getPatientLabReports, getLatestVisit, getOutstandingBalance, getVisitCount,
  visitCountLabel, statusColor, riskColor, PRIORITY_OPTIONS,
  findDuplicate, buildQRPayload, dispatchPatientsUpdate, ageDisplay,
} from "../utils/patientHelpers";
import { StatCard, StatusBadge, ActionButton, PageHeader, SearchInput, DataTable } from "../components/ui";

const initialPatients = [
  { id: "PAT-1001", name: "Ravi Kumar", age: "32", dob: "", gender: "Male", bloodGroup: "O+", phone: "9876543210", disease: "Fever", address: "Davangere", status: "Waiting", priority: "Normal", registeredDate: "2026-06-15", photo: "", govIdType: "", govIdNumber: "", emergencyContact: "", allergies: "None", medicalHistory: "", visitNotes: "Initial visit" },
  { id: "PAT-1002", name: "Sneha Patel", age: "28", dob: "", gender: "Female", bloodGroup: "A+", phone: "9876543211", disease: "Diabetes", address: "Bangalore", status: "Admitted", priority: "High", registeredDate: "2026-06-10", photo: "", govIdType: "Aadhaar", govIdNumber: "1234-5678-9012", emergencyContact: "9876543212", allergies: "Penicillin", medicalHistory: "Type 2 Diabetes", visitNotes: "Under observation" },
  { id: "PAT-1003", name: "Amit Singh", age: "45", dob: "", gender: "Male", bloodGroup: "B+", phone: "9876543213", disease: "Hypertension", address: "Mysore", status: "Active", priority: "Normal", registeredDate: "2026-06-05", photo: "", govIdType: "", govIdNumber: "" },
  { id: "PAT-1004", name: "Priya Sharma", age: "35", dob: "", gender: "Female", bloodGroup: "AB+", phone: "9876543214", disease: "Thyroid", address: "Hubli", status: "Discharged", priority: "Low", registeredDate: "2026-05-28", photo: "", govIdType: "PAN", govIdNumber: "ABCDE1234F" },
  { id: "PAT-1005", name: "Venkatesh Rao", age: "55", dob: "", gender: "Male", bloodGroup: "A-", phone: "9876543215", disease: "Heart Disease", address: "Belgaum", status: "Admitted", priority: "Emergency", registeredDate: "2026-06-12", photo: "", allergies: "Aspirin" },
  { id: "PAT-1006", name: "Lakshmi Devi", age: "60", dob: "", gender: "Female", bloodGroup: "O-", phone: "9876543216", disease: "Arthritis", address: "Shimoga", status: "Active", priority: "Normal", registeredDate: "2026-06-01" },
];

const STATUS_OPTIONS = ["All", "Active", "Waiting", "Admitted", "Discharged"];
const GENDER_OPTIONS = ["All", "Male", "Female", "Other"];
const PRIORITY_OPTIONS_ALL = ["All", "Emergency", "High", "Normal", "Low"];

export default function PatientsPage({ darkMode }) {
  const [patients, setPatients] = useState(() => {
    try { return JSON.parse(localStorage.getItem("patients")) || initialPatients; }
    catch { return initialPatients; }
  });
const handleGenerateReport = () => {
  if (!selectedPatient) return;

  generatePatientPDF(selectedPatient);
};
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", age: "", gender: "Male", bloodGroup: "O+", phone: "", disease: "", address: "", status: "Active", priority: "Normal", emergencyContact: "", allergies: "", medicalHistory: "", visitNotes: "", photo: "" });

  useEffect(() => {
    localStorage.setItem("patients", JSON.stringify(patients));
    dispatchPatientsUpdate();
  }, [patients]);

  const filtered = useMemo(() => patients.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q) || p.phone?.includes(q) || p.disease?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    const matchGender = genderFilter === "All" || p.gender === genderFilter;
    const matchPriority = priorityFilter === "All" || p.priority === priorityFilter;
    return matchSearch && matchStatus && matchGender && matchPriority;
  }), [patients, search, statusFilter, genderFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: patients.length,
    active: patients.filter((p) => p.status === "Active").length,
    admitted: patients.filter((p) => p.status === "Admitted").length,
    discharged: patients.filter((p) => p.status === "Discharged").length,
    emergency: patients.filter((p) => p.priority === "Emergency").length,
  }), [patients]);

  const handleSubmit = () => {
    if (!form.name || !form.age || !form.phone) { alert("Name, Age, and Phone are required."); return; }
    const newPatient = {
      ...form,
      id: form.id || `PAT-${Date.now()}`,
      registeredDate: form.registeredDate || new Date().toISOString().split("T")[0],
    };
    if (patients.find((p) => p.id === newPatient.id)) {
      setPatients((prev) => prev.map((p) => p.id === newPatient.id ? newPatient : p));
    } else {
      setPatients((prev) => [newPatient, ...prev]);
    }
    setShowForm(false); setForm({ id: "", name: "", age: "", gender: "Male", bloodGroup: "O+", phone: "", disease: "", address: "", status: "Active", priority: "Normal", emergencyContact: "", allergies: "", medicalHistory: "", visitNotes: "", photo: "" });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this patient record?")) return;
    setPatients((prev) => prev.filter((p) => p.id !== id));
  };

  const columns = [
    { key: "id", label: "ID", render: (r) => <span className="font-mono text-xs text-slate-400">{r.id}</span> },
    { key: "name", label: "Name", render: (r) => <div><p className="font-medium text-slate-800">{r.name}</p><p className="text-xs text-slate-400">{r.gender} · {ageDisplay(r)}</p></div> },
    { key: "phone", label: "Phone" },
    { key: "disease", label: "Condition", render: (r) => <span className="text-sm">{r.disease || "—"}</span> },
    { key: "priority", label: "Priority", render: (r) => <PriorityBadge level={r.priority} /> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <PageHeader
          title="Patient Management"
          subtitle="CRM-style patient records with priority triage"
          icon="👤"
          actions={
            <>
              <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-sm">
                <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === "table" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Table</button>
                <button onClick={() => setViewMode("cards")} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === "cards" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Cards</button>
              </div>
              <ActionButton icon={() => "＋"} label="Add Patient" primary onClick={() => { setForm({ id: "", name: "", age: "", gender: "Male", bloodGroup: "O+", phone: "", disease: "", address: "", status: "Active", priority: "Normal", emergencyContact: "", allergies: "", medicalHistory: "", visitNotes: "", photo: "" }); setShowForm(true); }} />
              <ActionButton icon={() => "📄"} label="Export" variant="ghost" />
            </>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total Patients" value={stats.total} icon="👥" color="indigo" />
          <StatCard label="Active" value={stats.active} icon="●" color="emerald" />
          <StatCard label="Admitted" value={stats.admitted} icon="🏥" color="amber" />
          <StatCard label="Discharged" value={stats.discharged} icon="✓" color="slate" />
          <StatCard label="Emergency" value={stats.emergency} icon="🚨" color="rose" trend={stats.emergency > 0 ? 100 : 0} />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex-1 min-w-[240px]"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, ID, phone, or condition..." /></div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
            {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
            {PRIORITY_OPTIONS_ALL.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {search && <span className="text-xs text-slate-400">{filtered.length} result(s)</span>}
        </div>

        {viewMode === "table" ? (
          <DataTable
            columns={columns}
            data={filtered}
            onRowClick={setSelectedPatient}
            emptyMessage="No patients match your filters."
            actions={(row) => (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); setSelectedPatient(row); }} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors">View</button>
                <button onClick={(e) => { e.stopPropagation(); setForm({ ...row }); setShowForm(true); }} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700">Edit</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700">Del</button>
              </div>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => setSelectedPatient(p)} className="bg-white rounded-2xl border border-slate-200/70 p-5 text-left shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {p.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.gender} · {ageDisplay(p)} · {p.bloodGroup}</p>
                  </div>
                  {p.priority === "Emergency" && <span className="animate-pulse text-xs">🚨</span>}
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400 text-xs">Condition</span><span className="text-slate-700 text-xs font-medium">{p.disease || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 text-xs">Phone</span><span className="text-slate-700 text-xs">{p.phone}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 text-xs">Address</span><span className="text-slate-700 text-xs truncate max-w-[120px]">{p.address || "—"}</span></div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <StatusBadge status={p.status} size="sm" />
                  <PriorityBadge level={p.priority} />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-4 text-center">
          Showing {filtered.length} of {patients.length} patients
        </p>
      </div>

      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end" onClick={() => setSelectedPatient(null)}>
          <div className="w-full max-w-lg bg-white shadow-2xl h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-semibold text-slate-800">Patient Profile</h3>
              <button onClick={() => setSelectedPatient(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">{selectedPatient.name?.charAt(0) || "?"}</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedPatient.name}</h2>
                  <p className="text-sm text-slate-500">{selectedPatient.id} · {selectedPatient.gender} · {ageDisplay(selectedPatient)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Blood Group", selectedPatient.bloodGroup], ["Phone", selectedPatient.phone],
                  ["Disease", selectedPatient.disease], ["Priority", selectedPatient.priority],
                  ["Status", selectedPatient.status], ["Address", selectedPatient.address],
                  ["Allergies", selectedPatient.allergies || "None"], ["Emergency Contact", selectedPatient.emergencyContact || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{k}</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{v || "—"}</p>
                  </div>
                ))}
              </div>
              {selectedPatient.timeline?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Medical Timeline</p>
                  <div className="relative pl-5 space-y-0 max-h-48 overflow-y-auto">
                    {selectedPatient.timeline.slice(-10).map((event, i, arr) => (
                      <div key={event.id} className="relative pb-4 last:pb-0">
                        {i < arr.length - 1 && <div className="absolute left-[3px] top-3 bottom-0 w-px bg-slate-200" />}
                        <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full border-2 ${event.type === "Appointment" ? "border-indigo-500" : event.type === "Registration" ? "border-emerald-500" : "border-amber-500"} bg-white`} />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-700">{event.title}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{event.details}</p>
                          <p className="text-[9px] text-slate-300 mt-0.5">{event.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2.5">
                <ActionButton icon={() => null} label="Edit Record" primary onClick={() => { setForm({ ...selectedPatient }); setShowForm(true); setSelectedPatient(null); }} />
                <ActionButton icon={() => null} label="Generate Report" variant="ghost" onClick={handleGenerateReport} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">{form.id ? "Edit Patient" : "Register New Patient"}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Patient ID", name: "id", disabled: !!form.id },
                  { label: "Full Name", name: "name" },
                  { label: "Age", name: "age", type: "number" },
                  { label: "Phone", name: "phone" },
                  { label: "Disease/Condition", name: "disease" },
                  { label: "Address", name: "address" },
                  { label: "Emergency Contact", name: "emergencyContact" },
                  { label: "Allergies", name: "allergies" },
                ].map((f) => (
                  <div key={f.name}>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{f.label}</label>
                    <input type={f.type || "text"} name={f.name} value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })} disabled={f.disabled}
                      className="w-full mt-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all disabled:bg-slate-50 disabled:text-slate-400" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</label>
                  <select name="gender" value={form.gender} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                    {["Male", "Female", "Other"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blood Group</label>
                  <select name="bloodGroup" value={form.bloodGroup} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                  <select name="status" value={form.status} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                    {["Active", "Waiting", "Admitted", "Discharged"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</label>
                  <select name="priority" value={form.priority} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                    {["Normal", "Low", "High", "Emergency"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Visit Notes</label>
                <textarea name="visitNotes" value={form.visitNotes || ""} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })} rows={3}
                  className="w-full mt-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
              </div>
              <div className="flex gap-3 pt-2">
                <ActionButton icon={() => null} label={form.id ? "Update Patient" : "Register Patient"} primary onClick={handleSubmit} />
                <ActionButton icon={() => null} label="Cancel" variant="ghost" onClick={() => setShowForm(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
