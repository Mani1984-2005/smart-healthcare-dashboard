import { Activity, BedDouble, CalendarPlus, CircleCheck, ClipboardPlus, Hospital, Siren, UsersRound } from "lucide-react";
import { PatientRecord } from "../../stores/patientStore.ts";
import { MetricCard } from "../ui";
import { getPatientPresentation } from "./patientPresentation";

export default function PatientKpiGrid({ patients, loading }: { patients: PatientRecord[]; loading: boolean }) {
  const active = patients.filter((patient) => patient.status === "Active").length;
  const inpatients = patients.filter((patient) => getPatientPresentation(patient).patientType === "Inpatient").length;
  const outpatients = patients.filter((patient) => getPatientPresentation(patient).patientType === "Outpatient").length;
  const emergencies = patients.filter((patient) => getPatientPresentation(patient).patientType === "Emergency").length;
  const discharged = patients.filter((patient) => patient.status === "Discharged").length;
  const pendingAdmissions = patients.filter((patient) => patient.status === "Under Observation").length;
  const cards = [
    ["Total patients", patients.length, "Registered care records", "Registry stable", UsersRound], ["Today's registrations", 0, "Live intake data pending", "Future integration", CalendarPlus],
    ["Active patients", active, "Currently receiving care", `${active} active`, Activity], ["Inpatients", inpatients, "Admitted for care", "Capacity monitored", BedDouble],
    ["Outpatients", outpatients, "Ambulatory visits", "Care access open", Hospital], ["Emergency cases", emergencies, "Priority clinical review", emergencies ? "Review required" : "No active cases", Siren],
    ["Discharged today", discharged, "Completion data pending", "Future integration", CircleCheck], ["Pending admissions", pendingAdmissions, "Awaiting bed workflow", `${pendingAdmissions} to review`, ClipboardPlus],
  ] as const;
  return <section aria-label="Patient operations key performance indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, description, trend, Icon]) => <MetricCard key={label} label={label} value={loading ? "—" : value} description={description} trend={loading ? "Loading…" : trend} icon={<Icon className="h-5 w-5" aria-hidden="true" />} />)}</section>;
}
