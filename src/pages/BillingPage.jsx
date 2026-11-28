import BlockedModule from "../components/common/BlockedModule";

export default function BillingPage() {
  return (
    <BlockedModule
      title="Billing & Invoicing"
      description="Billing mutations are blocked until the verified invoice list/create/payment contracts are implemented. Browser-local invoices are not used as a source of truth."
      missing={[
        "No verified invoice-list or invoice-create backend route.",
        "Only invoice detail and status-update routes were found.",
        "Payment-record and financial-summary contracts remain unverified.",
      ]}
    />
  );
}
