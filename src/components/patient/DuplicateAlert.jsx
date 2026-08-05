// src/components/patient/DuplicateAlert.jsx
// Shown inside the registration form when a potential duplicate patient is detected.

export default function DuplicateAlert({ duplicate, onOpenProfile, onDismiss, darkMode }) {
  if (!duplicate) return null;

  return (
    <div
      className={`mb-5 rounded-xl border-2 border-amber-400 p-4 flex flex-col md:flex-row md:items-center gap-3 ${
        darkMode ? "bg-amber-950/40" : "bg-amber-50"
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">⚠️</span>
          <span className="font-bold text-amber-600 text-sm">Patient already exists</span>
        </div>
        <p className={`text-sm ${darkMode ? "text-amber-300" : "text-amber-700"}`}>
          A record matching <strong>{duplicate.name}</strong> (ID:{" "}
          <span className="font-mono font-bold">{duplicate.id}</span>) was found.
          Duplicate records may cause billing and clinical errors.
        </p>
        <p className={`text-xs mt-1 ${darkMode ? "text-amber-400" : "text-amber-600"}`}>
          Matched on:{" "}
          {duplicate._matchReason || "phone / Aadhaar / name + DOB"}
        </p>
      </div>
      <div className="flex flex-col gap-2 min-w-fit">
        <button
          type="button"
          onClick={onOpenProfile}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
        >
          Open Existing Profile →
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            darkMode
              ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
              : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
          }`}
        >
          Register Anyway
        </button>
      </div>
    </div>
  );
}