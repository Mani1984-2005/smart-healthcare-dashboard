import BlockedModule from "../components/common/BlockedModule";

export default function ReceptionistPage() {
  return (
    <BlockedModule
      title="Reception Desk"
      description="Reception operations require verified patient and appointment APIs. Static registrations and appointments are not shown."
      missing={[
        "No verified receptionist-scoped patient registration contract.",
        "No verified appointment booking, rescheduling or cancellation contract.",
      ]}
    />
  );
}
