import BlockedModule from "../components/common/BlockedModule";

export default function DashboardPage() {
  return (
    <BlockedModule
      title="Operations Dashboard"
      description="The dashboard requires verified, role-specific backend summaries. Static doctors and browser-local operational totals are not presented as live healthcare data."
      missing={[
        "No verified role-specific dashboard summary contract inspected.",
        "Appointment, patient, pharmacy and laboratory totals require live source contracts.",
      ]}
    />
  );
}
