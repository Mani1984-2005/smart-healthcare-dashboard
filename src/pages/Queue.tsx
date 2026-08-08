import React, { useEffect } from "react";
import { useQueueStore } from "../stores/queueStore";
import { useAppointmentStore } from "../stores/appointmentStore";

export default function Queue() {
  const { queues, fetchQueue, checkIn, updateStatus: updateQueueStatus, isLoading } = useQueueStore();
  const { appointments, fetchAppointments } = useAppointmentStore();

  useEffect(() => {
    fetchQueue();
    fetchAppointments();
  }, [fetchQueue, fetchAppointments]);

  const handleCheckIn = async (appointment: any) => {
    try {
      await checkIn({
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        doctorId: appointment.doctorId,
      });
    } catch (err) {
      alert(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Live Queue & Check-In</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Manage patient arrivals and consultation progress.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Scheduled Appointments waiting to check-in */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold mb-4">Scheduled Today</h3>
          <div className="space-y-4">
            {appointments.filter(a => a.status === "SCHEDULED" || a.status === "CONFIRMED").map(appt => (
              <div key={appt.id} className="p-4 border rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-medium">{appt.patient?.name || "Patient"}</p>
                  <p className="text-sm text-slate-500">{appt.timeSlot} - Dr. {appt.doctor?.name}</p>
                </div>
                <button 
                  onClick={() => handleCheckIn(appt)}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
                >
                  Check In
                </button>
              </div>
            ))}
            {appointments.filter(a => a.status === "SCHEDULED" || a.status === "CONFIRMED").length === 0 && (
              <p className="text-slate-500 text-sm">No scheduled appointments waiting.</p>
            )}
          </div>
        </div>

        {/* Right column: Active Queue */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold mb-4">Active Queue</h3>
          <div className="space-y-4">
            {queues.filter(q => q.status !== "COMPLETED").map((q, idx) => (
              <div key={q.id} className="p-4 border rounded-xl flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="font-medium">{q.patient?.name || "Patient"}</p>
                    <p className="text-sm text-slate-500">
                      Dr. {q.appointment?.doctor?.name} | {q.status}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {q.status === "WAITING" && (
                    <button 
                      onClick={() => updateQueueStatus(q.id, "IN_PROGRESS")}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      Start
                    </button>
                  )}
                  {q.status === "IN_PROGRESS" && (
                    <button 
                      onClick={() => updateQueueStatus(q.id, "COMPLETED")}
                      className="bg-slate-600 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
            {queues.filter(q => q.status !== "COMPLETED").length === 0 && (
              <p className="text-slate-500 text-sm">Queue is empty.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
