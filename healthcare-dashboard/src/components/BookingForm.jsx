export default function BookingForm({
  formData,
  setFormData,
  handleBooking,
  selectedDoctor,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-10">

      <h2 className="text-3xl font-bold mb-6">
        📅 Appointment Form
      </h2>

      <div className="grid md:grid-cols-3 gap-4">

        <input
          type="text"
          placeholder="Patient Name"
          value={formData.patient}
          onChange={(e) =>
            setFormData({
              ...formData,
              patient: e.target.value,
            })
          }
          className="bg-slate-800 p-3 rounded-xl outline-none"
        />

        <input
          type="number"
          placeholder="Age"
          value={formData.age}
          onChange={(e) =>
            setFormData({
              ...formData,
              age: e.target.value,
            })
          }
          className="bg-slate-800 p-3 rounded-xl outline-none"
        />

        <input
          type="text"
          placeholder="Symptoms"
          value={formData.symptoms}
          onChange={(e) =>
            setFormData({
              ...formData,
              symptoms: e.target.value,
            })
          }
          className="bg-slate-800 p-3 rounded-xl outline-none"
        />

      </div>

      <button
        onClick={() => handleBooking(selectedDoctor)}
        className="mt-6 bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-bold"
      >
        Confirm Booking
      </button>

    </div>
  );
}