import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, LoaderCircle, PlayCircle, XCircle } from "lucide-react";
import { Badge, Button, PageHeader, Section } from "../../components/ui";
import { ApiError, demoLogin, request } from "../api/client";

const P = { docHospital: "USR-DOC-001", docClinic: "USR-DOC-002", patient: "USR-PAT-001", sysAdmin: "USR-SADM-001" } as const;
type Persona = keyof typeof P;
const LABEL: Record<Persona, string> = { docHospital: "Dr. Demo User (Hospital)", docClinic: "Dr. Demo Two (Clinic)", patient: "Demo Patient", sysAdmin: "System Admin" };

interface Reply { status: number; code?: string; message?: string; body?: any }
interface Outcome { ok: boolean; http: number; detail: string }
interface Ctx { tokens: Partial<Record<Persona, string>>; consentId?: string; bundleId?: string }

async function call(ctx: Ctx, who: Persona, method: string, path: string, body?: unknown): Promise<Reply> {
  if (!ctx.tokens[who]) ctx.tokens[who] = (await demoLogin(P[who])).token;
  try {
    return { status: 200, body: await request<any>(method, path, body, ctx.tokens[who]) };
  } catch (e) {
    const err = e as ApiError;
    return { status: err.status, code: err.code, message: err.message };
  }
}

interface Step { title: string; who: Persona; note: string; run: (c: Ctx) => Promise<Outcome> }

const expectBlocked = (r: Reply, code: string, extra?: string): Outcome => ({ ok: r.status >= 400 && r.code === code, http: r.status, detail: r.status >= 400 ? `Blocked as expected: ${r.code}. “${r.message}”${extra ? ` ${extra}` : ""}` : "NOT BLOCKED: the server allowed this request." });
const expectOk = (r: Reply, detail: (b: any) => string, check: (b: any) => boolean = () => true): Outcome => (r.status === 200 || r.status === 201) && check(r.body) ? { ok: true, http: r.status, detail: detail(r.body) } : { ok: false, http: r.status, detail: r.message ?? "Unexpected response." };

