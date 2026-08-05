// src/components/pharmacy/PrescriptionBuilder.jsx
// MediCare Pro — Prescription Builder (Unified offline/online engine)

import { useState, useCallback } from "react";
import MedicineCard from "./MedicineCard";

// ─── Local Rule Engine (Mirrors backend for offline / immediate UI updates) ───
const DOSAGE_RULES = {
  amoxicillin:   { standard: "500mg", frequency: "tds",  duration: "7",  timing: "With or without food",           route: "Oral", form: "Capsule", warnings: ["Complete full course", "Monitor for allergic reaction"] },
  azithromycin:  { standard: "500mg", frequency: "od",   duration: "3",  timing: "With food to reduce GI upset",   route: "Oral", form: "Tablet",  warnings: ["Do not take with antacids"] },
  ciprofloxacin: { standard: "500mg", frequency: "bd",   duration: "7",  timing: "Empty stomach preferred",        route: "Oral", form: "Tablet",  warnings: ["Avoid dairy", "Avoid sun exposure"] },
  metronidazole: { standard: "400mg", frequency: "tds",  duration: "7",  timing: "After food",                     route: "Oral", form: "Tablet",  warnings: ["Avoid alcohol completely", "Metallic taste is normal"] },
  doxycycline:   { standard: "100mg", frequency: "bd",   duration: "7",  timing: "With plenty of water after food",route: "Oral", form: "Capsule", warnings: ["Avoid sunlight", "Avoid dairy products"] },
  paracetamol:   { standard: "500mg", frequency: "sos",  duration: "5",  timing: "Any time",                       route: "Oral", form: "Tablet",  warnings: ["Max 4g/day total", "Check all products for paracetamol"] },
  ibuprofen:     { standard: "400mg", frequency: "sos",  duration: "5",  timing: "After food",                     route: "Oral", form: "Tablet",  warnings: ["Take with food", "Avoid in renal impairment"] },
  aspirin:       { standard: "75mg",  frequency: "od",   duration: "30", timing: "After food",                     route: "Oral", form: "Tablet",  warnings: ["EC tablet — swallow whole", "Avoid in under-16s"] },
  amlodipine:    { standard: "5mg",   frequency: "od",   duration: "30", timing: "Same time daily",                route: "Oral", form: "Tablet",  warnings: ["May cause ankle swelling", "Do not stop abruptly"] },
  metoprolol:    { standard: "50mg",  frequency: "bd",   duration: "30", timing: "With or after food",             route: "Oral", form: "Tablet",  warnings: ["Taper when stopping — never stop abruptly", "Monitor HR"] },
  lisinopril:    { standard: "10mg",  frequency: "od",   duration: "30", timing: "Consistent time daily",          route: "Oral", form: "Tablet",  warnings: ["May cause dry cough", "Monitor potassium", "Avoid in pregnancy"] },
  atorvastatin:  { standard: "20mg",  frequency: "od",   duration: "30", timing: "Evening",                        route: "Oral", form: "Tablet",  warnings: ["Report muscle pain", "Avoid grapefruit juice"] },
  simvastatin:   { standard: "20mg",  frequency: "od",   duration: "30", timing: "Evening",                        route: "Oral", form: "Tablet",  warnings: ["Avoid grapefruit", "Report muscle pain or weakness"] },
  warfarin:      { standard: "Per INR", frequency: "od",  duration: "30", timing: "Same time each day",             route: "Oral", form: "Tablet",  warnings: ["Regular INR monitoring essential", "Many drug & food interactions", "Report bleeding"] },
  metformin:     { standard: "500mg", frequency: "bd",   duration: "30", timing: "With meals",                     route: "Oral", form: "Tablet",  warnings: ["Take with food to reduce GI side effects", "Hold before contrast procedures"] },
  omeprazole:    { standard: "20mg",  frequency: "od",   duration: "28", timing: "30 mins before breakfast",       route: "Oral", form: "Capsule", warnings: ["Take before eating", "Long-term use may reduce B12"] },
  pantoprazole:  { standard: "40mg",  frequency: "od",   duration: "28", timing: "30-60 mins before meal",         route: "Oral", form: "Tablet",  warnings: ["Swallow whole", "Monitor magnesium with long-term use"] },
  ondansetron:   { standard: "4mg",   frequency: "sos",  duration: "3",  timing: "Before meals",                   route: "Oral", form: "Tablet",  warnings: ["May cause headache", "QT prolongation risk"] },
  salbutamol:    { standard: "2.5mg", frequency: "sos",  duration: "30", timing: "As needed",                      route: "Inhalation", form: "Inhaler", warnings: ["Shake before use", "Rinse mouth after use"] },
  montelukast:   { standard: "10mg",  frequency: "od",   duration: "30", timing: "Evening",                        route: "Oral", form: "Tablet",  warnings: ["Report behavioral or mood changes"] },
  diazepam:      { standard: "5mg",   frequency: "bd",   duration: "14", timing: "Any time",                       route: "Oral", form: "Tablet",  warnings: ["Risk of dependence", "Avoid driving", "No alcohol"] },
  pregabalin:    { standard: "75mg",  frequency: "bd",   duration: "30", timing: "Any time",                       route: "Oral", form: "Capsule", warnings: ["Drowsiness — avoid driving", "Taper when stopping"] },
};

