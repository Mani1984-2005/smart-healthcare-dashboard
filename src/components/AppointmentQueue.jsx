export default function AppointmentQueue({ appointments, formatDateTime }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-3xl">
      {appointments.length === 0 ? (
        <p className="text-slate-400">No appointments booked yet.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-slate-800 p-4 rounded-2xl">
              <h3 className="text-lg sm:text-xl font-bold text-cyan-400">
                Token: {appt.token}
              </h3>

              <p className="mt-2">👤 Patient: {appt.patient}</p>
              <p>🎂 Age: {appt.age}</p>
              <p>🩺 Doctor: {appt.doctor}</p>
              <p>🏥 Specialization: {appt.spec}</p>
              <p>⚠️ Symptoms: {appt.symptoms}</p>
              <p>📅 Appointment: {appt.date} at {appt.time}</p>

              {appt.bookedAt && (
                <p className="text-sm text-slate-400 mt-2">
                  Booked on: {formatDateTime(appt.bookedAt)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}