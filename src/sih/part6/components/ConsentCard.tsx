import { ReactNode, useState } from "react";
import { Badge, Button, Dialog } from "../../components/ui";
import { CategoryChips, CategoryPicker, ErrorPanel, Field, StatusBadge } from "./common";
import { api, ApiError } from "../api/client";
import type { Catalog, Consent, Role } from "../api/types";
import { formatDateTime } from "../lib";

const Item = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className="mt-0.5 text-sm text-slate-900 dark:text-slate-100">{children}</dd>
  </div>
);

export default function ConsentCard({ consent: c, role, catalog, onChanged }: { consent: Consent; role: Role; catalog: Catalog; onChanged: () => void }) {
  const [review, setReview] = useState(false);
  const [cats, setCats] = useState<string[]>(c.requestedCategories);
  const [days, setDays] = useState<number>(c.requestedDurationDays);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  async function act(kind: "grant" | "deny" | "revoke", body: unknown) {
    setBusy(kind);
    setError(null);
    try {
      await api.post(`/consent/${c.id}/${kind}`, body);
      setRevokeOpen(false);
      setReview(false);
      onChanged();
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(null);
    }
  }

  const isPatient = role === "PATIENT";
  const canRevoke = c.active && (isPatient || role === "HOSPITAL_ADMIN" || role === "SYSTEM_ADMIN");
  const cleanDays = Number.isInteger(days) && days >= 1 && days <= c.requestedDurationDays;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <code className="text-sm font-bold">{c.id}</code>
          <StatusBadge status={c.status} />
          {c.active && <Badge variant="success">Active · {c.daysRemaining}d left</Badge>}
          {c.origin === "patient-initiated" && <Badge variant="info">Patient-initiated</Badge>}
        </div>
        <button type="button" className="text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300" onClick={() => setShowHistory((v) => !v)}>{showHistory ? "Hide" : "Show"} history</button>
      </header>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Item label="Patient">{c.patientDisplay} <code className="text-xs text-slate-500">{c.patientId}</code></Item>
        <Item label="Requested by">{c.requester.orgName}<span className="block text-xs text-slate-500">{c.requester.userName}</span></Item>
        <Item label="Recipient">{c.recipientOrgName}</Item>
        <Item label="Purpose">{c.purposeLabel}</Item>
        <Item label="Duration">{c.durationDays ?? c.requestedDurationDays} days{c.durationDays === null && " (requested)"}</Item>
        <Item label="Created">{formatDateTime(c.createdAt)}</Item>
        {c.expiresAt && <Item label="Expires">{formatDateTime(c.expiresAt)}</Item>}
        {c.revokedAt && <Item label="Revoked">{formatDateTime(c.revokedAt)} by {c.revokedBy}{c.revocationReason ? ` — ${c.revocationReason}` : ""}</Item>}
        {c.note && <Item label="Note">{c.note}</Item>}
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div><p className="mb-1.5 text-xs text-slate-500">Data requested</p><CategoryChips keys={c.requestedCategories} /></div>
        {c.status !== "Pending" && c.status !== "Denied" && (
          <div><p className="mb-1.5 text-xs text-slate-500">Data shared under this consent</p>{c.grantedCategories.length ? <CategoryChips keys={c.grantedCategories} /> : <span className="text-xs text-slate-500">None</span>}</div>
        )}
      </div>

      {showHistory && (
        <ol className="mt-4 space-y-1.5 border-l-2 border-slate-200 pl-4 text-xs dark:border-slate-700">
          {c.history.map((h, i) => (
            <li key={`${h.at}-${i}`}><strong>{h.status}</strong> · {formatDateTime(h.at)} · {h.by}</li>
          ))}
        </ol>
      )}

      {error && <div className="mt-4"><ErrorPanel error={error} /></div>}

      {isPatient && c.status === "Pending" && !review && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setReview(true)}>Review request</Button>
          <Button variant="secondary" loading={busy === "deny"} onClick={() => void act("deny", {})}>Deny</Button>
        </div>
      )}

      {isPatient && c.status === "Pending" && review && (
        <div className="mt-4 space-y-4 rounded-lg border border-cyan-200 bg-cyan-50/40 p-4 dark:border-cyan-900 dark:bg-cyan-950/20">
          <p className="text-sm font-semibold">Share only what is necessary</p>
          <CategoryPicker categories={catalog.categories.filter((k) => c.requestedCategories.includes(k.key))} selected={cats} onChange={setCats} />
          <Field label="Duration (days)" hint={`You can shorten but not extend beyond the requested ${c.requestedDurationDays} days.`}>
            <input type="number" min={1} max={c.requestedDurationDays} value={days} onChange={(e) => setDays(Number(e.target.value))} className="block min-h-10 w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={cats.length === 0 || !cleanDays} loading={busy === "grant"} onClick={() => void act("grant", { categories: cats, durationDays: days })}>Grant Consent</Button>
            <Button variant="secondary" loading={busy === "deny"} onClick={() => void act("deny", {})}>Deny</Button>
            <Button variant="ghost" onClick={() => setReview(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {canRevoke && (
        <div className="mt-4"><Button variant="danger" onClick={() => setRevokeOpen(true)}>Revoke consent</Button></div>
      )}

      <Dialog open={revokeOpen} onClose={() => setRevokeOpen(false)} title={`Revoke ${c.id}`} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setRevokeOpen(false)}>Cancel</Button><Button variant="danger" loading={busy === "revoke"} onClick={() => void act("revoke", { reason })}>Revoke</Button></div>}>
        <p className="mb-4 text-sm">Revoking takes effect immediately: {c.recipientOrgName} will be blocked from any further access, and the revocation is recorded in the audit log.</p>
        <Field label={isPatient ? "Reason (optional)" : "Reason (required for administrative revocation)"}>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={280} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </Field>
        {error && <div className="mt-3"><ErrorPanel error={error} /></div>}
      </Dialog>
    </article>
  );
}
