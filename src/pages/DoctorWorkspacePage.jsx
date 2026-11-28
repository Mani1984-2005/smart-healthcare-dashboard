import BlockedModule from "../components/common/BlockedModule";

export default function DoctorWorkspacePage() {
  return (
    <BlockedModule
      title="Clinical Workspace"
      description="The doctor workspace requires verified patient assignments and clinical APIs before it can safely operate."
      missing={[
        "No verified assigned-patient list contract.",
        "No verified schedule or consultation history contract.",
        "No verified prescription creation contract in this redesign.",
      ]}
    />
  );
}