const DRUG_INTERACTIONS = {
  warfarin:      [{ drug: "aspirin", sev: "HIGH", msg: "Warfarin + Aspirin: Serious bleeding risk. Monitor INR." },{ drug: "ibuprofen", sev: "HIGH", msg: "Warfarin + Ibuprofen: Increased anticoagulant effect." },{ drug: "metronidazole", sev: "HIGH", msg: "Warfarin + Metronidazole: Significantly elevates INR." },{ drug: "fluconazole", sev: "HIGH", msg: "Warfarin + Fluconazole: Strong CYP2C9 inhibitor — INR may double." }],
  simvastatin:   [{ drug: "amiodarone", sev: "HIGH", msg: "Simvastatin + Amiodarone: Increased myopathy risk. Max 20mg." },{ drug: "clarithromycin", sev: "HIGH", msg: "Simvastatin + Clarithromycin: Rhabdomyolysis risk. Avoid." },{ drug: "amlodipine", sev: "MODERATE", msg: "Simvastatin + Amlodipine: Limit simvastatin to 20mg/day." }],
  amlodipine:    [{ drug: "simvastatin", sev: "MODERATE", msg: "Amlodipine + Simvastatin: Limit simvastatin 20mg/day." }],
  metoprolol:    [{ drug: "verapamil", sev: "HIGH", msg: "Metoprolol + Verapamil: Severe bradycardia and AV block risk." },{ drug: "diltiazem", sev: "HIGH", msg: "Metoprolol + Diltiazem: Additive bradycardia. Monitor HR." }],
  aspirin:       [{ drug: "warfarin", sev: "HIGH", msg: "Aspirin + Warfarin: Increased bleeding risk." },{ drug: "ibuprofen", sev: "MODERATE", msg: "Aspirin + Ibuprofen: Reduced cardioprotective effect." },{ drug: "methotrexate", sev: "HIGH", msg: "Aspirin + Methotrexate: Reduced clearance, toxicity risk." }],
  ciprofloxacin: [{ drug: "theophylline", sev: "HIGH", msg: "Ciprofloxacin + Theophylline: CYP1A2 inhibition — toxicity risk." },{ drug: "warfarin", sev: "MODERATE", msg: "Ciprofloxacin + Warfarin: May increase INR." }],
  codeine:       [{ drug: "tramadol", sev: "HIGH", msg: "Codeine + Tramadol: Additive CNS/respiratory depression." },{ drug: "diazepam", sev: "HIGH", msg: "Codeine + Diazepam: Profound sedation and respiratory risk." }],
  lisinopril:    [{ drug: "potassium", sev: "MODERATE", msg: "Lisinopril + Potassium supplements: Hyperkalemia risk." },{ drug: "spironolactone", sev: "MODERATE", msg: "Lisinopril + Spironolactone: Hyperkalemia. Monitor electrolytes." }],
};

