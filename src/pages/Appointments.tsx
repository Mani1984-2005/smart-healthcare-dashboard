import React, { useEffect, useState } from "react";
import { useAppointmentStore } from "../stores/appointmentStore";
import { useDoctorStore } from "../stores/doctorStore";
import { useAuthStore } from "../store/authStore.js";
import api from "../services/api.js";

export default function Appointments() {
  const { appointments, fetchAppointments, bookAppointment, updateStatus, isLoading, error } = useAppointmentStore();
  const { doctors, fetchDoctors } = useDoctorStore();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [bookingType, setBookingType] = useState<"myself" | "someone_else" | null>(null);
const [newAppt, setNewAppt] = useState({
  patientId: "",
  patientName: "",
  doctorId: "",
  date: "",
  timeSlot: "",
  reason: ""
});

  // "Someone else" — look up an existing patient before creating a new record.
  const [lookupKey, setLookupKey] = useState("");
  const [lookupResults, setLookupResults] = useState<Array<{ id: number; name: string; age?: number | null; gender?: string | null; phone?: string | null }>>([]);
  const [selectedOther, setSelectedOther] = useState<{ id: number; name: string } | null>(null);
  const [looking, setLooking] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [fetchAppointments, fetchDoctors]);

  const lookupPatient = async () => {
    setFormError("");
    if (!lookupKey.trim()) {
      setFormError("Enter a phone number or full name to look up an existing patient.");
      return;
    }
    setLooking(true);
    try {
      const asPhone = /^[0-9+\-\s]{6,}$/.test(lookupKey.trim());
      const query = asPhone
        ? `phone=${encodeURIComponent(lookupKey.trim())}`
        : `name=${encodeURIComponent(lookupKey.trim())}`;
      const response = await api.get(`/patients/booking-lookup?${query}`);
      const data = response?.data?.data ?? [];
      setLookupResults(data);
      if (data.length === 0) {
        setFormError("No existing patient matched — fill in the name to create a new record instead.");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLooking(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      let payload: Record<string, unknown>;

      if (bookingType === "myself") {
        // MYSELF: use the authenticated patient's own resolved profile.
        // Never re-enter name/age/gender/phone — the backend enforces
        // that the appointment belongs to this exact patient.
        const patientId = (user as any)?.patientId;
        if (!patientId) {
          throw new Error("Your patient profile was not resolved — sign out and sign in again.");
        }
        payload = { ...newAppt, patientId, patientName: "" };
      } else if (selectedOther) {
        // SOMEONE ELSE — an existing patient selected via lookup.
        payload = { ...newAppt, bookForOther: true, patientId: selectedOther.id, patientName: "" };
      } else {
        // SOMEONE ELSE — create a new patient record for the person being booked.
        if (!newAppt.patientName.trim()) {
          throw new Error("Select an existing patient or enter a name to create one.");
        }
        payload = { ...newAppt, bookForOther: true };
        delete (payload as any).patientId;
      }

      await bookAppointment(payload);
      setShowModal(false);
      setBookingType(null);
      setNewAppt({ patientId: "", patientName: "", doctorId: "", date: "", timeSlot: "", reason: "" });
      setLookupKey("");
      setLookupResults([]);
      setSelectedOther(null);
      fetchAppointments().catch(() => {});
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
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
                    {["DOCTOR", "ADMIN"].includes((user as any)?.role || "") && appt.status !== "CANCELLED" && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await api.post("/encounters", { appointmentId: appt.id });
                            const patientId = response?.data?.encounter?.patientId ?? appt.patientId;
                            window.location.assign(`/patients/${patientId}`);
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Unable to start encounter");
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Start Consultation
                      </button>
                    )}
                    {["DOCTOR", "ADMIN"].includes((user as any)?.role || "") && (
                      <a href={`/patients/${appt.patientId}`} className="text-cyan-600 hover:text-cyan-800">Patient360</a>
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
            {!bookingType ? (
              <div className="space-y-4">
                <p className="text-sm dark:text-slate-300">Who are you booking for?</p>
                <button onClick={() => setBookingType("myself")} className="w-full p-4 border rounded-xl text-left hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-200">
                  <div className="font-medium">Myself</div>
                  <div className="text-sm text-slate-500">Book for {user?.name || "current user"}</div>
                </button>
                <button onClick={() => setBookingType("someone_else")} className="w-full p-4 border rounded-xl text-left hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-200">
                  <div className="font-medium">Someone Else</div>
                  <div className="text-sm text-slate-500">Book for a dependent or another patient</div>
                </button>
                <div className="flex justify-end mt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl dark:border-slate-600 dark:text-slate-300">Cancel</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAdd} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{formError}</div>
                )}
                {bookingType === "someone_else" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium dark:text-slate-300">Find existing patient (phone or full name)</label>
                      <div className="mt-1 flex gap-2">
                        <input type="text" placeholder="e.g. 9876543210" value={lookupKey} onChange={e => setLookupKey(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
                        <button type="button" onClick={lookupPatient} disabled={looking} className="px-3 py-2 bg-slate-200 rounded-xl text-sm disabled:opacity-50 dark:bg-slate-600">
                          {looking ? "…" : "Search"}
                        </button>
                      </div>
                      {lookupResults.length > 0 && (
                        <ul className="mt-2 max-h-32 overflow-auto rounded-xl border dark:border-slate-600">
                          {lookupResults.map(p => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => { setSelectedOther({ id: p.id, name: p.name }); setNewAppt({ ...newAppt, patientName: "" }); setFormError(""); }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedOther?.id === p.id ? "bg-cyan-50 text-cyan-800" : ""}`}
                              >
                                {p.name}{p.age ? ` · ${p.age}y` : ""}{p.gender ? ` · ${p.gender}` : ""}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {selectedOther && (
                        <div className="mt-2 p-2 bg-cyan-50 text-cyan-800 rounded-xl text-sm flex justify-between items-center">
                          <span>Selected: {selectedOther.name} (#{selectedOther.id})</span>
                          <button type="button" onClick={() => setSelectedOther(null)} className="text-xs underline">Clear</button>
                        </div>
                      )}
                    </div>
                    {!selectedOther && (
                      <div>
                        <label className="block text-sm font-medium dark:text-slate-300">Or create new — Patient Name</label>
                        <input type="text" placeholder="Enter patient name" value={newAppt.patientName} onChange={e => setNewAppt({...newAppt, patientName: e.target.value})} className="w-full mt-1 p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
                      </div>
                    )}
                  </div>
                )}
                {bookingType === "myself" && (
                  <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-sm">
                    Booking for: {user?.name || "Current User"} — using your saved profile. No need to re-enter your details.
                  </div>
                )}
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
                  <button type="button" onClick={() => setBookingType(null)} className="px-4 py-2 border rounded-xl dark:border-slate-600 dark:text-slate-300">Back</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl">Book</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
