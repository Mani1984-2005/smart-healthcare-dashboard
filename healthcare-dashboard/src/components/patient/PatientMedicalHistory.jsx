// src/components/patient/PatientMedicalHistory.jsx

const Section = ({ title, icon, children, darkMode }) => (
  <div
    className={`rounded-2xl border p-5 ${
      darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"
    }`}
  >
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <h4 className={`text-sm font-bold uppercase tracking-wide ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
        {title}
      </h4>
    </div>
    {children}
  </div>
);

const Tag = ({ label, color = "bg-slate-100 text-slate-700", darkDefault }) =>
  label ? (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>{label}</span>
  ) : null;

const Field = ({ label, value, darkMode }) => (
  <div className={`flex flex-col gap-0.5 p-3 rounded-xl ${darkMode ? "bg-slate-700/60" : "bg-slate-50"}`}>
    <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
      {label}
    </span>
    <span className={`text-sm font-medium ${value ? "" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
      {value || "Not Recorded"}
    </span>
  </div>
);

// Parse comma-separated list into pills
const PillList = ({ value, pillClass, emptyText = "None", darkMode }) => {
  if (!value) {
    return (
      <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{emptyText}</p>
    );
  }
  const items = value.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`px-3 py-1 rounded-full text-xs font-semibold ${pillClass}`}>
          {item}
        </span>
      ))}
    </div>
  );
};

export default function PatientMedicalHistory({ patient, darkMode }) {
  const {
    disease, allergies, medicalHistory, chronicDiseases, currentMedications,
    lifestyleNotes, smoking, alcohol, pregnancyStatus, organDonor,
    disability, emergencyNotes, visitNotes,
  } = patient;

  return (
    <div className="space-y-4">
      {/* Primary Condition */}
      <Section title="Primary Diagnosis" icon="🩺" darkMode={darkMode}>
        <div className={`p-4 rounded-xl ${darkMode ? "bg-slate-700/60" : "bg-cyan-50 border border-cyan-200"}`}>
          <p className={`text-base font-semibold ${darkMode ? "text-white" : "text-cyan-900"}`}>
            {disease || <span className="text-slate-400 font-normal">Not Recorded</span>}
          </p>
        </div>
      </Section>

      {/* Allergies */}
      <Section title="Allergies" icon="⚠️" darkMode={darkMode}>
        <PillList
          value={allergies}
          pillClass="bg-red-100 text-red-700"
          emptyText="No known allergies"
          darkMode={darkMode}
        />
      </Section>

      {/* Chronic Diseases */}
      <Section title="Chronic Diseases" icon="🫀" darkMode={darkMode}>
        <PillList
          value={chronicDiseases}
          pillClass="bg-orange-100 text-orange-700"
          emptyText="None recorded"
          darkMode={darkMode}
        />
      </Section>

      {/* Current Medications */}
      <Section title="Current Medications" icon="💊" darkMode={darkMode}>
        <PillList
          value={currentMedications}
          pillClass="bg-green-100 text-green-700"
          emptyText="No current medications"
          darkMode={darkMode}
        />
      </Section>

      {/* Medical History */}
      <Section title="Medical History" icon="📋" darkMode={darkMode}>
        {medicalHistory ? (
          <p className={`text-sm leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
            {medicalHistory}
          </p>
        ) : (
          <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>No past medical history recorded.</p>
        )}
      </Section>

      {/* Lifestyle */}
      <Section title="Lifestyle & Habits" icon="🏃" darkMode={darkMode}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            className={`p-3 rounded-xl text-center border ${
              smoking === "Yes"
                ? "bg-red-50 border-red-200"
                : darkMode
                ? "bg-slate-700/60 border-slate-600"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="text-xl mb-1">🚬</div>
            <div className="text-xs font-semibold text-slate-500 mb-0.5">Smoking</div>
            <div className={`text-sm font-bold ${smoking === "Yes" ? "text-red-600" : darkMode ? "text-slate-300" : "text-slate-700"}`}>
              {smoking || "Not Recorded"}
            </div>
          </div>
          <div
            className={`p-3 rounded-xl text-center border ${
              alcohol === "Regular"
                ? "bg-orange-50 border-orange-200"
                : darkMode
                ? "bg-slate-700/60 border-slate-600"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="text-xl mb-1">🍷</div>
            <div className="text-xs font-semibold text-slate-500 mb-0.5">Alcohol</div>
            <div className={`text-sm font-bold ${alcohol === "Regular" ? "text-orange-600" : darkMode ? "text-slate-300" : "text-slate-700"}`}>
              {alcohol || "Not Recorded"}
            </div>
          </div>
          <div
            className={`p-3 rounded-xl text-center border ${
              organDonor === "Yes"
                ? "bg-green-50 border-green-200"
                : darkMode
                ? "bg-slate-700/60 border-slate-600"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="text-xl mb-1">❤️</div>
            <div className="text-xs font-semibold text-slate-500 mb-0.5">Organ Donor</div>
            <div className={`text-sm font-bold ${organDonor === "Yes" ? "text-green-600" : darkMode ? "text-slate-300" : "text-slate-700"}`}>
              {organDonor || "No"}
            </div>
          </div>
          <div
            className={`p-3 rounded-xl text-center border ${
              pregnancyStatus === "Pregnant"
                ? "bg-purple-50 border-purple-200"
                : darkMode
                ? "bg-slate-700/60 border-slate-600"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="text-xl mb-1">🤰</div>
            <div className="text-xs font-semibold text-slate-500 mb-0.5">Pregnancy</div>
            <div className={`text-sm font-bold ${pregnancyStatus === "Pregnant" ? "text-purple-600" : darkMode ? "text-slate-300" : "text-slate-700"}`}>
              {pregnancyStatus || "N/A"}
            </div>
          </div>
        </div>

        {lifestyleNotes && (
          <div className={`mt-3 p-3 rounded-xl text-sm ${darkMode ? "bg-slate-700/60" : "bg-slate-50"}`}>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Lifestyle Notes: </span>
            <span className={darkMode ? "text-slate-300" : "text-slate-600"}>{lifestyleNotes}</span>
          </div>
        )}
        {disability && (
          <div className={`mt-2 p-3 rounded-xl text-sm ${darkMode ? "bg-slate-700/60" : "bg-slate-50"}`}>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Disability: </span>
            <span className={darkMode ? "text-slate-300" : "text-slate-600"}>{disability}</span>
          </div>
        )}
      </Section>

      {/* Emergency Notes */}
      {emergencyNotes && (
        <Section title="Emergency Notes" icon="🚨" darkMode={darkMode}>
          <div className={`p-4 rounded-xl border-l-4 border-red-500 ${darkMode ? "bg-red-900/20" : "bg-red-50"}`}>
            <p className={`text-sm font-medium ${darkMode ? "text-red-300" : "text-red-700"}`}>{emergencyNotes}</p>
          </div>
        </Section>
      )}

      {/* Doctor Notes */}
      {visitNotes && (
        <Section title="Doctor Notes" icon="📝" darkMode={darkMode}>
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
            {visitNotes}
          </p>
        </Section>
      )}
    </div>
  );
}