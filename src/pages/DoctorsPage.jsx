import BlockedModule from "../components/common/BlockedModule";

export default function DoctorsPage() {
  return (
    <BlockedModule
      title="Doctor Directory"
      description="The redesign cannot safely display or manage doctor records until a verified doctor service contract is available."
      missing={[
        "No frontend doctor API client with a verified backend route.",
        "No create, edit, availability or appointment relationship contract verified.",
      ]}
    />
  );
}
