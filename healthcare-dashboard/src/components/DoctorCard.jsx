export default function DoctorCard({ doc, setSelectedDoctor }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="text-5xl mb-4">🩺</div>

      <h3 className="text-2xl font-bold">{doc.name}</h3>

      <p className="text-cyan-400 mt-2">{doc.spec}</p>

      <p className="text-slate-400 mt-2">Experience: {doc.exp}</p>

      <div className="mt-4">
        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            doc.status === "Available"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {doc.status}
        </span>
      </div>

      <button
        disabled={doc.status !== "Available"}
        onClick={() => setSelectedDoctor(doc)}
        className={`mt-6 w-full p-3 rounded-xl font-bold transition ${
          doc.status === "Available"
            ? "bg-cyan-500 hover:bg-cyan-600"
            : "bg-gray-700 cursor-not-allowed"
        }`}
      >
        Book Appointment
      </button>
    </div>
  );
}