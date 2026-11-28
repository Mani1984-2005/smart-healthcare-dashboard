import BlockedModule from "../components/common/BlockedModule";

export default function LaboratoryPage() {
  return (
    <BlockedModule
      title="Laboratory Management"
      description="Clinical laboratory records must come from verified laboratory endpoints. Static test and result fixtures are not presented as live clinical data."
      missing={[
        "No verified paginated laboratory-order list contract.",
        "No verified patient-linked laboratory workflow and status transition contract.",
        "No verified PDF/report endpoint confirmed for the redesign.",
      ]}
    />
  );
}
