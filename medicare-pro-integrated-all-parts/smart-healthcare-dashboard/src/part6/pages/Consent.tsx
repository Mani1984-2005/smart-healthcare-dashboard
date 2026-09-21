import { useState } from "react";
import { Button, EmptyState, LoadingState, PageHeader, Section } from "../../components/ui";
import ConsentCard from "../components/ConsentCard";
import { CategoryPicker, ErrorPanel, Field } from "../components/common";
import { api, ApiError } from "../api/client";
import type { Catalog, Consent as ConsentT, ConsentStatus } from "../api/types";
import { useApi } from "../hooks/useApi";
import { usePatients } from "../hooks/usePatients";
import { usePart6Auth } from "../store/authStore";
import { selectClass } from "../lib";

const FILTERS: (ConsentStatus | "All")[] = ["All", "Pending", "Granted", "Denied", "Revoked", "Expired"];

function RequestForm({ catalog, onCreated }: { catalog: Catalog; onCreated: () => void }) {
  const patients = usePatients(["directory"]);
  const [purpose, setPurpose] = useState("CARE_CONTINUITY");
  const [cats, setCats] = useState<string[]>(["clinical-history", "medications"]);
  const [days, setDays] = useState(catalog.limits.defaultDurationDays);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit() {
    if (!patients.current) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const c = await api.post<ConsentT>("/consent", { patientId: patients.current.id, purpose, categories: cats, durationDays: days, note: note || undefined });
      setOk(`Consent request ${c.id} sent to the patient. Status: ${c.status}.`);
      onCreated();
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Request patient records" description="You can request records for patients held by another organisation. Nothing is shared until the patient grants consent.">
      {patients.loading && <LoadingState label="Loading patient directory…" />}
      {!patients.loading && patients.rows.length === 0 && <EmptyState title="No requestable patients" description="Every demo patient is already held by your organisation." />}
      {patients.current && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Patient (directory: minimal fields)">
              <select className={selectClass} value={patients.current.id} onChange={(e) => patients.select(e.target.value)}>
                {patients.rows.map((p) => <option key={p.id} value={p.id}>{p.displayName} · {p.id} · held by {p.custodianOrgName}</option>)}
              </select>
            </Field>
            <Field label="Purpose">
              <select className={selectClass} value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                {catalog.purposes.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Duration (days)" hint={`Maximum ${catalog.limits.maxDurationDays} days (set by the System Admin).`}>
              <input type="number" min={1} max={catalog.limits.maxDurationDays} value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${selectClass} w-32`} />
            </Field>
            <Field label="Note to patient (optional)">
              <input value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} className={selectClass} />
            </Field>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Data requested (minimum necessary)</p>
            <CategoryPicker categories={catalog.categories} selected={cats} onChange={setCats} notShareable={catalog.notShareable} />
          </div>
          <div className="lg:col-span-2 space-y-3">
            <Button loading={busy} disabled={cats.length === 0} onClick={() => void submit()}>Send consent request</Button>
            {ok && <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{ok}</p>}
            {error && <ErrorPanel error={error} />}
          </div>
        </div>
      )}
    </Section>
  );
}

export default function Consent() {
  const role = usePart6Auth((s) => s.user!.role);
  const [filter, setFilter] = useState<ConsentStatus | "All">("All");
  const catalog = useApi(() => api.get<Catalog>("/catalog"), []);
  const list = useApi(() => api.get<{ consents: ConsentT[] }>("/consent"), []);
  const rows = (list.data?.consents ?? []).filter((c) => filter === "All" || c.status === filter);
  const counts = (s: string) => (list.data?.consents ?? []).filter((c) => c.status === s).length;
  const canRequest = role === "DOCTOR" || role === "HOSPITAL_ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Part 6 · Consent" title="Consent Management" description="Request → Review → Grant / Deny → Active → Revoke / Expire. Every transition is enforced and recorded on the server." />
      {catalog.error && <ErrorPanel error={catalog.error} onRetry={catalog.reload} />}
      {canRequest && catalog.data && <RequestForm catalog={catalog.data} onCreated={list.reload} />}

      <Section title={role === "PATIENT" ? "Your consents" : "Consents visible to you"} description={role === "PATIENT" ? "Pending requests are waiting for your decision." : role === "SYSTEM_ADMIN" ? "Metadata view: patient names are masked." : "Consents involving your organisation."}>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === f ? "border-cyan-600 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200" : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>
              {f}{f !== "All" ? ` (${counts(f)})` : ` (${list.data?.consents.length ?? 0})`}
            </button>
          ))}
        </div>
        {list.loading && <LoadingState label="Loading consents…" />}
        {list.error && <ErrorPanel error={list.error} onRetry={list.reload} />}
        {list.data && rows.length === 0 && <EmptyState title="No consents" description={filter === "All" ? "There are no consents to show yet." : `No ${filter.toLowerCase()} consents.`} />}
        <div className="space-y-4">
          {catalog.data && rows.map((c) => <ConsentCard key={c.id} consent={c} role={role} catalog={catalog.data!} onChanged={list.reload} />)}
        </div>
      </Section>
    </div>
  );
}
