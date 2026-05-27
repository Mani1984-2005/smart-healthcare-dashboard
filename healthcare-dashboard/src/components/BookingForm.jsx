export default function BookingForm({
  formData,
  setFormData,
  handleBooking,
  selectedDoctor,
  onCancel,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-3xl mb-10">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2">
        📅 Appointment Form
      </h2>

      <p className="text-slate-400 mb-6">
        Booking with <span className="text-cyan-400">{selectedDoctor.name}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <input
          type="text"
          placeholder="Patient Name"
          value={formData.patient}
          onChange={(e) =>
            setFormData({ ...formData, patient: e.target.value })
          }
          className="bg-slate-800 border border-slate-700 p-3 rounded-xl outline-none focus:border-cyan-500"
        />

        <input
          type="number"
          placeholder="Age"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          className="bg-slate-800 border border-slate-700 p-3 rounded-xl outline-none focus:border-cyan-500"
        />

        <input
          type="text"
          placeholder="Symptoms"
          value={formData.symptoms}
          onChange={(e) =>
            setFormData({ ...formData, symptoms: e.target.value })
          }
          className="bg-slate-800 border border-slate-700 p-3 rounded-xl outline-none focus:border-cyan-500"
        />

        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="bg-slate-800 border border-slate-700 p-3 rounded-xl outline-none focus:border-cyan-500"
        />

        <input
          type="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          className="bg-slate-800 border border-slate-700 p-3 rounded-xl outline-none focus:border-cyan-500"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={() => handleBooking(selectedDoctor)}
          className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-bold"
        >
          Confirm Booking
        </button>

        <button
          onClick={onCancel}
          className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-xl font-bold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}