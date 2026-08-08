import React, { useEffect, useState } from "react";
import { useDoctorStore } from "../stores/doctorStore";

export default function Doctors() {
  const { doctors, fetchDoctors, addDoctor, isLoading } = useDoctorStore();
  const [showModal, setShowModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: "", department: "", specialization: "", phone: "", email: "" });

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoctor(newDoctor);
    setShowModal(false);
    setNewDoctor({ name: "", department: "", specialization: "", phone: "", email: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Provider Directory</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Review clinical providers, specialties, and schedules.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors"
        >
          Add Doctor
        </button>
      </div>

      {isLoading ? (
        <div className="text-center p-8">Loading doctors...</div>
      ) : doctors.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-200">No doctors available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map(doctor => (
            <div key={doctor.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-semibold">{doctor.name}</h3>
              <p className="text-sm text-slate-500">{doctor.specialization} - {doctor.department}</p>
              <div className="mt-4 text-sm">
                <p>Phone: {doctor.phone || "N/A"}</p>
                <p>Email: {doctor.email || "N/A"}</p>
                <p className="mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${doctor.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {doctor.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md dark:bg-slate-800">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Add New Doctor</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium dark:text-slate-300">Name</label>
                <input required type="text" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} className="w-full mt-1 p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-slate-300">Department</label>
                <input required type="text" value={newDoctor.department} onChange={e => setNewDoctor({...newDoctor, department: e.target.value})} className="w-full mt-1 p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-slate-300">Specialization</label>
                <input required type="text" value={newDoctor.specialization} onChange={e => setNewDoctor({...newDoctor, specialization: e.target.value})} className="w-full mt-1 p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-slate-300">Phone</label>
                <input type="text" value={newDoctor.phone} onChange={e => setNewDoctor({...newDoctor, phone: e.target.value})} className="w-full mt-1 p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-slate-300">Email</label>
                <input type="email" value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} className="w-full mt-1 p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl dark:border-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
