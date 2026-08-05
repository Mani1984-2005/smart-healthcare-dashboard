import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePatientStore } from "../stores/patientStore.ts";
import Card from "../components/patients/PatientCard.tsx";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedPatient, setSelectedPatient, loading, error, clearSelectedPatient } = usePatientStore();

  useEffect(() => {
    if (id) {
      setSelectedPatient(id);
    }
    return () => clearSelectedPatient();
  }, [id, setSelectedPatient, clearSelectedPatient]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-10 shadow-card dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded-3xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-6 w-1/2 rounded-3xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-48 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Unable to load patient" description={error} />;
  }

  if (!selectedPatient) {
    return <EmptyState title="Patient not found" description="Please return to the patient list and select a valid patient record." />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(300px,360px)_1fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Patient profile</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{selectedPatient.fullName}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{selectedPatient.id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedPatient.status}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registered {selectedPatient.registrationDate}</p>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Email:</span> {selectedPatient.email}</p>
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Phone:</span> {selectedPatient.phone}</p>
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Age / Gender:</span> {selectedPatient.age} / {selectedPatient.gender}</p>
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Blood group:</span> {selectedPatient.bloodGroup}</p>
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Address:</span> {selectedPatient.address}</p>
          </div>
          <div className="mt-8 rounded-[1.5rem] bg-slate-50 p-4 text-sm dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Medical history</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {selectedPatient.medicalHistory.length > 0 ? (
                selectedPatient.medicalHistory.map((entry, index) => (
                  <li key={index} className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-950">{entry}</li>
                ))
              ) : (
                <li className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-950">No medical history recorded.</li>
              )}
            </ul>
          </div>
          <Button onClick={() => navigate("/patients")}>Back to list</Button>
        </div>

        <div className="space-y-4">
          <Card label="Latest visit" value="12 Aug 2025" description="Routine follow up and blood work" />
          <Card label="Ward" value="General" description="Room 25B" />
          <Card label="Assigned doctor" value="Dr. Kavya Shah" description="Cardiology" />
        </div>
      </section>
    </div>
  );
}
