import { useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import { Badge, Button, EmptyState, LoadingState, PageHeader, Section } from "../../components/ui";
import { ErrorPanel, OutcomeBadge } from "../components/common";
import { api } from "../api/client";
import type { AuditEntry } from "../api/types";
import { useApi } from "../hooks/useApi";
import { usePart6Auth } from "../store/authStore";
import { formatDate, formatTime, selectClass } from "../lib";

const CATEGORIES = ["authentication", "authorization", "fhir", "consent", "exchange", "admin", "system"];

export default function AuditLogs() {
  const role = usePart6Auth((s) => s.user!.role);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [securityOnly, setSecurityOnly] = useState(false);
  const [chain, setChain] = useState<{ ok: boolean; total: number; brokenAt: string | null } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const q = new URLSearchParams({ limit: "200", ...(category ? { category } : {}), ...(status ? { status } : {}), ...(securityOnly ? { securityOnly: "true" } : {}) }).toString();
  const log = useApi(() => api.get<{ total: number; entries: AuditEntry[] }>(`/audit?${q}`), [q]);
  const scope = { PATIENT: "Limited: events about your own record", DOCTOR: "Limited: your own actions", HOSPITAL_ADMIN: "Your organisation", SYSTEM_ADMIN: "All events" }[role];

  async function verify() {
    setVerifying(true);
    try {
      setChain(await api.get("/audit/verify"));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Part 6 · Auditability" title="Audit Logs" description="An append-only, hash-chained record of security-relevant actions. No passwords, tokens or clinical values are logged." actions={role === "SYSTEM_ADMIN" ? <Button variant="secondary" loading={verifying} onClick={() => void verify()}>Verify integrity</Button> : undefined} />
      {chain && (
        <div role="status" className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${chain.ok ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          {chain.ok ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : <ShieldX className="h-4 w-4" aria-hidden="true" />}
          {chain.ok ? `Hash chain intact: ${chain.total} entries verified.` : `TAMPERING DETECTED at ${chain.brokenAt}.`}
        </div>
      )}
      <Section title="Events" description={`Visibility: ${scope}. Showing ${log.data?.entries.length ?? 0} of ${log.data?.total ?? 0}, newest first.`} action={<Button variant="ghost" onClick={log.reload}>Refresh</Button>}>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Category<select className={`${selectClass} mt-1 w-40`} value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Outcome<select className={`${selectClass} mt-1 w-36`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="success">Success</option><option value="denied">Denied</option><option value="failure">Failure</option></select></label>
          <label className="flex items-center gap-2 pb-2 text-xs font-medium text-slate-600 dark:text-slate-300"><input type="checkbox" className="h-4 w-4 accent-cyan-700" checked={securityOnly} onChange={(e) => setSecurityOnly(e.target.checked)} />Security events only</label>
        </div>
        {log.loading && <LoadingState label="Loading audit log…" />}
        {log.error && <ErrorPanel error={log.error} onRetry={log.reload} />}
        {log.data && log.data.entries.length === 0 && <EmptyState title="No matching events" description="Try clearing the filters." />}
        {log.data && log.data.entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2 pr-3">Time</th><th className="pr-3">Actor</th><th className="pr-3">Action</th><th className="pr-3">Resource</th><th className="pr-3">Status</th><th>Reason</th></tr></thead>
              <tbody>
                {log.data.entries.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                    <td className="whitespace-nowrap py-2 pr-3 text-xs tabular-nums text-slate-500"><div className="font-medium text-slate-700 dark:text-slate-200">{formatTime(e.ts)}</div>{formatDate(e.ts)}</td>
                    <td className="pr-3"><div className="font-medium">{e.actor.name}</div><div className="text-xs text-slate-500">{e.actor.role ?? "unauthenticated"}</div></td>
                    <td className="pr-3">{e.label}{e.securityEvent && <Badge variant="warning" className="ml-2">security</Badge>}</td>
                    <td className="pr-3 text-xs text-slate-600 dark:text-slate-300">{e.resource ? <>{e.resource.type}{e.resource.id ? <code className="ml-1">{e.resource.id}</code> : null}</> : "—"}</td>
                    <td className="pr-3"><OutcomeBadge status={e.status} /></td>
                    <td className="text-xs text-slate-600 dark:text-slate-300">{e.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
