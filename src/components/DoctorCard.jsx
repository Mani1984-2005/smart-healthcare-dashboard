export default function DoctorCard({ doctor, darkMode, onBook }) {
  return (
    <div
      className={`p-5 rounded-2xl border transition-all hover:-translate-y-1.5 hover:shadow-xl ${
        darkMode
          ? "bg-slate-900 border-slate-800 hover:border-cyan-800"
          : "bg-white border-slate-200 hover:border-cyan-300"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow ${darkMode ? "bg-slate-800" : "bg-cyan-50"}`}>
          👨‍⚕️
        </div>
        <div>
          <p className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{doctor.name}</p>
          <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{doctor.spec}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-yellow-500">⭐ {doctor.rating}/5</span>
            <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>({doctor.reviews} reviews)</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
          {doctor.exp} experience
        </span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${doctor.status === "Available" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {doctor.status}
        </span>
      </div>

      {doctor.status === "Available" && doctor.slots.length > 0 && (
        <div className="mb-3">
          <p className={`text-xs font-medium mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Available Slots:</p>
          <div className="flex flex-wrap gap-1">
            {doctor.slots.map((slot) => (
              <span key={slot} className={`text-xs px-2 py-1 rounded-lg ${darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-50 text-cyan-700"}`}>
                {slot}
              </span>
            ))}
          </div>
        </div>
      )}

      {doctor.status === "Available" ? (
        <button
          onClick={() => onBook(doctor)}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all hover:shadow-lg"
        >
          Book Appointment
        </button>
      ) : (
        <button disabled className="w-full bg-slate-200 text-slate-400 font-semibold py-2.5 rounded-xl text-sm cursor-not-allowed">
          Currently Unavailable
        </button>
      )}
    </div>
  );
}