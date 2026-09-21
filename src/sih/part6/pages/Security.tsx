import { useState } from "react";
import { CheckCircle2, PlayCircle, XCircle } from "lucide-react";
import { Badge, Button, EmptyState, LoadingState, PageHeader, Section } from "../../components/ui";
import { ErrorPanel, OutcomeBadge } from "../components/common";
import { api, ApiError, request } from "../api/client";
import type { AuditEntry, PermissionMatrix, Role } from "../api/types";
import { useApi } from "../hooks/useApi";
import { usePart6Auth } from "../store/authStore";
import { formatTime, ROLE_LABEL } from "../lib";

interface Posture { checks: { id: string; label: string; ok: boolean; detail: string }[]; auditChain: { ok: boolean; total: number; brokenAt: string | null }; demoClockOffsetDays: number }
interface Outcome { status: number; code: string; message: string }

const FORBIDDEN_FOR: Record<Role, { method: "POST" | "PUT"; path: string; body: unknown; label: string }> = {
  PATIENT: { method: "POST", path: "/fhir/generate", body: { patientId: "MCP-DEMO-001" }, label: "Patient tries to generate FHIR" },
  DOCTOR: { method: "PUT", path: "/settings", body: { maxConsentDurationDays: 365 }, label: "Doctor tries to change security settings" },
  HOSPITAL_ADMIN: { method: "PUT", path: "/settings", body: { maxConsentDurationDays: 365 }, label: "Hospital admin tries to change security settings" },
  SYSTEM_ADMIN: { method: "POST", path: "/fhir/generate", body: { patientId: "MCP-DEMO-001" }, label: "System admin tries to read clinical data (generate FHIR)" },
};

async function attempt(fn: () => Promise<unknown>): Promise<Outcome> {
  try {
    await fn();
    return { status: 200, code: "ALLOWED", message: "The server allowed this request for your role." };
  } catch (e) {
    const err = e as ApiError;
    return { status: err.status, code: err.code, message: err.message };
  }
}

export default function Security() {
  const user = usePart6Auth((s) => s.user)!;
  const token = usePart6Auth((s) => s.token)!;
  const isAdmin = user.role === "HOSPITAL_ADMIN" || user.role === "SYSTEM_ADMIN";
  const matrix = useApi(() => api.get<PermissionMatrix>("/security/matrix"), []);
  const posture = useApi(() => api.get<Posture>("/security/posture"), [], isAdmin);
  const events = useApi(() => api.get<{ total: number; events: AuditEntry[] }>("/security/events"), [], isAdmin);
  const [results, setResults] = useState<Record<string, Outcome>>({});
  const [running, setRunning] = useState<string | null>(null);

  const otherPatient = user.patientId === "MCP-DEMO-001" ? "MCP-DEMO-002" : "MCP-DEMO-001";
  const forbidden = FORBIDDEN_FOR[user.role];
  const tampered = `${token.slice(0, -4)}${token.endsWith("AAAA") ? "BBBB" : "AAAA"}`;
  const tests = [
    { id: "anon", label: "Call the API with no credentials", expect: 401, run: () => attempt(() => request("GET", "/consent", undefined, null)) },
    { id: "tamper", label: "Call the API with a tampered session token", expect: 401, run: () => attempt(() => request("GET", "/consent", undefined, tampered)) },
    { id: "rbac", label: forbidden.label, expect: 403, run: () => attempt(() => request(forbidden.method, forbidden.path, forbidden.body)) },
    { id: "idor", label: `Read the identity of ${otherPatient} (not yours)`, expect: 403, run: () => attempt(() => request("GET", `/patients/${otherPatient}/identity`)) },
    { id: "consent", label: "Export records with no consent", expect: 403, run: () => attempt(() => request("POST", "/share", {})) },
  ];

  async function runTest(t: (typeof tests)[number]) {
    setRunning(t.id);
    const r = await t.run();
    setResults((prev) => ({ ...prev, [t.id]: r }));
    setRunning(null);
    events.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Part 6 · Security" title="Security" description="Authentication boundary, deny-by-default role permissions, consent enforcement and a live self-test that fires real requests at the server." />

      <Section title="Live security self-test" description="Each button sends a real request. A correct system blocks it and records it in the audit log. Results below are the server's actual responses.">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {tests.map((t) => {
            const r = results[t.id];
            const blocked = r && r.status === t.expect;
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.label}</p>
                  <p className="text-xs text-slate-500">Expected: blocked with HTTP {t.expect}</p>
                  {r && (
                    <p className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${blocked ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                      {blocked ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                      HTTP {r.status} · {r.code} · {r.message}
                    </p>
                  )}
                </div>
                <Button variant="secondary" loading={running === t.id} onClick={() => void runTest(t)}><PlayCircle className="h-4 w-4" aria-hidden="true" />Run</Button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500">An amber result means the server <em>allowed</em> the action for your current role (for example, a System Admin may read masked identity). That is the real permission decision, not a UI simulation.</p>
      </Section>

      <Section title="Role permission matrix" description="This table is generated from the same definition the server enforces. Your role is highlighted.">
        {matrix.loading && <LoadingState />}
        {matrix.error && <ErrorPanel error={matrix.error} onRetry={matrix.reload} />}
        {matrix.data && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Feature</th>
                  {matrix.data.roles.map((r) => <th key={r} className={`px-3 ${r === user.role ? "text-cyan-700 dark:text-cyan-300" : ""}`}>{ROLE_LABEL[r]}{r === user.role && " (you)"}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.data.rows.map((row) => (
                  <tr key={row.permission} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-3">{row.label}</td>
                    {matrix.data!.roles.map((r) => (
                      <td key={r} className={`px-3 text-xs ${r === user.role ? "bg-cyan-50/60 dark:bg-cyan-950/30" : ""}`}>
                        {row.access[r] ? <span className="font-semibold text-emerald-700 dark:text-emerald-300">✓ {row.access[r]}</span> : <span className="text-slate-400">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {isAdmin ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Security posture">
            {posture.loading && <LoadingState />}
            {posture.error && <ErrorPanel error={posture.error} onRetry={posture.reload} />}
            {posture.data && (
              <ul className="space-y-3">
                {posture.data.checks.map((c) => (
                  <li key={c.id} className="flex gap-3 text-sm">
                    {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />}
                    <span><span className="font-medium">{c.label}</span><span className="block text-xs text-slate-500">{c.detail}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Recent security events" description={`${events.data?.total ?? 0} in scope`}>
            {events.loading && <LoadingState />}
            {events.error && <ErrorPanel error={events.error} onRetry={events.reload} />}
            {events.data && events.data.events.length === 0 && <EmptyState title="No security events" />}
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.data?.events.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-16 shrink-0 text-xs tabular-nums text-slate-500">{formatTime(e.ts)}</span>
                  <span className="min-w-0 flex-1 truncate">{e.label} <span className="text-xs text-slate-500">· {e.actor.name}</span></span>
                  <OutcomeBadge status={e.status} />
                </li>
              ))}
            </ul>
          </Section>
        </div>
      ) : (
        <Section title="Security posture & events"><p className="text-sm text-slate-600 dark:text-slate-300">Posture checks and organisation-wide security events are visible to <Badge variant="info">Hospital Admin</Badge> and <Badge variant="info">System Admin</Badge>. Your own activity is under Audit Logs.</p></Section>
      )}
    </div>
  );
}
