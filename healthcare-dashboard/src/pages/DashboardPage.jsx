import { useState, useEffect, useMemo } from "react";
import { DOCTORS } from "../data/doctors";
import { generateToken } from "../utils/tokenGenerator";
import { getSymptomSuggestion } from "../utils/symptomSuggestion";
import LiveClock from "../components/LiveClock";
import AnnouncementsPanel from "../components/AnnouncementsPanel";
import { StatCard, StatusBadge, ActionButton, PageHeader, SearchInput, DataTable } from "../components/ui";

const emptyForm = { patient: "", age: "", phone: "", symptoms: "", date: "", time: "" };

const activityFeed = [
  { id: 1, user: "Dr. Arjun Raza", action: "completed a consultation", target: "Patient Ravi", time: "2 min ago", type: "consultation" },
  { id: 2, user: "Nurse Priya", action: "admitted", target: "Patient Sunita", time: "8 min ago", type: "admission" },
  { id: 3, user: "Lab Report", action: "results available for", target: "Patient Aman", time: "15 min ago", type: "lab" },
  { id: 4, user: "Reception", action: "booked appointment for", target: "Dr. Sharma", time: "22 min ago", type: "appointment" },
  { id: 5, user: "Pharmacy", action: "dispensed medicine to", target: "Patient Neha", time: "35 min ago", type: "pharmacy" },
  { id: 6, user: "Dr. Vikram", action: "requested MRI for", target: "Patient Meera", time: "1h ago", type: "lab" },
];

