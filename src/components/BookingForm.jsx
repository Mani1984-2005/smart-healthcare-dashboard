// src/components/BookingForm.jsx
export default function BookingForm({
  darkMode,
  selectedDoctor,
  formData,
  updateForm,
  editingId,
  handleBooking,
  resetForm,
  symptomSuggestion,
}) {
  const cardClass = darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-950";
  const inputClass = darkMode ? "bg-slate-950 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-500";
  const subTextClass = darkMode ? "text-slate-400" : "text-slate-600";

  return (
    <section className={`${cardClass} border rounded-2xl p-6 mb-8 shadow-xl`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <h2 className="text-2xl font-bold">Book Appointment</h2>
        {editingId && <span className="px-4 py-2 rounded-xl bg-purple-950 text-purple-300 text-sm font-bold">Edit Mode Active</span>}
      </div>
      {selectedDoctor ? (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-xl ${darkMode ? "bg-cyan-950" : "bg-cyan-50"}`}>
          <span className="text-xl">👨‍⚕️</span>
          <div>
            <p className="text-cyan-400 font-bold text-sm">{selectedDoctor.name} · {selectedDoctor.spec}</p>
            <p className={`text-xs ${darkMode ? "text-cyan-300" : "text-cyan-700"}`}>⭐ {selectedDoctor.rating}/5 · {selectedDoctor.reviews} reviews · {selectedDoctor.exp} experience</p>
          </div>
        </div>
      ) : (
        <p className={`mb-4 ${subTextClass}`}>Select a doctor above before booking.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { field: "patient",  placeholder: "Patient name",               type: "text"   },
          { field: "age",      placeholder: "Age",                        type: "number" },
          { field: "phone",    placeholder: "Phone number (10 digits)",   type: "text"   },
          { field: "date",     placeholder: "",                           type: "date"   },
          { field: "time",     placeholder: "",                           type: "time"   },
          { field: "symptoms", placeholder: "Symptoms (e.g. fever, headache)", type: "text" },
        ].map(({ field, placeholder, type }) => (
          <input
            key={field}
            type={type}
            value={formData[field]}
            onChange={(e) => updateForm(field, e.target.value)}
            placeholder={placeholder}
            className={`border p-4 rounded-2xl outline-none focus:border-cyan-500 transition-all ${inputClass}`}
          />
        ))}
      </div>
      {symptomSuggestion && (
        <div className="mt-5 rounded-2xl border border-cyan-700 bg-cyan-950 p-4 text-cyan-100">
          <h3 className="font-bold flex items-center gap-2">🤖 AI Symptom Suggestion</h3>
          <p className="text-sm mt-1">Priority: <span className="font-semibold">{symptomSuggestion.level}</span></p>
          <p className="text-sm">Recommended: <span className="font-semibold">{symptomSuggestion.doctor}</span></p>
          <p className="text-xs mt-2 text-cyan-200">{symptomSuggestion.advice}</p>
          <p className="text-xs mt-2 text-red-300">⚠ Demo only – not a medical diagnosis.</p>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-6">
        <button onClick={handleBooking} className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all hover:shadow-lg hover:-translate-y-0.5">
          {editingId ? "Update Appointment" : "Book Appointment"}
        </button>
        <button onClick={resetForm} className="px-6 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all">
          Cancel
        </button>
      </div>
    </section>
  );
}