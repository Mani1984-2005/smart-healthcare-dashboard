import BlockedModule from "../components/common/BlockedModule";

export default function PharmacyPage() {
  return (
    <BlockedModule
      title="Pharmacy Management"
      description="Medicine and stock records are not displayed from static fixtures. The verified medicine catalogue contract must be restored before the module is operational."
      missing={[
        "No verified medicine catalogue list/create/edit/delete contract.",
        "No verified stock-movement or expiry workflow contract.",
        "No verified dispensing contract confirmed for this redesigned route.",
      ]}
    />
  );
}
