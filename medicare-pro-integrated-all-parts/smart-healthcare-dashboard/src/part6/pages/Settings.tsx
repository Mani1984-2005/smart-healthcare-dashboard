import { useState } from "react";
import { Badge, Button, Card, LoadingState, PageHeader, Section } from "../../components/ui";
import { ErrorPanel, Field } from "../components/common";
import { api, ApiError } from "../api/client";
import { useApi } from "../hooks/useApi";
import { usePart6Auth } from "../store/authStore";
import { formatDateTime, selectClass } from "../lib";

interface SettingsView {
  settings: { maxConsentDurationDays: number; defaultConsentDurationDays: number };
  environment: { abdmMode: string; fhirMode: string; fhirVersion: string; storage: string; demoAuth: boolean; tokenSecretSource: string };
  demoClock: { offsetDays: number; now: string };
}

const BOUNDARY = [
  ["ABDM connectivity", "Not connected (ABDM_MODE=demo)", "Registered HIP/HIU with ABDM sandbox → production credentials and gateway APIs"],
  ["ABHA verification", "Placeholder identifiers, no verification", "ABHA create/verify through ABDM's own flows"],
  ["FHIR", "R4 resource generation + structural validator", "Profile validation (e.g. ABDM/NRCeS profiles) with the official validator and a terminology server"],
  ["Consent", "Prototype consent lifecycle in Part 6", "ABDM consent-manager artefacts and signed consent"],
  ["Authentication", "Demo personas, HS256 session tokens", "Hospital IdP / ABDM sign-in (OIDC), MFA"],
  ["Storage", "In-memory / JSON file, synthetic data", "Managed database with encryption at rest, backups and access controls"],
  ["Audit", "Hash-chained log (tamper-evident)", "Write-once storage + SIEM forwarding"],
];

export default function Settings() {
  const role = usePart6Auth((s) => s.user!.role);
  const admin = role === "SYSTEM_ADMIN" || role === "HOSPITAL_ADMIN";
  const view = useApi(() => api.get<SettingsView>("/settings"), [], admin);
  const [maxDays, setMaxDays] = useState<number | null>(null);
  const [defDays, setDefDays] = useState<number | null>(null);
  const [advance, setAdvance] = useState(8);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(kind: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(kind);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
      view.reload();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(null);
    }
  }

  const s = view.data?.settings;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Part 6 · Settings" title="Settings" description="Enforced consent limits, environment mode and demo controls. Secrets are never shown here." />

      <Section title="Prototype vs production" description="What this module is, and what would be required for live ABDM interoperability.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2 pr-4">Area</th><th className="pr-4">This prototype</th><th>Production would need</th></tr></thead>
            <tbody>{BOUNDARY.map(([a, b, c]) => <tr key={a} className="border-t border-slate-100 align-top dark:border-slate-800"><td className="py-2 pr-4 font-medium">{a}</td><td className="pr-4 text-slate-700 dark:text-slate-200">{b}</td><td className="text-slate-500">{c}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>

      {!admin && <Card title="Administrator settings"><p className="text-sm text-slate-600 dark:text-slate-300">Environment, consent limits and demo controls are available to administrators.</p></Card>}
      {admin && view.loading && <LoadingState />}
      {admin && view.error && <ErrorPanel error={view.error} onRetry={view.reload} />}
      {(msg || err) && <div role="status">{msg && <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{msg}</p>}{err && <ErrorPanel error={err} />}</div>}

      {view.data && s && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Environment (read-only)">
            <dl className="space-y-2 text-sm">
              {Object.entries(view.data.environment).map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-slate-100 py-1.5 dark:border-slate-800"><dt className="text-slate-500">{k}</dt><dd><Badge variant={k.endsWith("Mode") ? "warning" : "neutral"}>{String(v)}</Badge></dd></div>)}
            </dl>
            <p className="mt-3 text-xs text-slate-500">Set via environment variables (see backend/part6/.env.example). Only <code>demo</code> mode is implemented.</p>
          </Section>

          <Section title="Consent limits" description="Enforced by the consent service on every new request.">
            <div className="space-y-4">
              <Field label="Maximum consent duration (days)"><input type="number" min={1} max={365} disabled={role !== "SYSTEM_ADMIN"} value={maxDays ?? s.maxConsentDurationDays} onChange={(e) => setMaxDays(Number(e.target.value))} className={`${selectClass} w-32`} /></Field>
              <Field label="Default duration (days)"><input type="number" min={1} max={365} disabled={role !== "SYSTEM_ADMIN"} value={defDays ?? s.defaultConsentDurationDays} onChange={(e) => setDefDays(Number(e.target.value))} className={`${selectClass} w-32`} /></Field>
              {role === "SYSTEM_ADMIN" ? <Button loading={busy === "save"} onClick={() => void run("save", () => api.put("/settings", { maxConsentDurationDays: maxDays ?? s.maxConsentDurationDays, defaultConsentDurationDays: defDays ?? s.defaultConsentDurationDays }), "Settings saved and audited.")}>Save</Button> : <p className="text-xs text-slate-500">Read-only for your role.</p>}
            </div>
          </Section>

          {role === "SYSTEM_ADMIN" && (
            <Section title="Demo controls" description="Prototype-only tools to make time-based behaviour demonstrable.">
              <div className="space-y-5">
                <div>
                  <p className="text-sm">Demo clock: <strong>{formatDateTime(view.data.demoClock.now)}</strong> {view.data.demoClock.offsetDays > 0 && <Badge variant="warning">+{view.data.demoClock.offsetDays} days</Badge>}</p>
                  <div className="mt-2 flex items-end gap-2">
                    <Field label="Advance by (days)"><input type="number" min={1} max={400} value={advance} onChange={(e) => setAdvance(Number(e.target.value))} className={`${selectClass} w-28`} /></Field>
                    <Button variant="secondary" loading={busy === "clock"} onClick={() => void run("clock", () => api.post("/demo/clock/advance", { days: advance }), `Demo clock advanced by ${advance} day(s). Consents past expiry are now Expired.`)}>Advance clock</Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Use this to show consent expiry blocking a share. Production has no such control.</p>
                </div>
                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <Button variant="danger" loading={busy === "reset"} onClick={() => void run("reset", () => api.post("/demo/reset", {}), "Demo data reset. The audit trail was preserved.")}>Reset demo data</Button>
                  <p className="mt-2 text-xs text-slate-500">Restores the seeded patients and consents and resets the clock. The audit log is kept.</p>
                </div>
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
