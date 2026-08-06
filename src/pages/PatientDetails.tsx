import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePatientStore } from "../stores/patientStore.ts";
import { EmptyState, LoadingState } from "../components/ui";
import PatientProfileWorkspace from "../components/patients/PatientProfileWorkspace.tsx";

export default function PatientDetails() {
  const { id } = useParams();
  const { selectedPatient, setSelectedPatient, loading, error, clearSelectedPatient } = usePatientStore();
  useEffect(() => { if (id) setSelectedPatient(id); return () => clearSelectedPatient(); }, [clearSelectedPatient, id, setSelectedPatient]);
  if (loading) return <LoadingState label="Loading patient clinical workspace…" />;
  if (error) return <EmptyState title="Unable to load patient" description={error} />;
  if (!selectedPatient) return <EmptyState title="Patient not found" description="Please return to the patient registry and select a valid record." />;
  return <PatientProfileWorkspace patient={selectedPatient} />;
}
