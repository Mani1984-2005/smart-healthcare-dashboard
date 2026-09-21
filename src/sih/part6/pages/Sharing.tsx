import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, LoadingState, PageHeader, Section } from "../../components/ui";
import { CategoryChips, CategoryPicker, ErrorPanel, Field, JsonViewer, StatusBadge } from "../components/common";
import { api, ApiError } from "../api/client";
import type { Catalog, Consent, ShareRecord, ShareResult } from "../api/types";
import { useApi } from "../hooks/useApi";
import { usePatients } from "../hooks/usePatients";
import { usePart6Auth } from "../store/authStore";
import { CATEGORY_LABEL, formatDateTime, selectClass } from "../lib";

function ShareHistory({ shares, loading, error, reload, showPatient }: { shares?: ShareRecord[]; loading: boolean; error?: ApiError; reload: () => void; showPatient?: boolean }) {
  return (
    <Section title="What was shared" description="Every release of data: recipient, purpose, categories and the resources that left.">
      {loading && <LoadingState />}
      {error && <ErrorPanel error={error} onRetry={reload} />}
      {shares && shares.length === 0 && <EmptyState title="Nothing shared yet" description="Shared records will appear here after an authorised exchange." />}
      <ul className="space-y-3">
        {shares?.map((s) => (
          <li key={s.id} className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold"><code>{s.id}</code> → {s.recipientOrgName}</span>
              <span className="text-xs text-slate-500">{formatDateTime(s.sharedAt)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Consent <code>{s.consentId}</code> · by {s.sharedBy.name} · {s.side === "custodian-release" ? "released by custodian" : "pulled by recipient"}{showPatient ? ` · patient ${s.patientId}` : ""}</p>
            <div className="mt-2"><CategoryChips keys={s.categories} /></div>
            <p className="mt-2 text-xs text-slate-500">{s.resourceIds.length} resources: {Object.entries(s.resourceCounts).map(([t, n]) => `${t} ×${n}`).join(", ")}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------- patient ------------------------------------ */
function PatientShare({ catalog }: { catalog: Catalog }) {
  const user = usePart6Auth((s) => s.user)!;
  const consents = useApi(() => api.get<{ consents: Consent[] }>("/consent"), []);
  const shares = useApi(() => api.get<{ shares: ShareRecord[] }>("/share"), []);
  const patient = usePatients();
  const custodian = patient.current?.custodianOrgId;
  const recipients = catalog.recipients.filter((r) => r.id !== custodian);
  const [recipientId, setRecipientId] = useState("");
  const [purpose, setPurpose] = useState("CARE_CONTINUITY");
  const [cats, setCats] = useState<string[]>(["clinical-history", "medications"]);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [granted, setGranted] = useState<Consent | null>(null);
  const recipient = recipientId || recipients[0]?.id || "";

  async function grant() {
    setBusy(true);
    setError(null);
    try {
      setGranted(await api.post<Consent>("/consent", { patientId: user.patientId, recipientOrgId: recipient, purpose, categories: cats, durationDays: days }));
      consents.reload();
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const active = (consents.data?.consents ?? []).filter((c) => c.active);
  return (
    <>
      <Section title="Share health record" description="You decide who receives what, for how long. Only the categories you tick are ever released.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Recipient">
              <select className={selectClass} value={recipient} onChange={(e) => setRecipientId(e.target.value)}>
                {recipients.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Purpose">
              <select className={selectClass} value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                {catalog.purposes.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Duration (days)" hint={`1 to ${catalog.limits.maxDurationDays} days.`}>
              <input type="number" min={1} max={catalog.limits.maxDurationDays} value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${selectClass} w-32`} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Data to share</p>
            <CategoryPicker categories={catalog.categories} selected={cats} onChange={setCats} notShareable={catalog.notShareable} />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <Button loading={busy} disabled={cats.length === 0 || !recipient} onClick={() => void grant()}>Grant Consent</Button>
          {error && <ErrorPanel error={error} />}
          {granted && (
            <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
              <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />CONSENT GRANTED</p>
              <dl className="mt-2 grid gap-1 sm:grid-cols-3">
                <div><dt className="text-xs opacity-70">Consent ID</dt><dd><code>{granted.id}</code></dd></div>
                <div><dt className="text-xs opacity-70">Access</dt><dd>Granted to {granted.recipientOrgName}</dd></div>
                <div><dt className="text-xs opacity-70">Expires</dt><dd>{formatDateTime(granted.expiresAt)}</dd></div>
              </dl>
            </div>
          )}
        </div>
      </Section>

      <Section title="Active consents" description="Revoke any time. Access stops immediately.">
        {consents.loading && <LoadingState />}
        {consents.error && <ErrorPanel error={consents.error} onRetry={consents.reload} />}
        {consents.data && active.length === 0 && <EmptyState title="No active consents" description="Nothing is currently shared." />}
        <ul className="space-y-3">
          {active.map((c) => <ActiveRow key={c.id} c={c} onDone={() => { consents.reload(); shares.reload(); }} />)}
        </ul>
      </Section>
      <ShareHistory shares={shares.data?.shares} loading={shares.loading} error={shares.error} reload={shares.reload} />
    </>
  );
}

function ActiveRow({ c, onDone }: { c: Consent; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/consent/${c.id}/revoke`, {});
      onDone();
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold"><code>{c.id}</code> · {c.recipientOrgName} · {c.purposeLabel}</span>
        <Button variant="danger" className="min-h-8 px-3 py-1 text-xs" loading={busy} onClick={() => void revoke()}>Revoke</Button>
      </div>
      <p className="mt-1 text-xs text-slate-500">Expires {formatDateTime(c.expiresAt)} · {c.daysRemaining} day(s) left</p>
      <div className="mt-2"><CategoryChips keys={c.grantedCategories} /></div>
      {error && <div className="mt-2"><ErrorPanel error={error} /></div>}
    </li>
  );
}

/* ------------------------------- provider ----------------------------------- */
function ProviderAccess({ catalog }: { catalog: Catalog }) {
  const consents = useApi(() => api.get<{ consents: Consent[] }>("/consent"), []);
  const shares = useApi(() => api.get<{ shares: ShareRecord[] }>("/share"), []);
  const [consentId, setConsentId] = useState("");
  const [cats, setCats] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<ShareResult | null>(null);

  const all = consents.data?.consents ?? [];
  const selected = all.find((c) => c.id === consentId) ?? null;
  const effectiveCats = cats ?? selected?.grantedCategories ?? [];

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.post<ShareResult>("/share", { consentId: consentId || undefined, categories: effectiveCats.length ? effectiveCats : undefined }));
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
      consents.reload();
      shares.reload();
    }
  }

  return (
    <>
      <Section title="Access / share records under consent" description="Pick a consent and the categories to exchange. The server re-checks status, expiry, your organisation and the data scope on every call. Try a revoked or expired consent, or tick a category the patient did not grant: it will be blocked and audited.">
        {consents.loading && <LoadingState />}
        {consents.error && <ErrorPanel error={consents.error} onRetry={consents.reload} />}
        {consents.data && all.length === 0 && <EmptyState title="No consents" description="Request consent from the Consent page first." />}
        {consents.data && all.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <Field label="Consent">
                <select className={selectClass} value={consentId} onChange={(e) => { setConsentId(e.target.value); setCats(null); setResult(null); setError(null); }}>
                  <option value="">— none selected (will be blocked) —</option>
                  {all.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.patientDisplay} → {c.recipientOrgName} · {c.status}</option>)}
                </select>
              </Field>
              {selected && (
                <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <div className="flex items-center gap-2"><StatusBadge status={selected.status} />{selected.active ? <Badge variant="success">{selected.daysRemaining}d left</Badge> : <Badge variant="danger">Not active</Badge>}</div>
                  <p className="mt-2 text-xs text-slate-500">Granted scope</p>
                  {selected.grantedCategories.length ? <CategoryChips keys={selected.grantedCategories} /> : <span className="text-xs text-slate-500">Nothing granted.</span>}
                </div>
              )}
              <Button loading={busy} onClick={() => void run()}>Access / share records</Button>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Categories to request</p>
              <CategoryPicker categories={catalog.categories} selected={effectiveCats} onChange={setCats} hint={(k) => selected && !selected.grantedCategories.includes(k) ? <Badge variant="warning" className="mt-1">not consented</Badge> : null} />
            </div>
          </div>
        )}
        <div className="mt-5 space-y-4">
          {error && <ErrorPanel error={error} />}
          {result && (
            <Card title="ACCESS GRANTED" subtitle={`${result.share.id} · ${result.bundle.entry ? (result.bundle.entry as unknown[]).length : 0} entries · bundle validation ${result.validation.status}`}>
              <div className="space-y-3 text-sm">
                <p>Shared: <CategoryChips keys={result.minimisation.categoriesShared} /></p>
                <p className="text-slate-600 dark:text-slate-300">Withheld: {result.minimisation.categoriesWithheld.length ? result.minimisation.categoriesWithheld.map((k) => CATEGORY_LABEL[k] ?? k).join(", ") : "none"} · {result.minimisation.redactions.length} reference(s) to withheld records removed.</p>
                <p className="text-xs text-slate-500">{result.minimisation.note}</p>
                <JsonViewer data={result.bundle} filename={`${String(result.bundle.id)}.fhir.json`} allowDownload maxHeight="18rem" />
              </div>
            </Card>
          )}
        </div>
      </Section>
      <ShareHistory shares={shares.data?.shares} loading={shares.loading} error={shares.error} reload={shares.reload} />
    </>
  );
}

export default function Sharing() {
  const role = usePart6Auth((s) => s.user!.role);
  const catalog = useApi(() => api.get<Catalog>("/catalog"), []);
  const shares = useApi(() => api.get<{ shares: ShareRecord[] }>("/share"), [], role === "SYSTEM_ADMIN");
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Part 6 · Data sharing" title="Data Sharing" description="Patient-controlled, minimum-necessary exchange of health data. Consent is enforced in the server's business logic, not just in this screen." />
      {catalog.loading && <LoadingState />}
      {catalog.error && <ErrorPanel error={catalog.error} onRetry={catalog.reload} />}
      {catalog.data && role === "PATIENT" && <PatientShare catalog={catalog.data} />}
      {catalog.data && (role === "DOCTOR" || role === "HOSPITAL_ADMIN") && <ProviderAccess catalog={catalog.data} />}
      {role === "SYSTEM_ADMIN" && <ShareHistory shares={shares.data?.shares} loading={shares.loading} error={shares.error} reload={shares.reload} showPatient />}
    </div>
  );
}