const FREQUENCY_OPTIONS = [
  { value: "od",   label: "OD — Once daily" },
  { value: "bd",   label: "BD — Twice daily" },
  { value: "tds",  label: "TDS — Three times daily" },
  { value: "qds",  label: "QDS — Four times daily" },
  { value: "sos",  label: "SOS — As needed" },
  { value: "stat", label: "STAT — Immediately" },
  { value: "hs",   label: "HS — At bedtime" },
  { value: "ac",   label: "AC — Before meals" },
  { value: "pc",   label: "PC — After meals" },
];

const FREQ_MAP = { od: 1, bd: 2, tds: 3, qds: 4, sos: 1, stat: 1, hs: 1, ac: 3, pc: 3 };

const SEV_COLOR = {
  HIGH:     { bg: "bg-red-100 border-red-400 text-red-800",     icon: "🔴", badge: "bg-red-500 text-white" },
  MODERATE: { bg: "bg-amber-100 border-amber-400 text-amber-800", icon: "🟡", badge: "bg-amber-500 text-white" },
  LOW:      { bg: "bg-blue-100 border-blue-400 text-blue-800",  icon: "🔵", badge: "bg-blue-500 text-white" },
};

const getLocalSuggestion = (name) => {
  const key = name.toLowerCase().trim();
  if (DOSAGE_RULES[key]) return DOSAGE_RULES[key];
  const found = Object.keys(DOSAGE_RULES).find((k) => key.includes(k) || k.includes(key.split(" ")[0]));
  return found ? DOSAGE_RULES[found] : null;
};

const emptyItem = () => ({
  medicine_id:   null,
  medicine_name: "",
  form:          "Tablet",
  requires_rx:   false,
  dosage:        "",
  frequency:     "od",
  duration_days: 5,
  quantity:      5,
  instructions:  "",
  _search:       "",
  _results:      [],
  _warnings:     [],
});