const STEPS: Step[] = [
  { title: "Open Part 6 and select the demo patient", who: "docHospital", note: "GET /patients", run: async (c) => { const r = await call(c, "docHospital", "GET", "/patients"); return expectOk(r, (b) => `Demo Patient (MCP-DEMO-001) is held by ${b.patients.find((p: any) => p.id === "MCP-DEMO-001").custodianOrgName}.`, (b) => b.patients.some((p: any) => p.id === "MCP-DEMO-001" && p.relation === "custodian")); } },
  { title: "View patient identity (internal ID vs ABHA demo)", who: "docHospital", note: "GET /patients/MCP-DEMO-001/identity", run: async (c) => { const r = await call(c, "docHospital", "GET", "/patients/MCP-DEMO-001/identity"); return expectOk(r, (b) => `Internal ${b.internal.patientId} ≠ ABHA ${b.abha.identifier} · ${b.abha.statusLabel} · verification ${b.abha.verification} (not performed).`, (b) => b.abha.status === "DEMO_NOT_CONNECTED"); } },
  { title: "Generate the FHIR Patient resource", who: "docHospital", note: "POST /fhir/generate {Patient}", run: async (c) => { const r = await call(c, "docHospital", "POST", "/fhir/generate", { patientId: "MCP-DEMO-001", resourceTypes: ["Patient"] }); return expectOk(r, (b) => `${b.label}: ${b.resources[0].resource.resourceType}/${b.resources[0].resource.id} · ${b.resources[0].validation.status}`); } },
  { title: "Add Encounter, Observation, Condition, DiagnosticReport", who: "docHospital", note: "POST /fhir/generate", run: async (c) => { const r = await call(c, "docHospital", "POST", "/fhir/generate", { patientId: "MCP-DEMO-001", resourceTypes: ["Encounter", "Observation", "Condition", "DiagnosticReport"] }); return expectOk(r, (b) => `${b.count} resources generated (incl. supporting Practitioner/Organization).`); } },
  { title: "Generate the FHIR Bundle", who: "docHospital", note: "POST /fhir/bundle", run: async (c) => { const r = await call(c, "docHospital", "POST", "/fhir/bundle", { patientId: "MCP-DEMO-001" }); if (r.body) c.bundleId = r.body.summary.id; return expectOk(r, (b) => `${b.summary.id}: type ${b.summary.type}, ${b.summary.entryCount} entries.`); } },
  { title: "Validate the Bundle", who: "docHospital", note: "POST /fhir/validate", run: async (c) => { const r = await call(c, "docHospital", "POST", "/fhir/validate", { bundleId: c.bundleId }); return expectOk(r, (b) => `STATUS: ${b.status} · ${b.bundle.referencesChecked} references checked · ${b.errorCount} errors.`, (b) => b.status === "VALID"); } },
  { title: "Create a consent request (clinic asks for records)", who: "docClinic", note: "POST /consent", run: async (c) => { const r = await call(c, "docClinic", "POST", "/consent", { patientId: "MCP-DEMO-001", purpose: "CARE_CONTINUITY", categories: ["clinical-history", "lab-reports", "medications"], durationDays: 30 }); if (r.body) c.consentId = r.body.id; return expectOk(r, (b) => `${b.id} created · status ${b.status}.`, (b) => b.status === "Pending"); } },
  { title: "Try to share BEFORE consent exists", who: "docClinic", note: "POST /share → must be blocked", run: async (c) => expectBlocked(await call(c, "docClinic", "POST", "/share", { consentId: c.consentId }), "CONSENT_PENDING") },
  { title: "Patient grants consent, dropping Lab Reports (data minimisation)", who: "patient", note: "POST /consent/:id/grant", run: async (c) => { const r = await call(c, "patient", "POST", `/consent/${c.consentId}/grant`, { categories: ["clinical-history", "medications"] }); return expectOk(r, (b) => `${b.id} ${b.status} · shared scope: ${b.grantedCategories.join(", ")} · expires ${new Date(b.expiresAt).toLocaleDateString()}.`, (b) => b.status === "Granted"); } },
  { title: "Controlled data share (clinic pulls under consent)", who: "docClinic", note: "POST /share", run: async (c) => { const r = await call(c, "docClinic", "POST", "/share", { consentId: c.consentId }); return expectOk(r, (b) => `${b.share.id}: ${b.share.resourceIds.length} resources released; withheld: ${b.minimisation.categoriesWithheld.join(", ")}; ${b.minimisation.redactions.length} references removed.`, (b) => !JSON.stringify(b.bundle).includes("HbA1c")); } },
  { title: "Audit entry created for the share", who: "patient", note: "GET /audit (patient's own view)", run: async (c) => { const r = await call(c, "patient", "GET", "/audit?category=exchange"); return expectOk(r, (b) => `Found “${b.entries[0].label}” for ${c.consentId}.`, (b) => b.entries.some((e: any) => e.action === "RECORD_SHARED" && e.consentId === c.consentId)); } },
  { title: "Patient revokes consent", who: "patient", note: "POST /consent/:id/revoke", run: async (c) => { const r = await call(c, "patient", "POST", `/consent/${c.consentId}/revoke`, {}); return expectOk(r, (b) => `${b.id} ${b.status} at ${new Date(b.revokedAt).toLocaleTimeString()}.`, (b) => b.status === "Revoked"); } },
  { title: "Attempt another share → ACCESS BLOCKED", who: "docClinic", note: "POST /share → must be blocked", run: async (c) => expectBlocked(await call(c, "docClinic", "POST", "/share", { consentId: c.consentId }), "CONSENT_REVOKED") },
  { title: "Unauthorized action: patient tries to generate FHIR", who: "patient", note: "POST /fhir/generate → must be forbidden", run: async (c) => expectBlocked(await call(c, "patient", "POST", "/fhir/generate", { patientId: "MCP-DEMO-001" }), "FORBIDDEN") },
  { title: "Open Audit Logs: verify the whole sequence and its hash chain", who: "sysAdmin", note: "GET /audit, GET /audit/verify", run: async (c) => { const a = await call(c, "sysAdmin", "GET", "/audit?limit=500"); const v = await call(c, "sysAdmin", "GET", "/audit/verify"); const entries: any[] = a.body?.entries ?? []; const mine = entries.filter((e) => e.consentId === c.consentId).map((e) => e.action).reverse(); return { ok: v.body?.ok === true && mine.includes("CONSENT_REVOKED") && mine.includes("RECORD_SHARED"), http: v.status, detail: `${c.consentId}: ${mine.join(" → ")} · chain ${v.body?.ok ? "intact" : "BROKEN"} (${v.body?.total} entries).` }; } },
];

