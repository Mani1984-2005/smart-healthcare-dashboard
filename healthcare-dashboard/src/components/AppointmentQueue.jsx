export default function AppointmentQueue({ appointments }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
      <h2 className="text-3xl font-bold mb-6">📋 Appointment Queue</h2>

      {appointments.length === 0 ? (
        <p className="text-slate-400">No appointments booked yet.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-slate-800 p-4 rounded-2xl">
              <h3 className="text-xl font-bold text-cyan-400">
                Token #{appt.token}
              </h3>
              <p className="mt-2">👤 {appt.patient}</p>
              <p>🩺 {appt.doctor}</p>
              <p>⚠️ {appt.symptoms}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}