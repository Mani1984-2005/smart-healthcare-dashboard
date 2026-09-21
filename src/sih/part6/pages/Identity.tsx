import { ReactNode, useState } from "react";
import { BadgeCheck, Info, Link2Off } from "lucide-react";
import { Badge, Button, Card, EmptyState, LoadingState, PageHeader } from "../../components/ui";
import { ErrorPanel } from "../components/common";
import PatientSelect from "../components/PatientSelect";
import { api } from "../api/client";
import type { Identity as IdentityData } from "../api/types";
import { useApi } from "../hooks/useApi";
import { usePatients } from "../hooks/usePatients";
import { formatDate } from "../lib";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

export default function Identity() {
  const patients = usePatients();
  const current = patients.current;
  const [forced, setForced] = useState<string | null>(null);
  const target = current?.id ?? null;
  // Directory patients belong to another organisation: don't call unless the user explicitly tries.
  const skip = !target || (current?.relation === "directory" && forced !== target);
  const identity = useApi(() => api.get<IdentityData>(`/patients/${target}/identity`), [target, forced], !skip);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Part 6" title="Patient Identity" description="An ABHA-oriented identity view. The internal MediCare Pro patient ID and the ABHA / ABDM identity are two different identifiers and are never treated as the same." />
      {patients.loading && <LoadingState label="Loading patients…" />}
      {patients.error && <ErrorPanel error={patients.error} onRetry={patients.reload} />}
      {!patients.loading && !patients.error && patients.rows.length === 0 && <EmptyState title="No patients available" description="Your role has no patients to display." />}
      {current && (
        <>
          <PatientSelect rows={patients.rows} value={current.id} onChange={patients.select} />
          {skip && (
            <Card title="Not your organisation's record" subtitle="The identity of this patient is held by another organisation. Access requires patient consent.">
              <Button variant="secondary" onClick={() => setForced(current.id)}>Attempt to view anyway (will be blocked and audited)</Button>
            </Card>
          )}
          {!skip && identity.loading && <LoadingState label="Loading identity…" />}
          {!skip && identity.error && <ErrorPanel error={identity.error} onRetry={identity.reload} />}
          {identity.data && !skip && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title={identity.data.internal.label} subtitle="Issued and used inside MediCare Pro">
                  <dl>
                    <Row label="Patient name" value={<span className="flex items-center gap-2">{identity.data.displayName} <Badge variant="warning">DEMO DATA</Badge></span>} />
                    <Row label="Internal patient ID" value={<code>{identity.data.internal.patientId}</code>} />
                    <Row label="Gender" value={identity.data.gender ?? "Hidden for your role"} />
                    <Row label="Date of birth" value={identity.data.birthDate ? formatDate(identity.data.birthDate) : "Hidden for your role"} />
                    <Row label="Custodian" value={identity.data.custodian.name ?? identity.data.custodian.id} />
                    <Row label="Your access" value={<Badge variant="info">{identity.data.view}</Badge>} />
                  </dl>
                </Card>
                <Card title="ABHA / ABDM identity" subtitle="Demonstration placeholder only">
                  <dl>
                    <Row label="ABHA status" value={<Badge variant="warning">{identity.data.abha.statusLabel}</Badge>} />
                    <Row label="ABHA identifier" value={<code>{identity.data.abha.identifier ?? "—"}</code>} />
                    <Row label="ABHA number" value={<code>{identity.data.abha.maskedNumber}</code>} />
                    <Row label="Verification" value={<span className="flex items-center gap-1.5"><Link2Off className="h-4 w-4 text-slate-400" aria-hidden="true" /> {identity.data.abha.verification} · not performed</span>} />
                  </dl>
                  <p className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{identity.data.abha.note}</p>
                </Card>
              </div>
              <Card title="Why two identifiers?">
                <p className="text-sm text-slate-700 dark:text-slate-200">{identity.data.separateIdentifiersNote} In generated FHIR Patient resources they appear as separate <code>identifier</code> entries in different systems, and the ABHA entry is explicitly marked as a demo placeholder.</p>
                <p className="mt-3 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />A production deployment would link the ABHA through ABDM&rsquo;s own verified flows using sandbox/production credentials. That is not implemented in this prototype, so there is no &ldquo;Verify ABHA&rdquo; action here on purpose.</p>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
