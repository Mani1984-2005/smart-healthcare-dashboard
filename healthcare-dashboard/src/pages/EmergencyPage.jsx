// src/pages/EmergencyPage.jsx
import { useMemo, useState } from "react";

const initialCases = [
  {
    id: "EMG-1001",
    patientName: "Ravi Kumar",
    phone: "9876543210",
    condition: "Breathing difficulty",
    priority: "Critical",
    location: "ER Entrance",
    routeTo: "Emergency Ward",
    createdAt: "2026-06-15",
    status: "Waiting",
  },
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

    const newCase = {
      id: `EMG-${Date.now()}`,
      patientName,
      phone,
      condition,
      priority,
      location,
      routeTo,
      createdAt: new Date().toISOString().split("T")[0],
      status: priority === "Critical" ? "Immediate Routing" : "Waiting",
    };

    setCases((prev) => [newCase, ...prev]);
    setPatientName("");
    setPhone("");
    setCondition("");
    setPriority("Normal");
    setLocation("");
    setRouteTo("Emergency Ward");
  };

  const priorityColor = (p) => {
    if (p === "Critical") return "bg-red-600 text-white";
    if (p === "High") return "bg-orange-500 text-white";
    return "bg-green-600 text-white";
  };

  const cardBg = darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900";
  const inputClass = `w-full border rounded-lg p-2 text-sm ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`;

  return (
    <div className={`min-h-screen p-6 ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Emergency</h1>
          <p className="text-sm text-slate-500">Emergency case creation, priority tagging, and fast routing</p>
        </div>
        <div className="text-sm font-semibold">Cases: {cases.length}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardBg} rounded-2xl p-5 shadow lg:col-span-2`}>
          <h2 className="text-lg font-bold mb-4">Create Emergency Case</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            <input className={inputClass} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className={inputClass} placeholder="Condition / Complaint" value={condition} onChange={(e) => setCondition(e.target.value)} />
            <input className={inputClass} placeholder="Location / Source" value={location} onChange={(e) => setLocation(e.target.value)} />
            <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option>Normal</option>
              <option>High</option>
              <option>Critical</option>
            </select>
            <select className={inputClass} value={routeTo} onChange={(e) => setRouteTo(e.target.value)}>
              <option>Emergency Ward</option>
              <option>ICU</option>
              <option>Trauma Room</option>
              <option>Cardiology</option>
              <option>General ER</option>
            </select>
          </div>

          <button type="button" onClick={createEmergencyCase} className="mt-4 px-5 py-2 rounded-lg bg-red-600 text-white font-semibold">
            Create Emergency Case
          </button>
        </div>

        <div className={`${cardBg} rounded-2xl p-5 shadow`}>
          <h2 className="text-lg font-bold mb-4">Emergency Queue</h2>
          <div className="space-y-3 max-h-[650px] overflow-auto">
            {sortedCases.map((c) => (
              <div key={c.id} className={`p-3 rounded-xl border ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-semibold">{c.patientName}</div>
                    <div className="text-xs text-slate-500">{c.id}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${priorityColor(c.priority)}`}>{c.priority}</span>
                </div>
                <div className="text-sm mt-2">{c.condition}</div>
                <div className="text-xs text-slate-500 mt-1">Route: {c.routeTo}</div>
                <div className="text-xs text-slate-500">Status: {c.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}