export default function GuidedDemo() {
  const ctx = useRef<Ctx>({ tokens: {} });
  const [results, setResults] = useState<(Outcome | null)[]>(() => STEPS.map(() => null));
  const [running, setRunning] = useState<number | null>(null);
  const [resetFirst, setResetFirst] = useState(false);

  const next = results.findIndex((r) => r === null);
  const passed = results.filter((r) => r?.ok).length;
  const done = next === -1;

  async function runStep(i: number) {
    setRunning(i);
    let outcome: Outcome;
    try {
      outcome = await STEPS[i].run(ctx.current);
    } catch (e) {
      outcome = { ok: false, http: 0, detail: (e as Error).message };
    }
    setResults((prev) => prev.map((r, idx) => (idx === i ? outcome : r)));
    setRunning(null);
    return outcome;
  }

  async function runAll() {
    if (resetFirst) await call(ctx.current, "sysAdmin", "POST", "/demo/reset", {});
    for (let i = Math.max(next, 0); i < STEPS.length; i++) {
      const o = await runStep(i);
      if (!o.ok) break;
    }
  }

  function restart() {
    ctx.current = { tokens: {} };
    setResults(STEPS.map(() => null));
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Part 6 · Demonstration" title="Guided Demo" description="Runs the complete story with real API calls under four different personas: FHIR → validation → consent → controlled sharing → revocation → blocked access → audit. Every result is the server's actual response." actions={<>{done && <Button variant="secondary" onClick={restart}>Restart</Button>}<Button loading={running !== null} disabled={done} onClick={() => void runAll()}><PlayCircle className="h-4 w-4" aria-hidden="true" />{next <= 0 ? "Run full scenario" : "Continue"}</Button></>} />
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" className="h-4 w-4 accent-cyan-700" checked={resetFirst} onChange={(e) => setResetFirst(e.target.checked)} />Reset demo data first (System Admin; audit trail is preserved)</label>

      {results.some(Boolean) && (
        <div role="status" className={`rounded-lg border px-4 py-3 text-sm font-semibold ${done && passed === STEPS.length ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"}`}>
          {passed} of {STEPS.length} steps behaved as expected{done && passed === STEPS.length ? " — Interoperability + Consent + Security + Auditability demonstrated." : "."}{" "}
          {done && <Link to="/part6/audit" className="underline">Open Audit Logs</Link>}
        </div>
      )}

      <Section>
        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const r = results[i];
            return (
              <li key={s.title} className="flex gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div className="mt-0.5 shrink-0">
                  {running === i ? <LoaderCircle className="h-5 w-5 animate-spin text-cyan-700" aria-label="running" /> : r ? (r.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="passed" /> : <XCircle className="h-5 w-5 text-rose-600" aria-label="failed" />) : <Circle className="h-5 w-5 text-slate-300" aria-label="pending" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{i + 1}. {s.title}</p>
                    <Badge variant="neutral">{LABEL[s.who]}</Badge>
                    {r && <Badge variant={r.http >= 400 ? "warning" : "success"}>HTTP {r.http}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500"><code>{s.note}</code></p>
                  {r && <p className={`mt-2 text-sm ${r.ok ? "text-slate-700 dark:text-slate-200" : "font-medium text-rose-700 dark:text-rose-300"}`}>{r.detail}</p>}
                </div>
                {!r && running === null && i === next && <Button variant="secondary" className="self-start" onClick={() => void runStep(i)}>Run step</Button>}
              </li>
            );
          })}
        </ol>
      </Section>
    </div>
  );
}
