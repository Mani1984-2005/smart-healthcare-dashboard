import React, { useEffect, useState } from "react";
import { useAppointmentStore } from "../stores/appointmentStore";
import { useDoctorStore } from "../stores/doctorStore";

export default function Appointments() {
  const { appointments, fetchAppointments, bookAppointment, updateStatus, isLoading, error } = useAppointmentStore();
  const { doctors, fetchDoctors } = useDoctorStore();
  const [showModal, setShowModal] = useState(false);
  
  // A simple booking form state (hardcoding a test patient ID since we have no real auth patient yet)
  const [newAppt, setNewAppt] = useState({ 
    patientId: "test-patient-id", 
    doctorId: "", 
    date: "", 
    timeSlot: "", 
    reason: "" 
  });

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [fetchAppointments, fetchDoctors]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bookAppointment(newAppt);
      setShowModal(false);
      setNewAppt({ patientId: "test-patient-id", doctorId: "", date: "", timeSlot: "", reason: "" });
    } catch (err) {
      alert(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Appointment Scheduling</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Coordinate patient appointments and provider availability.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors"
        >
          Book Appointment
        </button>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-800 rounded-xl">{error}</div>}

      {isLoading ? (
        <div className="text-center p-8">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-200">No appointments scheduled.</div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Doctor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Patient ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {appointments.map(appt => (
                <tr key={appt.id}>
                  <td className="px-6 py-4 text-sm">{new Date(appt.date).toLocaleDateString()} {appt.timeSlot}</td>
                  <td className="px-6 py-4 text-sm">{appt.doctor?.name || appt.doctorId}</td>
                  <td className="px-6 py-4 text-sm">{appt.patient?.name || appt.patientId}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {appt.status === "SCHEDULED" && (
                      <button onClick={() => updateStatus(appt.id, "CANCELLED")} className="text-red-600 hover:text-red-900">Cancel</button>
                    )}
                    {appt.status !== "COMPLETED" && appt.status !== "CANCELLED" && (
                      <button onClick={() => updateStatus(appt.id, "COMPLETED")} className="text-green-600 hover:text-green-900">Complete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md dark:bg-slate-800">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Book Appointment</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium dark:text-slate-300">Doctor</label>
                <select required value={newAppt.doctorId} onChange={e => setNewAppt({...newAppt, doctorId: e.target.value})} className="w-full mt-1 p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600">
                  <option value="">Select a doctor</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-slate-300">Date</label>
                <input required type="date" value={newAppt.date} onChange={e => setNewAppt({...newAppt, date: e.target.value})} className="w-full mt-1 p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-slate-300">Time Slot</label>
                <select required value={newAppt.timeSlot} onChange={e => setNewAppt({...newAppt, timeSlot: e.target.value})} className="w-full mt-1 p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600">
                  <option value="">Select time slot</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-slate-300">Reason</label>
                <input type="text" value={newAppt.reason} onChange={e => setNewAppt({...newAppt, reason: e.target.value})} className="w-full mt-1 p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl dark:border-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl">Book</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