export default function PrescriptionBuilder({
  darkMode,
  patient,
  onSubmit,
  loading = false,
}) {
  const [form, setForm] = useState({
    doctor_name: "",
    diagnosis:   "",
    notes:       "",
  });
  const [items, setItems]       = useState([emptyItem()]);
  const [searching, setSearching] = useState({});
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const card   = darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900";
  const input  = `border rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-cyan-400 ${
    darkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
  }`;
  const label  = "text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1";

  // ─── Direct Cross-Row Drug Interaction Detection ──────────────────────────
  const detectInteractions = (currentItems) => {
    const crossInteractions = [];
    const names = currentItems.map((m) => m.medicine_name?.toLowerCase?.() || "");

    for (let i = 0; i < names.length; i++) {
      const currentMedName = names[i];
      if (!currentMedName) continue;
      
      const rules = DRUG_INTERACTIONS[currentMedName];
      if (!rules) continue;

      for (const rule of rules) {
        const hitIdx = names.findIndex((n, idx) => idx !== i && n.includes(rule.drug));
        if (hitIdx !== -1 && !crossInteractions.find((x) => x.msg === rule.msg)) {
          crossInteractions.push({
            sev: rule.sev,
            drugs: [currentMedName, names[hitIdx]],
            msg: rule.msg
          });
        }
      }
    }
    return crossInteractions;
  };

  const activeInteractions = detectInteractions(items);

  // ─── Item Patch Utility ───────────────────────────────────────────────────
  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  // ─── Async Remote + Local Fallback Match Engine ───────────────────────────
  const searchMedicines = useCallback(async (idx, query) => {
    updateItem(idx, { _search: query, medicine_name: query });
    if (!query || query.length < 2) {
      updateItem(idx, { _results: [], _warnings: [] });
      return;
    }

    setSearching((s) => ({ ...s, [idx]: true }));
    try {
      const res = await fetch(`/api/pharmacy/medicines?search=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();
      updateItem(idx, { _results: data.medicines || [] });
    } catch {
      // Offline fallback: Match query locally from offline dosage rule dictionary keys
      const localizedMatches = Object.keys(DOSAGE_RULES)
        .filter((k) => k.includes(query.toLowerCase()))
        .map((k) => ({
          id: `local-${k}`,
          name: k.charAt(0).toUpperCase() + k.slice(1),
          form: DOSAGE_RULES[k].form,
          strength: DOSAGE_RULES[k].standard,
          requires_rx: true
        }));
      updateItem(idx, { _results: localizedMatches });
    } finally {
      setSearching((s) => ({ ...s, [idx]: false }));
    }
  }, []);

  // ─── Select Medicine & Trigger Auto-dosage/Qty Calculations ───────────────
  const selectMedicine = (idx, med) => {
    const localRule = getLocalSuggestion(med.name);
    
    // Fallbacks switch down safely between dynamic values or hardcoded defaults
    const selectedFreq = localRule?.frequency || items[idx].frequency || "od";
    const selectedDur  = localRule?.duration ? parseInt(localRule.duration) : (items[idx].duration_days || 5);
    const standardDose = localRule?.standard  || med.strength || "";
    const primaryForm   = localRule?.form      || med.form     || "Tablet";
    const staticWarns  = localRule?.warnings  || [];

    const perDay = FREQ_MAP[selectedFreq] || 1;
    const computedQty = perDay * selectedDur;

    updateItem(idx, {
      medicine_id:   med.id,
      medicine_name: med.name,
      form:          primaryForm,
      requires_rx:   !!med.requires_rx,
      dosage:        standardDose,
      frequency:     selectedFreq,
      duration_days: selectedDur,
      quantity:      computedQty,
      instructions:  localRule?.timing || items[idx].instructions || "",
      _search:       med.name,
      _results:      [],
      _warnings:     staticWarns,
    });
  };

  // ─── Reactive Variable Quantities ─────────────────────────────────────────
  const recalcQty = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const freq = field === "frequency" ? value : item.frequency;
      const dur  = field === "duration_days" ? parseInt(value) : item.duration_days;
      const perDay = FREQ_MAP[freq] || 1;
      return {
        ...item,
        [field]: value,
        quantity: perDay * (dur || 0)
      };
    }));
  };

  const addItem  = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!form.doctor_name.trim()) return setError("Doctor name is required.");
    if (items.some((it) => !it.medicine_name.trim())) return setError("All medicine rows must have a medicine selected.");
    if (items.some((it) => !it.dosage.trim())) return setError("All items need a specified dosage.");

    const payload = {
      patient_id:    patient?.id,
      patient_name:  patient?.name,
      patientAge:    patient?.age,
      patientWeight: patient?.weight,
      ...form,
      items: items.map(({ medicine_id, medicine_name, form: mform, requires_rx, dosage, frequency, duration_days, quantity, instructions }) => ({
        medicine_id, medicine_name, form: mform, requires_rx,
        dosage, frequency, duration_days: parseInt(duration_days), quantity: parseInt(quantity), instructions,
      })),
    };

    try {
      await onSubmit(payload);
      setSuccess("Prescription created successfully.");
      setItems([emptyItem()]);
      setForm({ doctor_name: "", diagnosis: "", notes: "" });
    } catch (err) {
      setError(err.message || "Failed to save prescription.");
    }
  };

  return (
    <div className={`rounded-2xl border p-6 ${card}`}>
      <h2 className="text-lg font-bold mb-1">New Prescription</h2>
      {patient && (
        <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          Patient: <span className="font-medium text-cyan-500">{patient.name}</span> ({patient.id})
        </p>
      )}

      {/* Cross-Drug Interaction Board */}
      {activeInteractions.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-red-500 flex items-center gap-1.5">
            ⚠️ Drug Interaction Warnings ({activeInteractions.length})
          </p>
          {activeInteractions.map((ix, i) => {
            const style = SEV_COLOR[ix.sev] || SEV_COLOR.LOW;
            return (
              <div key={i} className={`border rounded-xl p-3 text-sm flex gap-3 items-start transition-all ${style.bg}`}>
                <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                      {ix.sev}
                    </span>
                    <span className="text-xs font-semibold capitalize">
                      {ix.drugs.join(" + ")}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">{ix.msg}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Doctor Name *</label>
            <input
              className={input}
              value={form.doctor_name}
              onChange={(e) => setForm((f) => ({ ...f, doctor_name: e.target.value }))}
              placeholder="Dr. Name"
            />
          </div>
          <div>
            <label className={label}>Diagnosis</label>
            <input
              className={input}
              value={form.diagnosis}
              onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
              placeholder="Primary diagnosis"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Medicines</h3>
            <button
              type="button"
              onClick={addItem}
              className="text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              + Add Medicine
            </button>
          </div>

          {items.map((item, idx) => {
            const ruleFound = getLocalSuggestion(item.medicine_name);
            const isAutoFilled = !!ruleFound && item.medicine_name.trim().length > 0;

            return (
              <div key={idx} className={`rounded-xl border p-4 space-y-3 relative ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="absolute top-3 right-3 text-red-400 hover:text-red-600 text-xs transition-colors"
                  >
                    ✕ Remove
                  </button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Medicine Search Autocomplete Row */}
                  <div className="sm:col-span-2 relative">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">Medicine *</label>
                      {isAutoFilled && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-700 font-medium">
                          ✓ Auto-filled
                        </span>
                      )}
                    </div>
                    <input
                      className={input}
                      value={item._search}
                      onChange={(e) => searchMedicines(idx, e.target.value)}
                      placeholder="Search medicine name (e.g. Amoxicillin, Warfarin)..."
                      autoComplete="off"
                    />
                    {searching[idx] && (
                      <div className="absolute right-3 top-9 text-xs text-slate-400 animate-pulse">Searching…</div>
                    )}
                    {item._results.length > 0 && (
                      <div className={`absolute z-20 w-full top-full mt-1 rounded-xl border shadow-lg max-h-60 overflow-y-auto ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                        {item._results.map((med) => (
                          <MedicineCard
                            key={med.id}
                            medicine={med}
                            darkMode={darkMode}
                            compact
                            onSelect={(m) => selectMedicine(idx, m)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dosage Strength */}
                  <div>
                    <label className={label}>Dosage *</label>
                    <input
                      className={input}
                      value={item.dosage}
                      onChange={(e) => updateItem(idx, { dosage: e.target.value })}
                      placeholder="e.g. 500mg"
                    />
                  </div>

                  {/* Frequency Selector */}
                  <div>
                    <label className={label}>Frequency</label>
                    <select
                      className={input}
                      value={item.frequency}
                      onChange={(e) => recalcQty(idx, "frequency", e.target.value)}
                    >
                      {FREQUENCY_OPTIONS.map(({ value, label: lbl }) => (
                        <option key={value} value={value}>{lbl}</option>
                      ))}
                    </select>
                  </div>

                  {/* Days Duration */}
                  <div>
                    <label className={label}>Duration (days)</label>
                    <input
                      className={input}
                      type="number"
                      min={1}
                      value={item.duration_days}
                      onChange={(e) => recalcQty(idx, "duration_days", e.target.value)}
                    />
                  </div>

                  {/* Quantities (Calculated) */}
                  <div>
                    <label className={label}>Quantity (auto)</label>
                    <input
                      className={`${input} opacity-70`}
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Special Instructions/Timing */}
                  <div className="sm:col-span-2">
                    <label className={label}>Instructions</label>
                    <input
                      className={input}
                      value={item.instructions}
                      onChange={(e) => updateItem(idx, { instructions: e.target.value })}
                      placeholder="e.g. Take after meals with water"
                    />
                  </div>
                </div>

                {/* Local Specific Isolated Warnings */}
                {(item._warnings || []).length > 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
                    {item._warnings.map((w, wi) => <p key={wi}>⚠ {w}</p>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <label className={label}>Additional Notes</label>
          <textarea
            className={`${input} h-20 resize-none`}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Pharmacist instructions, follow-up details…"
          />
        </div>

        {error   && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">⚠ {error}</p>}
        {success && <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">✓ {success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save Prescription"}
        </button>
      </form>
    </div>
  );
}