// src/components/patient/FamilyInfoSection.jsx
// Displays and manages structured family / emergency contact information.
// Used in PatientProfileModal (view) and passed as rendered JSX in PatientsPage form.

const RELATIONSHIP_OPTIONS = [
  "Father", "Mother", "Guardian", "Spouse", "Son", "Daughter",
  "Brother", "Sister", "Emergency Contact", "Other",
];

// ─── Display (read-only inside modal) ────────────────────────────────────────
export function FamilyInfoDisplay({ family = [], darkMode }) {
  if (!family || family.length === 0) {
    return (
      <div className={`text-center py-10 rounded-2xl border-2 border-dashed text-sm ${
        darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"
      }`}>
        <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
        <p className="font-medium">No family information recorded</p>
        <p className="text-xs mt-1">Edit the patient record to add family contacts.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {family.map((member, i) => (
        <div
          key={i}
          className={`p-4 rounded-xl border flex gap-4 items-start ${
            darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
            darkMode ? "bg-slate-700" : "bg-slate-100"
          }`}>
            {relationEmoji(member.relationship)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{member.name || "Unknown"}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"
              }`}>
                {member.relationship || "Family"}
              </span>
              {member.isEmergency && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  🚨 Emergency
                </span>
              )}
            </div>
            {member.phone && (
              <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                📞 {member.phone}
              </p>
            )}
            {member.notes && (
              <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                {member.notes}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Edit form (used inside registration form) ────────────────────────────────
export function FamilyInfoForm({ family = [], onChange, darkMode }) {
  const inputClass = `border p-2.5 rounded-lg text-sm w-full ${
    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
  }`;
  const labelClass = "text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-0.5 block";

  const update = (index, field, value) => {
    const updated = family.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    onChange(updated);
  };

  const addMember = () => {
    onChange([...family, { name: "", relationship: "Father", phone: "", notes: "", isEmergency: false }]);
  };

  const removeMember = (index) => {
    onChange(family.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {family.map((member, i) => (
        <div
          key={i}
          className={`p-4 rounded-xl border relative ${
            darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={() => removeMember(i)}
            className="absolute top-3 right-3 text-red-400 hover:text-red-600 text-lg leading-none"
            title="Remove"
          >
            ×
          </button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>Full Name</label>
              <input className={inputClass} placeholder="Name" value={member.name} onChange={(e) => update(i, "name", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Relationship</label>
              <select className={inputClass} value={member.relationship} onChange={(e) => update(i, "relationship", e.target.value)}>
                {RELATIONSHIP_OPTIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} placeholder="Phone number" value={member.phone} onChange={(e) => update(i, "phone", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <input className={inputClass} placeholder="e.g. Lives in Bengaluru" value={member.notes} onChange={(e) => update(i, "notes", e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={member.isEmergency || false}
              onChange={(e) => update(i, "isEmergency", e.target.checked)}
              className="accent-red-500"
            />
            <span className="text-xs font-medium text-red-500">Mark as Emergency Contact</span>
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={addMember}
        className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors ${
          darkMode
            ? "border-slate-600 text-slate-400 hover:border-cyan-600 hover:text-cyan-400"
            : "border-slate-300 text-slate-500 hover:border-cyan-500 hover:text-cyan-600"
        }`}
      >
        + Add Family Member
      </button>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function relationEmoji(rel) {
  const map = {
    Father: "👨", Mother: "👩", Guardian: "🧑", Spouse: "💑",
    Son: "👦", Daughter: "👧", Brother: "🧒", Sister: "👧",
    "Emergency Contact": "🚨", Other: "👤",
  };
  return map[rel] || "👤";
}s