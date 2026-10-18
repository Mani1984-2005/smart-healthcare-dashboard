import { useState, useEffect, useMemo } from "react";
import DuplicateAlert from "../components/patient/DuplicateAlert";
import PriorityBadge from "../components/patient/PriorityBadge";
import PatientProfileModal from "../components/patient/PatientProfileModal";
import { generatePatientPDF, generatePatientSummary } from "../utils/patientPDF";
import {
  calculateAge, calculateBMI, getBMICategory, getRiskLevel, getClinicalAlerts,
  getPatientLabReports, getLatestVisit, getOutstandingBalance, getVisitCount,
  visitCountLabel, statusColor, riskColor, PRIORITY_OPTIONS,
  findDuplicate, buildQRPayload, dispatchPatientsUpdate, ageDisplay,
} from "../utils/patientHelpers";
import { StatCard, StatusBadge, ActionButton, PageHeader, SearchInput, Toast } from "../components/ui";
import { fetchPatients, createPatient, updatePatient } from "../api/patients";

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
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", age: "", gender: "Male", bloodGroup: "O+", phone: "", disease: "", address: "", status: "Active", priority: "Normal", emergencyContact: "", allergies: "", medicalHistory: "", visitNotes: "", photo: "" });
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverOnline, setServerOnline] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchPatients({ limit: 50 })
      .then((res) => {
        if (!mounted) return;
        setServerOnline(true);
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((p) => ({
            id: p.id,
            mrn: p.mrn,
            name: p.fullName || p.name,
            gender: p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : "Unspecified",
            phone: p.phone || "—",
            disease: Array.isArray(p.chronicConditions) ? p.chronicConditions.join(", ") : (p.disease || "—"),
            address: p.address || "",
            bloodGroup: p.bloodType || "O+",
            allergies: Array.isArray(p.knownAllergies) ? p.knownAllergies.join(", ") : (p.allergies || "None"),
            emergencyContact: p.emergencyContactPhone || p.emergencyContact || "—",
            status: p.isActive ? "Active" : "Discharged",
            priority: p.priority || "Normal",
            registeredDate: p.createdAt ? p.createdAt.split("T")[0] : "",
          }));
          setPatients(mapped);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn("[PatientsPage] Server check:", err.message);
        setServerOnline(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

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

  const handleExportSingle = (patientToExport) => {
    if (!patientToExport) {
      setToast({ message: "No patient selected for export.", type: "error" });
      return;
    }
    try {
      generatePatientPDF(patientToExport);
      setToast({
        message: `Medical report PDF generated for ${patientToExport.name || "patient"}.`,
        type: "success",
      });
    } catch (err) {
      console.error("[Patient Export Error]", err);
      setToast({
        message: `Export failed: ${err.message || "Could not generate PDF"}`,
        type: "error",
      });
    }
  };

  const handleHeaderExport = () => {
    try {
      if (selectedPatient) {
        generatePatientPDF(selectedPatient);
        setToast({ message: `Medical report PDF generated for ${selectedPatient.name || "patient"}.`, type: "success" });
      } else if (filtered.length === 1) {
        generatePatientPDF(filtered[0]);
        setToast({ message: `Medical report PDF generated for ${filtered[0].name || "patient"}.`, type: "success" });
      } else if (filtered.length > 1) {
        generatePatientSummary(filtered);
        setToast({ message: `Exported summary PDF for ${filtered.length} patients.`, type: "success" });
      } else if (patients.length > 0) {
        generatePatientSummary(patients);
        setToast({ message: `Exported summary PDF for ${patients.length} patients.`, type: "success" });
      } else {
        setToast({ message: "No patient records available to export.", type: "warning" });
      }
    } catch (err) {
      console.error("[Patient Export Error]", err);
      setToast({ message: `Export failed: ${err.message || "Could not generate PDF"}`, type: "error" });
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.age || !form.phone) {
      alert("Name, Age, and Phone are required.");
      return;
    }
    setApiError(null);
    setIsSubmitting(true);

    try {
      let serverData = null;
      if (form.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(form.id)) {
        const res = await updatePatient(form.id, form);
        if (!res?.success) throw new Error(res?.error?.message || "Failed to update record on server");
        serverData = res.data;
      } else {
        const res = await createPatient(form);
        if (!res?.success) throw new Error(res?.error?.message || "Failed to create record on server");
        serverData = res.data;
      }

      const savedPatient = {
        ...form,
        id: serverData?.id || form.id || `PAT-${Date.now()}`,
        mrn: serverData?.mrn || form.mrn,
        registeredDate: serverData?.createdAt ? serverData.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
      };

      if (patients.find((p) => p.id === savedPatient.id)) {
        setPatients((prev) => prev.map((p) => (p.id === savedPatient.id ? savedPatient : p)));
      } else {
        setPatients((prev) => [savedPatient, ...prev]);
      }

      setShowForm(false);
      setForm({ id: "", name: "", age: "", gender: "Male", bloodGroup: "O+", phone: "", disease: "", address: "", status: "Active", priority: "Normal", emergencyContact: "", allergies: "", medicalHistory: "", visitNotes: "", photo: "" });
    } catch (err) {
      console.error("[Patient API Error]", err);
      setApiError(`Server persistence failed: ${err.message || "Backend API unreachable"}. This record was NOT saved to the database.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this patient record?")) return;
    setPatients((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Gorgeous Photographic Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-900 via-cyan-900 to-blue-900 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-xl">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay z-0"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80')` }}
        />
        <div className="w-full relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
              👥 MediCare Pro Patient Records & Triage
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Patient Management CRM
            </h1>
            <p className="text-cyan-100 text-sm sm:text-base mt-2 max-w-2xl font-normal">
              Enterprise electronic health records, automated clinical triage, priority monitoring, and instant medical export.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className={`flex items-center rounded-xl border p-1 shadow-sm backdrop-blur-md ${darkMode ? "bg-slate-900/80 border-slate-700" : "bg-white/20 border-white/30"}`}>
              <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === "table" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-white hover:text-cyan-200"}`}>Table</button>
              <button onClick={() => setViewMode("cards")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === "cards" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-white hover:text-cyan-200"}`}>Cards</button>
            </div>
            {serverOnline !== null && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-md ${
                serverOnline
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-400/30"
              }`}>
                <span className={`w-2 h-2 rounded-full ${serverOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {serverOnline ? "API Online" : "API Offline"}
              </span>
            )}
            <ActionButton icon={() => "＋"} label="Add Patient" primary onClick={() => { setForm({ id: "", name: "", age: "", gender: "Male", bloodGroup: "O+", phone: "", disease: "", address: "", status: "Active", priority: "Normal", emergencyContact: "", allergies: "", medicalHistory: "", visitNotes: "", photo: "" }); setShowForm(true); }} />
            <ActionButton icon={() => "📄"} label="Export" variant="secondary" onClick={handleHeaderExport} disabled={patients.length === 0} />
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total Patients" value={stats.total} icon="👥" color="indigo" darkMode={darkMode} />
          <StatCard label="Active" value={stats.active} icon="●" color="emerald" darkMode={darkMode} />
          <StatCard label="Admitted" value={stats.admitted} icon="🏥" color="amber" darkMode={darkMode} />
          <StatCard label="Discharged" value={stats.discharged} icon="✓" color="slate" darkMode={darkMode} />
          <StatCard label="Emergency" value={stats.emergency} icon="🚨" color="rose" darkMode={darkMode} trend={stats.emergency > 0 ? 100 : 0} />
        </div>

        <div className={`p-5 rounded-2xl border mb-6 shadow-sm backdrop-blur-xl ${darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <SearchInput value={search} onChange={setSearch} placeholder="Search by name, ID, phone, or condition..." darkMode={darkMode} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`px-4 py-2.5 text-sm rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className={`px-4 py-2.5 text-sm rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
              {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={`px-4 py-2.5 text-sm rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
              {PRIORITY_OPTIONS_ALL.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {search && <span className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{filtered.length} result(s)</span>}
          </div>
        </div>

        {viewMode === "table" ? (
          <div className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? "bg-slate-900/90 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-xs font-bold uppercase tracking-wider ${darkMode ? "bg-slate-800/80 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Patient Name</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Condition</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50">
                  {filtered.map((r) => (
                    <tr key={r.id} onClick={() => setSelectedPatient(r)} className={`cursor-pointer transition-colors ${darkMode ? "hover:bg-slate-800/50 divide-slate-800" : "hover:bg-cyan-50/50 divide-slate-100"}`}>
                      <td className="px-6 py-4 font-mono text-xs text-cyan-500 font-semibold">{r.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold">{r.name}</div>
                        <div className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{r.gender} · {ageDisplay(r)} · {r.bloodGroup}</div>
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{r.phone}</td>
                      <td className={`px-6 py-4 text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{r.disease || "—"}</td>
                      <td className="px-6 py-4"><PriorityBadge level={r.priority} /></td>
                      <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setSelectedPatient(r)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 transition-colors">View</button>
                          <button onClick={() => { setForm({ ...r }); setShowForm(true); }} className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${darkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Edit</button>
                          <button onClick={() => handleDelete(r.id)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors">Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className={`font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>No patients match your filters.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => setSelectedPatient(p)} className={`rounded-2xl border p-5 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden ${darkMode ? "bg-slate-900/90 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md">
                    {p.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base truncate">{p.name}</p>
                    <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{p.gender} · {ageDisplay(p)} · {p.bloodGroup}</p>
                  </div>
                  {p.priority === "Emergency" && <span className="animate-pulse text-base">🚨</span>}
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Condition</span><span className={`text-xs font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{p.disease || "—"}</span></div>
                  <div className="flex justify-between"><span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Phone</span><span className={`text-xs font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{p.phone}</span></div>
                  <div className="flex justify-between"><span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Address</span><span className={`text-xs font-semibold truncate max-w-[140px] ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{p.address || "—"}</span></div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200/50">
                  <StatusBadge status={p.status} size="sm" />
                  <PriorityBadge level={p.priority} />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </button>
            ))}
          </div>
        )}

        <p className={`text-xs mt-6 text-center font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
          Showing {filtered.length} of {patients.length} patients
        </p>
      </div>

      {selectedPatient && (
        <PatientProfileModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onEdit={(patientToEdit) => {
            setForm({ ...patientToEdit });
            setShowForm(true);
            setSelectedPatient(null);
          }}
          onExportPDF={handleExportSingle}
          patients={patients}
          setPatients={setPatients}
          darkMode={darkMode}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className={`rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border ${darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-6 py-5 border-b ${darkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50/50"}`}>
              <h3 className="font-bold text-lg">{form.id ? "Edit Patient Record" : "Register New Patient"}</h3>
              <button onClick={() => setShowForm(false)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"}`}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Patient ID", name: "id", disabled: !!form.id },
                  { label: "Full Name", name: "name" },
                  { label: "Age", name: "age", type: "number" },
                  { label: "Phone", name: "phone" },
                  { label: "Disease / Condition", name: "disease" },
                  { label: "Address", name: "address" },
                  { label: "Emergency Contact", name: "emergencyContact" },
                  { label: "Allergies", name: "allergies" },
                ].map((f) => (
                  <div key={f.name}>
                    <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{f.label}</label>
                    <input type={f.type || "text"} name={f.name} value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })} disabled={f.disabled}
                      className={`w-full mt-1.5 px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all font-medium ${darkMode ? "bg-slate-800 border-slate-700 text-white disabled:bg-slate-900 disabled:text-slate-600" : "bg-white border-slate-200 text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"}`} />
                  </div>
                ))}
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Gender</label>
                  <select name="gender" value={form.gender} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className={`w-full mt-1.5 px-4 py-2.5 text-sm rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                    {["Male", "Female", "Other"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Blood Group</label>
                  <select name="bloodGroup" value={form.bloodGroup} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className={`w-full mt-1.5 px-4 py-2.5 text-sm rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Status</label>
                  <select name="status" value={form.status} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className={`w-full mt-1.5 px-4 py-2.5 text-sm rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                    {["Active", "Waiting", "Admitted", "Discharged"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Priority</label>
                  <select name="priority" value={form.priority} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className={`w-full mt-1.5 px-4 py-2.5 text-sm rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                    {["Normal", "Low", "High", "Emergency"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Visit Notes</label>
                <textarea name="visitNotes" value={form.visitNotes || ""} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })} rows={3}
                  className={`w-full mt-1.5 px-4 py-2.5 text-sm rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`} />
              </div>
              {apiError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-start gap-2.5">
                  <span className="text-base leading-none">⚠️</span>
                  <div className="flex-1">
                    <p className="font-bold">Server Save Error</p>
                    <p className="mt-0.5">{apiError}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <ActionButton icon={() => null} label={isSubmitting ? "Saving to Server..." : form.id ? "Update Patient" : "Register Patient"} primary onClick={handleSubmit} disabled={isSubmitting} />
                <ActionButton icon={() => null} label="Cancel" variant="secondary" onClick={() => setShowForm(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
