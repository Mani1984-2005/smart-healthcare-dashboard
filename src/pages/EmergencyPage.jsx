import { useMemo, useState } from "react";
import { StatCard, StatusBadge, ActionButton } from "../components/ui";

const initialCases = [
  { id: "EMG-1001", patientName: "Ravi Kumar", phone: "9876543210", condition: "Breathing difficulty", priority: "Critical", location: "ER Entrance", routeTo: "Emergency Ward", createdAt: "2026-06-15", status: "Waiting" },
];

export default function EmergencyPage({ darkMode }) {
  const [cases, setCases] = useState(initialCases);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [condition, setCondition] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [location, setLocation] = useState("");
  const [routeTo, setRouteTo] = useState("Emergency Ward");

  const sortedCases = useMemo(() => {
    const weight = { Critical: 0, High: 1, Normal: 2 };
    return [...cases].sort((a, b) => weight[a.priority] - weight[b.priority]);
  }, [cases]);

  const createEmergencyCase = () => {
    if (!patientName.trim() || !condition.trim()) return;
    setCases((prev) => [{ id: `EMG-${Date.now()}`, patientName, phone, condition, priority, location, routeTo, createdAt: new Date().toISOString().split("T")[0], status: priority === "Critical" ? "Immediate Routing" : "Waiting" }, ...prev]);
    setPatientName(""); setPhone(""); setCondition(""); setPriority("Normal"); setLocation(""); setRouteTo("Emergency Ward");
  };

  const cardBg = darkMode ? "bg-slate-900/90 text-white border-slate-800" : "bg-white/90 text-slate-900 border-slate-200";
  const inputClass = `w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`;

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Gorgeous Photographic Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-rose-950 via-rose-900 to-red-900 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-xl">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay z-0"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1600&q=80')` }}
        />
        <div className="w-full relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
              🚨 MediCare Pro Emergency & Trauma Triage
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Emergency Response Command Center
            </h1>
            <p className="text-rose-100 text-sm sm:text-base mt-2 max-w-2xl font-normal">
              24/7 critical care triage, rapid ambulance dispatch, real-time vital monitoring, and immediate ward routing.
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/20 border border-rose-400/30 text-rose-200 font-bold text-sm backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" /> Emergency Hotline: 108 / 911
            </span>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Cases" value={cases.length} icon="👥" color="rose" darkMode={darkMode} />
          <StatCard label="Critical" value={cases.filter((c) => c.priority === "Critical").length} icon="🚨" color="rose" darkMode={darkMode} />
          <StatCard label="High Priority" value={cases.filter((c) => c.priority === "High").length} icon="⚠️" color="amber" darkMode={darkMode} />
          <StatCard label="Normal" value={cases.filter((c) => c.priority === "Normal").length} icon="✓" color="emerald" darkMode={darkMode} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${cardBg} rounded-2xl p-6 border shadow-lg lg:col-span-2 backdrop-blur-xl`}>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <span>⚡</span> Register Emergency Case
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Patient Name</label>
                <input className={`mt-1.5 ${inputClass}`} placeholder="Full Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Phone Number</label>
                <input className={`mt-1.5 ${inputClass}`} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Condition / Complaint</label>
                <input className={`mt-1.5 ${inputClass}`} placeholder="e.g. Chest Pain, Trauma" value={condition} onChange={(e) => setCondition(e.target.value)} />
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Location / Source</label>
                <input className={`mt-1.5 ${inputClass}`} placeholder="e.g. ER Entrance" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Priority Level</label>
                <select className={`mt-1.5 ${inputClass}`} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Route To Unit</label>
                <select className={`mt-1.5 ${inputClass}`} value={routeTo} onChange={(e) => setRouteTo(e.target.value)}>
                  <option>Emergency Ward</option>
                  <option>ICU</option>
                  <option>Trauma Room</option>
                  <option>Cardiology</option>
                  <option>General ER</option>
                </select>
              </div>
            </div>
            <div className="mt-6">
              <ActionButton onClick={createEmergencyCase} label="Dispatch Emergency Case" primary size="lg" />
            </div>
          </div>

          <div className={`${cardBg} rounded-2xl p-6 border shadow-lg backdrop-blur-xl`}>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <span>📋</span> Emergency Queue
            </h2>
            <div className="space-y-3.5 max-h-[600px] overflow-auto pr-1">
              {sortedCases.map((c) => (
                <div key={c.id} className={`p-4 rounded-2xl border transition-all ${darkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <div className="font-bold text-base">{c.patientName}</div>
                      <div className={`text-xs font-mono mt-0.5 ${darkMode ? "text-cyan-400" : "text-cyan-600"}`}>{c.id}</div>
                    </div>
                    <StatusBadge status={c.priority} />
                  </div>
                  <p className={`text-sm font-medium mt-1 ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{c.condition}</p>
                  <div className={`flex justify-between items-center mt-3 pt-2.5 border-t text-xs ${darkMode ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                    <span>Route: <strong className="text-rose-500">{c.routeTo}</strong></span>
                    <span>{c.status}</span>
                  </div>
                </div>
              ))}
              {sortedCases.length === 0 && (
                <div className="text-center py-12 text-slate-400">No active emergency cases.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