export default function DashboardPage({
  darkMode, userRole, appointments, setAppointments, addToast, preselectedDoctor, clearPreselectedDoctor,
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [specialization, setSpecialization] = useState("All");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("All");
  const [patients, setPatients] = useState([]);

  const loadPatients = () => {
    try { const p = JSON.parse(localStorage.getItem("patients")) || []; setPatients(p); }
    catch { setPatients([]); }
  };

  useEffect(() => {
    loadPatients();
    const handler = () => loadPatients();
    window.addEventListener("patientsUpdated", handler);
    window.addEventListener("storage", handler);
    return () => { window.removeEventListener("patientsUpdated", handler); window.removeEventListener("storage", handler); };
  }, []);

  useEffect(() => {
    if (preselectedDoctor) { setSelectedDoctor(preselectedDoctor); clearPreselectedDoctor(); }
  }, [preselectedDoctor, clearPreselectedDoctor]);

  const updateForm = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const resetForm = () => { setFormData(emptyForm); setSelectedDoctor(null); setEditingId(null); };

  const validateForm = () => {
    if (!selectedDoctor) return "Please select a doctor.";
    if (selectedDoctor.status === "Unavailable") return `${selectedDoctor.name} is unavailable.`;
    if (!formData.patient.trim()) return "Please enter patient name.";
    if (!formData.age || Number(formData.age) < 1 || Number(formData.age) > 120) return "Age must be between 1 and 120.";
    if (!formData.phone.trim()) return "Please enter phone number.";
    if (!/^\d{10}$/.test(formData.phone.trim())) return "Phone number must be exactly 10 digits.";
    if (!formData.symptoms.trim()) return "Please enter symptoms.";
    if (!formData.date) return "Please select date.";
    if (!formData.time) return "Please select time.";
    if (new Date(`${formData.date} ${formData.time}`) < new Date()) return "Appointment must be in the future.";
    return null;
  };

  const handleBooking = () => {
    const error = validateForm();
    if (error) { addToast("Check details", error, "error"); return; }
    const duplicate = appointments.some((item) => item.id !== editingId && item.doctor.toLowerCase() === selectedDoctor.name.toLowerCase() && item.date === formData.date && item.time === formData.time);
    if (duplicate) { addToast("Duplicate booking", "This slot is already booked for this doctor.", "error"); return; }
    if (editingId) {
      setAppointments((prev) => prev.map((item) => item.id === editingId ? { ...item, patient: formData.patient.trim(), age: Number(formData.age), phone: formData.phone.trim(), symptoms: formData.symptoms.trim(), date: formData.date, time: formData.time, doctor: selectedDoctor.name, spec: selectedDoctor.spec } : item));
      addToast("Appointment updated", "Changes saved successfully.", "success"); resetForm(); return;
    }
    const token = generateToken();
    const newAppointment = { id: `${Date.now()}-${Math.random()}`, token, patient: formData.patient.trim(), age: Number(formData.age), phone: formData.phone.trim(), symptoms: formData.symptoms.trim(), date: formData.date, time: formData.time, doctor: selectedDoctor.name, spec: selectedDoctor.spec, status: "Pending", bookedAt: new Date().toISOString() };
    const existingPatients = JSON.parse(localStorage.getItem("patients")) || [];
    const patientExists = existingPatients.some((p) => p.phone === newAppointment.phone || p.name?.toLowerCase() === newAppointment.patient.toLowerCase());
    let updatedPatients = existingPatients;
    if (patientExists) {
      updatedPatients = existingPatients.map((p) => {
        if (!(p.phone === newAppointment.phone || p.name?.toLowerCase() === newAppointment.patient.toLowerCase())) return p;
        return { ...p, timeline: [...(p.timeline || []), { id: Date.now(), date: newAppointment.date, type: "Appointment", title: "Appointment Booked", details: `Token ${newAppointment.token} with ${newAppointment.doctor} on ${newAppointment.date} at ${newAppointment.time}.` }] };
      });
    } else {
      updatedPatients = [{ id: `PAT-${Date.now()}`, name: newAppointment.patient, age: newAppointment.age, gender: "Male", bloodGroup: "O+", phone: newAppointment.phone, disease: newAppointment.symptoms, address: "Not provided", emergencyContact: "", allergies: "", medicalHistory: "", visitNotes: "Created from dashboard appointment booking", photo: "", photoSource: "Browse Photo", registeredDate: new Date().toISOString().split("T")[0], timeline: [{ id: Date.now(), date: new Date().toISOString().split("T")[0], type: "Registration", title: "Patient Auto Registered", details: "Patient created from Dashboard appointment booking." }, { id: Date.now() + 1, date: newAppointment.date, type: "Appointment", title: "Appointment Booked", details: `Token ${newAppointment.token} with ${newAppointment.doctor} on ${newAppointment.date} at ${newAppointment.time}.` }] }, ...existingPatients];
    }
    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    window.dispatchEvent(new Event("patientsUpdated"));
    setAppointments((prev) => [newAppointment, ...prev]);
    addToast("Appointment booked", `Token: ${token}`, "success");
    resetForm();
  };

  const startEdit = (appt) => {
    const doctor = DOCTORS.find((d) => d.name === appt.doctor);
    setEditingId(appt.id); setSelectedDoctor(doctor || DOCTORS[0]);
    setFormData({ patient: appt.patient, age: appt.age, phone: appt.phone || "", symptoms: appt.symptoms, date: appt.date, time: appt.time });
    window.scrollTo({ top: 0, behavior: "smooth" });
    addToast("Edit mode active", appt.token, "info");
  };

  const deleteAppointment = (id) => { setAppointments((prev) => prev.filter((a) => a.id !== id)); addToast("Deleted", "Appointment removed.", "info"); };
  const updateStatus = (id, status) => { setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a)); addToast("Status updated", `Marked as ${status}.`, "success"); };
  const clearAll = () => { if (!window.confirm("Clear all appointments?")) return; setAppointments([]); addToast("Cleared", "All appointments removed.", "info"); };

  const specializations = useMemo(() => ["All", ...new Set(DOCTORS.map((d) => d.spec))], []);
  const filteredDoctors = DOCTORS.filter((d) => {
    const q = doctorSearch.toLowerCase();
    return (d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q)) && (specialization === "All" || d.spec === specialization);
  });

  const pendingCount = appointments.filter((a) => a.status === "Pending").length;
  const confirmedCount = appointments.filter((a) => a.status === "Confirmed").length;
  const completedCount = appointments.filter((a) => a.status === "Completed").length;
  const todayPatients = patients.filter((p) => p.registeredDate === new Date().toISOString().split("T")[0]).length;
  const totalPatients = patients.length;
  const completionRate = appointments.length > 0 ? Math.round((completedCount / appointments.length) * 100) : 0;

  const filteredHistory = appointments.filter((a) => {
    const q = historySearch.toLowerCase();
    return (a.patient.toLowerCase().includes(q) || a.token.toLowerCase().includes(q) || a.doctor.toLowerCase().includes(q) || a.symptoms.toLowerCase().includes(q)) && (historyStatus === "All" || a.status === historyStatus);
  });

  const symptomSuggestion = getSymptomSuggestion(formData.symptoms);
  const isPatient = userRole === "Patient";

  const kpiCards = [
    { label: "Today's Patients", value: todayPatients, icon: "👤", color: "indigo", sub: `${patients.length} total registered` },
    { label: "Pending Appointments", value: pendingCount, icon: "⏳", color: "amber", sub: `${confirmedCount} confirmed` },
    { label: "Completed", value: completedCount, icon: "✓", color: "emerald", sub: `${completionRate}% rate` },
    { label: "Available Doctors", value: DOCTORS.filter((d) => d.status === "Available").length, icon: "👨‍⚕️", color: "cyan", sub: `${DOCTORS.length} total` },
  ];

  const appointmentColumns = [
    { key: "token", label: "Token", render: (r) => <span className="font-mono text-indigo-600 font-semibold">{r.token}</span> },
    { key: "patient", label: "Patient" },
    { key: "doctor", label: "Doctor" },
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "symptoms", label: "Symptoms" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, badge: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">

        <PageHeader
          title="Hospital Dashboard"
          subtitle={`${userRole} · Live overview of hospital operations`}
          icon="🏥"
          actions={
            <>
              <LiveClock darkMode={false} />
              {!isPatient && <ActionButton icon={() => null} label="Export Report" variant="ghost" />}
            </>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {kpiCards.map((kpi) => <StatCard key={kpi.label} {...kpi} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Today's Activity
            </h3>
            <div className="relative pl-6 space-y-0">
              {activityFeed.map((item, i) => (
                <div key={item.id} className="relative pb-5 last:pb-0">
                  {i < activityFeed.length - 1 && <div className="absolute left-0 top-3 bottom-0 w-px bg-slate-200" />}
                  <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-indigo-500 bg-white" />
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">{item.user}</span>{" "}
                    <span className="text-slate-500">{item.action}</span>{" "}
                    <span className="font-medium text-slate-700">{item.target}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Quick Actions
            </h3>
            <div className="space-y-2.5">
              <ActionButton icon={() => "📅"} label="Book Appointment" primary onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })} />
              <ActionButton icon={() => "👤"} label="Register Patient" onClick={() => { const e = new CustomEvent("navigate", { detail: "Patients" }); window.dispatchEvent(e); }} />
              <ActionButton icon={() => "💊"} label="Pharmacy" onClick={() => { const e = new CustomEvent("navigate", { detail: "Pharmacy" }); window.dispatchEvent(e); }} />
              <ActionButton icon={() => "🔬"} label="Laboratory" onClick={() => { const e = new CustomEvent("navigate", { detail: "Laboratory" }); window.dispatchEvent(e); }} />
              <ActionButton icon={() => "📊"} label="Reports" onClick={() => { const e = new CustomEvent("navigate", { detail: "Reports" }); window.dispatchEvent(e); }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Appointment Summary
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Pending", value: pendingCount, color: "bg-amber-500", text: "text-amber-600" },
                { label: "Confirmed", value: confirmedCount, color: "bg-cyan-500", text: "text-cyan-600" },
                { label: "Completed", value: completedCount, color: "bg-emerald-500", text: "text-emerald-600" },
              ].map((s) => (
                <div key={s.label} className="text-center p-4 rounded-xl bg-slate-50">
                  <div className={`w-8 h-8 rounded-full ${s.color} mx-auto mb-2 opacity-80`} />
                  <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              Emergency & Bed Availability
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "General Beds", val: "42 / 120", sub: "Available now", cls: "bg-emerald-50 text-emerald-700" },
                { label: "ICU Beds", val: "8 / 20", sub: "Critical care ready", cls: "bg-cyan-50 text-cyan-700" },
                { label: "Emergency", val: "24/7", sub: "Call: 108", cls: "bg-rose-50 text-rose-700" },
                { label: "Oxygen Support", val: "Available", sub: "Ambulance ready", cls: "bg-violet-50 text-violet-700" },
              ].map((b) => (
                <div key={b.label} className={`${b.cls} p-4 rounded-xl border border-transparent`}>
                  <p className="text-xs font-medium opacity-70">{b.label}</p>
                  <p className="text-xl font-bold mt-0.5">{b.val}</p>
                  <p className="text-xs mt-0.5 opacity-70">{b.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Appointment Queue
          </h3>
          <DataTable
            columns={appointmentColumns}
            data={appointments}
            emptyMessage="No appointments booked yet."
            actions={(row) => (
              <div className="flex gap-1">
                {["Pending", "Confirmed", "Completed"].map((s) => (
                  <button key={s} onClick={() => updateStatus(row.id, s)} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors">{s}</button>
                ))}
                <button onClick={() => startEdit(row)} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700">Edit</button>
                <button onClick={() => deleteAppointment(row.id)} className="px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700">Del</button>
              </div>
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8" id="booking-section">
          {!isPatient && (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Book Appointment
              </h3>

              <div className="space-y-4 mb-5">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <SearchInput value={doctorSearch} onChange={setDoctorSearch} placeholder="Search doctor..." />
                  </div>
                  <select value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                    className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                    {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto">
                  {filteredDoctors.map((doctor) => (
                    <button key={doctor.id} onClick={() => setSelectedDoctor(doctor)}
                      className={`text-left border rounded-xl p-3 transition-all hover:shadow-md ${
                        selectedDoctor?.id === doctor.id
                          ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-indigo-300 bg-white"
                      }`}>
                      <p className="text-sm font-semibold text-slate-800">{doctor.name}</p>
                      <p className="text-xs text-indigo-500">{doctor.spec}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${doctor.status === "Available" ? "bg-emerald-500" : "bg-red-500"}`} />
                        <span className="text-[10px] text-slate-400">{doctor.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedDoctor && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 mb-4">
                  <span className="text-lg">👨‍⚕️</span>
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">{selectedDoctor.name} · {selectedDoctor.spec}</p>
                    <p className="text-xs text-indigo-500">⭐ {selectedDoctor.rating}/5 · {selectedDoctor.exp}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                {["patient", "age", "phone", "symptoms"].map((f) => (
                  <input key={f} type={f === "age" ? "number" : "text"} value={formData[f]}
                    onChange={(e) => updateForm(f, e.target.value)}
                    placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                    className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                  />
                ))}
                <input type="date" value={formData.date} onChange={(e) => updateForm("date", e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
                <input type="time" value={formData.time} onChange={(e) => updateForm("time", e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
              </div>

              {symptomSuggestion && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 mb-4 text-sm">
                  <p className="font-semibold text-indigo-800">🤖 AI Suggestion: <span className="font-normal">{symptomSuggestion.doctor}</span></p>
                  <p className="text-xs text-indigo-600 mt-0.5">{symptomSuggestion.advice}</p>
                </div>
              )}

              <div className="flex gap-3">
                <ActionButton icon={() => null} label={editingId ? "Update" : "Book Appointment"} primary onClick={handleBooking} />
                <ActionButton icon={() => null} label="Cancel" variant="ghost" onClick={resetForm} />
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Patient History
            </h3>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <SearchInput value={historySearch} onChange={setHistorySearch} placeholder="Search by patient, token, doctor..." />
              </div>
              <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value)}
                className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <DataTable columns={[
              { key: "token", label: "Token", render: (r) => <span className="font-mono text-indigo-600 font-semibold text-xs">{r.token}</span> },
              { key: "patient", label: "Patient" },
              { key: "doctor", label: "Doctor" },
              { key: "date", label: "Date" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]} data={filteredHistory} emptyMessage="No patient history found." />
          </div>
        </div>

        <div className="mt-8">
          <AnnouncementsPanel darkMode={darkMode} />
        </div>

      </div>
    </div>
  );
}
