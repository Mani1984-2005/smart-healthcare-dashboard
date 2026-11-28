import BlockedModule from "../components/common/BlockedModule";

export default function PatientDashboardPage() {
  return (
    <BlockedModule
      title="Patient Portal"
      description="Patient-specific clinical and appointment records are unavailable until backend identity-to-patient ownership is verified."
      missing={[
        "No verified authenticated-patient profile contract.",
        "No verified patient-scoped appointment, prescription or laboratory result contract.",
      ]}
    />
  );
}
