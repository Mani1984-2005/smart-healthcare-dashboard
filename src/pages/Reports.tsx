import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/ui";
import { usePatientStore } from "../stores/patientStore.ts";
import { useBillingStore } from "../stores/billingStore.ts";
import ReportAssistant from "../components/reports/ReportAssistant.tsx";
import ReportTypeSelector from "../components/reports/ReportTypeSelector.tsx";
import ReportView from "../components/reports/ReportView.tsx";
import ScheduledReports from "../components/reports/ScheduledReports.tsx";
import { generateReport } from "../components/reports/reportData.ts";

export default function Reports() {
  const { patients, loadPatients } = usePatientStore();
  const { invoices, loadInvoices } = useBillingStore();
  const [selectedReportId, setSelectedReportId] = useState("financial-revenue");

  useEffect(() => {
    loadPatients();
    loadInvoices();
  }, [loadPatients, loadInvoices]);

  const result = useMemo(() => generateReport(selectedReportId, patients, invoices), [selectedReportId, patients, invoices]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hospital intelligence center"
        title="Reports & analytics"
        description="Build reports across patients, doctors, finance, and operations — export the data or set a delivery cadence."
      />

      <ReportAssistant onSelectReport={setSelectedReportId} />

      <ReportTypeSelector selectedId={selectedReportId} onSelect={setSelectedReportId} />

      <ReportView result={result} />

      <ScheduledReports reportTitle={result.definition.title} />
    </div>
  );
}
