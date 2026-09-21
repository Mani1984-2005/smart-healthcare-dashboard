import { Link } from "react-router-dom";
import { ArrowRight, Boxes, ClipboardCheck, FileCheck2, FileJson, HandCoins, Hourglass, Share2, ShieldAlert, Users } from "lucide-react";
import { Badge, Card, EmptyState, LoadingState, MetricCard, PageHeader, Section } from "../../components/ui";
import { ErrorPanel, OutcomeBadge } from "../components/common";
import { api } from "../api/client";
import type { Overview as OverviewData } from "../api/types";
import { useApi } from "../hooks/useApi";
import { formatTime, formatDate, ROLE_LABEL } from "../lib";
import { usePart6Auth } from "../store/authStore";

const PIPELINE = [
  { label: "Health data", sub: "Synthetic demo records" },
  { label: "FHIR standardisation", sub: "R4 resources & bundles" },
  { label: "Patient consent", sub: "Scoped, time-limited" },
  { label: "Authorization", sub: "RBAC + org checks" },
  { label: "Secure sharing", sub: "Minimum necessary" },
  { label: "Audit trail", sub: "Hash-chained log" },
];

export default function Overview() {
  const user = usePart6Auth((s) => s.user)!;
  const { data, error, loading, reload } = useApi(() => api.get<OverviewData>("/overview"), []);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Part 6" title="ABDM / FHIR Interoperability" description={`Consent-driven health-data sharing prototype. You are viewing data scoped to the ${ROLE_LABEL[user.role]} role.`} />
      {loading && <LoadingState label="Loading overview…" />}
      {error && <ErrorPanel error={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="FHIR Resources" value={data.counts.fhirResources} icon={<FileJson className="h-5 w-5" />} description={`${data.counts.fhirBundles} bundle(s) generated`} />
            <MetricCard label="Active Consents" value={data.counts.activeConsents} icon={<ClipboardCheck className="h-5 w-5" />} description="Granted and not expired" />
            <MetricCard label="Pending Requests" value={data.counts.pendingRequests} icon={<Hourglass className="h-5 w-5" />} description="Awaiting patient decision" />
            <MetricCard label="Shared Records" value={data.counts.sharedRecords} icon={<Share2 className="h-5 w-5" />} description={`${data.counts.sharedResources} resource(s) released`} />
            <MetricCard label="Security Events" value={data.counts.securityEvents} icon={<ShieldAlert className="h-5 w-5" />} description="Denials, failures, revocations" />
            <MetricCard label="FHIR Validation" value={data.validation.rate === null ? "—" : `${data.validation.rate}%`} icon={<FileCheck2 className="h-5 w-5" />} description={data.validation.total ? `${data.validation.valid} of ${data.validation.total} runs valid` : "No validation runs yet"} />
          </div>

          <Section title="Interoperability pipeline" description="Every exchange passes each stage, enforced on the server. Nothing here depends on any other MediCare Pro module.">
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {PIPELINE.map((s, i) => (
                <li key={s.label} className="relative rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">Step {i + 1}</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.sub}</p>
                  {i < PIPELINE.length - 1 && <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-slate-400 lg:block" aria-hidden="true" />}
                </li>
              ))}
            </ol>
          </Section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Section title="Recent activity" description="Latest audit entries visible to your role." action={<Link className="text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300" to="/part6/audit">Open audit logs</Link>}>
              {data.recentActivity.length === 0 ? (
                <EmptyState title="No activity yet" description="Actions taken in Part 6 will appear here." />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recentActivity.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-3">
                      <span className="w-20 shrink-0 text-xs tabular-nums text-slate-500" title={formatDate(e.ts)}>{formatTime(e.ts)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{e.label}</p>
                        <p className="truncate text-xs text-slate-500">{e.actor.name}{e.reason ? ` · ${e.reason}` : ""}</p>
                      </div>
                      <OutcomeBadge status={e.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Card title="What is real, what is demo" subtitle="Honest boundaries for this prototype">
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                <li className="flex gap-2"><Boxes className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span><strong>Implemented:</strong> FHIR R4 mapping, structural validation, consent lifecycle, RBAC, consent-gated exchange, audit chain.</span></li>
                <li className="flex gap-2"><HandCoins className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" /><span><strong>Demo only:</strong> patients, ABHA placeholders, personas, storage.</span></li>
                <li className="flex gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" /><span><strong>Not connected:</strong> live ABDM / ABHA verification. Mode: <Badge variant="warning">ABDM_MODE={data.modes.abdmMode}</Badge></span></li>
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
