// src/components/pharmacy/PrescriptionBuilder.jsx
// MediCare Pro — Prescription Builder
// Rule-based dosage auto-fill + drug interaction warning engine

import { useState, useCallback } from "react";

// ─── Local rule engine (mirrors backend, so UI works offline/localStorage) ────
const DOSAGE_RULES = {
  amoxicillin:   { standard: "500mg", frequency: "3 times daily",                    duration: "7 days",         timing: "With or without food",           route: "Oral",       form: "Capsule", warnings: ["Complete full course", "Monitor for allergic reaction"] },
  azithromycin:  { standard: "500mg", frequency: "Once daily",                       duration: "3-5 days",       timing: "With food to reduce GI upset",   route: "Oral",       form: "Tablet",  warnings: ["Do not take with antacids"] },
  ciprofloxacin: { standard: "500mg", frequency: "Twice daily",                      duration: "7-14 days",      timing: "Empty stomach preferred",        route: "Oral",       form: "Tablet",  warnings: ["Avoid dairy", "Avoid sun exposure"] },
  metronidazole: { standard: "400mg", frequency: "3 times daily",                    duration: "7 days",         timing: "After food",                     route: "Oral",       form: "Tablet",  warnings: ["Avoid alcohol completely", "Metallic taste is normal"] },
  doxycycline:   { standard: "100mg", frequency: "Twice daily",                      duration: "7-14 days",      timing: "With plenty of water after food",route: "Oral",       form: "Capsule", warnings: ["Avoid sunlight", "Avoid dairy products"] },
  paracetamol:   { standard: "500mg", frequency: "Every 4-6 hours (max 4/day)",      duration: "As needed",      timing: "Any time",                       route: "Oral",       form: "Tablet",  warnings: ["Max 4g/day total", "Check all products for paracetamol"] },
  ibuprofen:     { standard: "400mg", frequency: "Every 6-8 hours",                  duration: "5-7 days",       timing: "After food",                     route: "Oral",       form: "Tablet",  warnings: ["Take with food", "Avoid in renal impairment"] },
  aspirin:       { standard: "75mg",  frequency: "Once daily (antiplatelet)",        duration: "Long-term",      timing: "After food",                     route: "Oral",       form: "Tablet",  warnings: ["EC tablet — swallow whole", "Avoid in under-16s"] },
  amlodipine:    { standard: "5mg",   frequency: "Once daily",                       duration: "Long-term",      timing: "Same time daily",                route: "Oral",       form: "Tablet",  warnings: ["May cause ankle swelling", "Do not stop abruptly"] },
  metoprolol:    { standard: "50mg",  frequency: "Twice daily",                      duration: "Long-term",      timing: "With or after food",             route: "Oral",       form: "Tablet",  warnings: ["Taper when stopping — never stop abruptly", "Monitor HR"] },
  lisinopril:    { standard: "10mg",  frequency: "Once daily",                       duration: "Long-term",      timing: "Consistent time daily",          route: "Oral",       form: "Tablet",  warnings: ["May cause dry cough", "Monitor potassium", "Avoid in pregnancy"] },
  atorvastatin:  { standard: "20mg",  frequency: "Once daily (evening)",             duration: "Long-term",      timing: "Evening",                        route: "Oral",       form: "Tablet",  warnings: ["Report muscle pain", "Avoid grapefruit juice"] },
  simvastatin:   { standard: "20mg",  frequency: "Once daily (evening)",             duration: "Long-term",      timing: "Evening",                        route: "Oral",       form: "Tablet",  warnings: ["Avoid grapefruit", "Report muscle pain or weakness"] },
  warfarin:      { standard: "Per INR", frequency: "Once daily",                     duration: "Long-term",      timing: "Same time each day",             route: "Oral",       form: "Tablet",  warnings: ["Regular INR monitoring essential", "Many drug & food interactions", "Report bleeding"] },
  metformin:     { standard: "500mg", frequency: "Twice daily with meals",           duration: "Long-term",      timing: "With meals",                     route: "Oral",       form: "Tablet",  warnings: ["Take with food to reduce GI side effects", "Hold before contrast procedures"] },
  omeprazole:    { standard: "20mg",  frequency: "Once daily",                       duration: "4-8 weeks",      timing: "30 mins before breakfast",       route: "Oral",       form: "Capsule", warnings: ["Take before eating", "Long-term use may reduce B12"] },
  pantoprazole:  { standard: "40mg",  frequency: "Once daily",                       duration: "4-8 weeks",      timing: "30-60 mins before meal",         route: "Oral",       form: "Tablet",  warnings: ["Swallow whole", "Monitor magnesium with long-term use"] },
  ondansetron:   { standard: "4mg",   frequency: "Every 8 hours (as needed)",        duration: "2-3 days",       timing: "Before meals",                   route: "Oral",       form: "Tablet",  warnings: ["May cause headache", "QT prolongation risk"] },
  salbutamol:    { standard: "2.5mg", frequency: "Every 4-6 hours (as needed)",      duration: "As needed",      timing: "As needed",                      route: "Inhalation", form: "Inhaler", warnings: ["Shake before use", "Rinse mouth after use"] },
  montelukast:   { standard: "10mg",  frequency: "Once daily",                       duration: "Long-term",      timing: "Evening",                        route: "Oral",       form: "Tablet",  warnings: ["Report behavioral or mood changes"] },
  diazepam:      { standard: "5mg",   frequency: "Twice daily",                      duration: "Max 4 weeks",    timing: "Any time",                       route: "Oral",       form: "Tablet",  warnings: ["Risk of dependence", "Avoid driving", "No alcohol"] },
  pregabalin:    { standard: "75mg",  frequency: "Twice daily",                      duration: "As directed",    timing: "Any time",                       route: "Oral",       form: "Capsule", warnings: ["Drowsiness — avoid driving", "Taper when stopping"] },
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

const getSuggestion = (name) => {
  const key = name.toLowerCase().trim();
  if (DOSAGE_RULES[key]) return DOSAGE_RULES[key];
  const found = Object.keys(DOSAGE_RULES).find((k) => key.includes(k) || k.includes(key.split(" ")[0]));
  return found ? DOSAGE_RULES[found] : null;
};

const detectInteractions = (meds) => {
  const interactions = [];
  const names = meds.map((m) => m.medicine_name?.toLowerCase?.() || "");
  for (let i = 0; i < names.length; i++) {
    const rules = DRUG_INTERACTIONS[names[i]];
    if (!rules) continue;
    for (const rule of rules) {
      const hit = names.find((n, idx) => idx !== i && n.includes(rule.drug));
      if (hit && !interactions.find((x) => x.msg === rule.msg)) {
        interactions.push({ sev: rule.sev, drugs: [names[i], hit], msg: rule.msg });
      }
    }
  }
  return interactions;
};

const sevColor = {
  HIGH:     { bg: "bg-red-100 border-red-400 text-red-800",     icon: "🔴", badge: "bg-red-500 text-white" },
  MODERATE: { bg: "bg-amber-100 border-amber-400 text-amber-800", icon: "🟡", badge: "bg-amber-500 text-white" },
  LOW:      { bg: "bg-blue-100 border-blue-400 text-blue-800",  icon: "🔵", badge: "bg-blue-500 text-white" },
};

const KNOWN_DRUGS = Object.keys(DOSAGE_RULES).map((k) => k.charAt(0).toUpperCase() + k.slice(1));
const DRUG_CATEGORIES = ["Antibiotic", "Analgesic", "Antihypertensive", "Antidiabetic", "Cardiac", "GI", "Respiratory", "Neurological", "Antifungal", "Anticoagulant", "Other"];
const FREQUENCIES = ["Once daily", "Twice daily", "3 times daily", "Every 4-6 hours", "Every 6-8 hours", "Every 8 hours", "Every 12 hours", "Weekly", "As needed", "With each meal"];
const ROUTES = ["Oral", "Inhalation", "Topical", "IV", "IM", "SC", "Sublingual", "Ophthalmic", "Otic", "Nasal"];
const FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Inhaler", "Cream", "Ointment", "Drops", "Patch", "Suppository"];
const TIMINGS = ["Any time", "Before breakfast", "After breakfast", "With meals", "Before meals", "After meals", "At bedtime", "Morning", "Evening", "Empty stomach"];

const emptyMed = () => ({
  _id: Date.now(),
  medicine_name: "", generic_name: "", category: "", dosage_strength: "",
  dosage_form: "Tablet", frequency: "", duration: "", timing: "",
  route: "Oral", quantity: "", refills: 0, instructions: "",
  warnings: [], interactions: [],
});

export default function PrescriptionBuilder({ medicines, onChange, darkMode }) {
  const [showSuggestions, setShowSuggestions] = useState(null); // index of active search
  const [searchQuery, setSearchQuery] = useState("");

  const meds = medicines || [];
  const interactions = detectInteractions(meds);

  const addMedicine = () => {
    onChange([...meds, emptyMed()]);
  };

  const removeMedicine = (idx) => {
    onChange(meds.filter((_, i) => i !== idx));
  };

  const updateMed = (idx, field, value) => {
    const updated = meds.map((m, i) => i === idx ? { ...m, [field]: value } : m);
    onChange(updated);
  };

  const applyDosageSuggestion = (idx, name) => {
    const suggestion = getSuggestion(name);
    if (!suggestion) return;
    const updated = meds.map((m, i) => i === idx ? {
      ...m,
      medicine_name:   name,
      dosage_strength: suggestion.standard || m.dosage_strength,
      dosage_form:     suggestion.form     || m.dosage_form,
      frequency:       suggestion.frequency || m.frequency,
      duration:        suggestion.duration  || m.duration,
      timing:          suggestion.timing    || m.timing,
      route:           suggestion.route     || m.route,
      warnings:        suggestion.warnings  || [],
    } : m);
    onChange(updated);
    setShowSuggestions(null);
    setSearchQuery("");
  };

  const inputCls = `border rounded-lg px-3 py-2 text-sm w-full ${
    darkMode
      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500"
      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
  } focus:outline-none transition-colors`;

  const labelCls = "text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block";

  const filteredDrugs = KNOWN_DRUGS.filter((d) =>
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">

      {/* ── Interaction Warnings Panel ── */}
      {interactions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-red-500 flex items-center gap-1.5">
            ⚠️ Drug Interaction Warnings ({interactions.length})
          </p>
          {interactions.map((ix, i) => {
            const style = sevColor[ix.sev] || sevColor.LOW;
            return (
              <div key={i} className={`border rounded-xl p-3 text-sm flex gap-3 items-start ${style.bg}`}>
                <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                      {ix.sev}
                    </span>
                    <span className="text-xs font-semibold capitalize">
                      {ix.drugs.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(" + ")}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">{ix.msg}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Medicine Cards ── */}
      {meds.map((med, idx) => {
        const suggestion = getSuggestion(med.medicine_name);
        const hasSuggestion = !!suggestion && med.medicine_name.trim().length > 0;
        return (
          <div
            key={med._id || idx}
            className={`rounded-2xl border p-4 relative ${
              darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
            }`}
          >
            {/* Card header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-cyan-600`}>
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold">
                  {med.medicine_name || `Medicine ${idx + 1}`}
                </span>
                {hasSuggestion && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 font-medium">
                    ✓ Auto-filled
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeMedicine(idx)}
                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                ✕ Remove
              </button>
            </div>

            {/* Row 1: Name search + Category */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              {/* Medicine name with autocomplete */}
              <div className="md:col-span-2 relative">
                <label className={labelCls}>Medicine Name *</label>
                <input
                  className={inputCls}
                  placeholder="Type to search known drugs..."
                  value={med.medicine_name}
                  onChange={(e) => {
                    updateMed(idx, "medicine_name", e.target.value);
                    setSearchQuery(e.target.value);
                    setShowSuggestions(idx);
                  }}
                  onFocus={() => {
                    setSearchQuery(med.medicine_name);
                    setShowSuggestions(idx);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                />
                {/* Dropdown */}
                {showSuggestions === idx && searchQuery.length > 0 && filteredDrugs.length > 0 && (
                  <div className={`absolute z-30 top-full mt-1 w-full rounded-xl shadow-lg border max-h-52 overflow-y-auto ${
                    darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                  }`}>
                    {filteredDrugs.slice(0, 10).map((drug) => {
                      const rule = DOSAGE_RULES[drug.toLowerCase()];
                      return (
                        <button
                          key={drug}
                          type="button"
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-cyan-50 hover:text-cyan-700 transition-colors ${darkMode ? "hover:bg-slate-700 hover:text-cyan-400" : ""}`}
                          onClick={() => applyDosageSuggestion(idx, drug)}
                        >
                          <div className="font-semibold">{drug}</div>
                          {rule && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {rule.standard} · {rule.frequency} · {rule.form}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Generic Name</label>
                <input
                  className={inputCls}
                  placeholder="Generic / INN name"
                  value={med.generic_name}
                  onChange={(e) => updateMed(idx, "generic_name", e.target.value)}
                />
              </div>

              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={med.category} onChange={(e) => updateMed(idx, "category", e.target.value)}>
                  <option value="">Select category</option>
                  {DRUG_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Dosage details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className={labelCls}>Strength / Dose</label>
                <input
                  className={inputCls}
                  placeholder="e.g. 500mg"
                  value={med.dosage_strength}
                  onChange={(e) => updateMed(idx, "dosage_strength", e.target.value)}
                />
              </div>

              <div>
                <label className={labelCls}>Dosage Form</label>
                <select className={inputCls} value={med.dosage_form} onChange={(e) => updateMed(idx, "dosage_form", e.target.value)}>
                  {FORMS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Frequency</label>
                <select className={inputCls} value={med.frequency} onChange={(e) => updateMed(idx, "frequency", e.target.value)}>
                  <option value="">Select frequency</option>
                  {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Duration</label>
                <input
                  className={inputCls}
                  placeholder="e.g. 7 days"
                  value={med.duration}
                  onChange={(e) => updateMed(idx, "duration", e.target.value)}
                />
              </div>

              <div>
                <label className={labelCls}>Timing</label>
                <select className={inputCls} value={med.timing} onChange={(e) => updateMed(idx, "timing", e.target.value)}>
                  <option value="">Select timing</option>
                  {TIMINGS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Route</label>
                <select className={inputCls} value={med.route} onChange={(e) => updateMed(idx, "route", e.target.value)}>
                  {ROUTES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Quantity (units)</label>
                <input
                  className={inputCls}
                  type="number"
                  placeholder="e.g. 21"
                  value={med.quantity}
                  onChange={(e) => updateMed(idx, "quantity", e.target.value)}
                />
              </div>

              <div>
                <label className={labelCls}>Refills</label>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  max="12"
                  placeholder="0"
                  value={med.refills}
                  onChange={(e) => updateMed(idx, "refills", e.target.value)}
                />
              </div>
            </div>

            {/* Row 3: Instructions */}
            <div>
              <label className={labelCls}>Special Instructions</label>
              <input
                className={inputCls}
                placeholder="e.g. Avoid alcohol, take with plenty of water..."
                value={med.instructions}
                onChange={(e) => updateMed(idx, "instructions", e.target.value)}
              />
            </div>

            {/* Auto-filled warnings */}
            {med.warnings?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {med.warnings.map((w, wi) => (
                  <span key={wi} className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-medium">
                    ⚠ {w}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Add Medicine Button ── */}
      <button
        type="button"
        onClick={addMedicine}
        className="w-full py-3 rounded-xl border-2 border-dashed border-cyan-400 text-cyan-600 hover:bg-cyan-50 hover:border-cyan-500 text-sm font-semibold transition-all flex items-center justify-center gap-2"
      >
        + Add Medicine
      </button>

      {meds.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-4">
          No medicines added yet. Click "Add Medicine" to start building the prescription.
        </p>
      )}
    </div>
  );
}
