import { useState } from "react";
import { Badge, Button, Dialog } from "../../components/ui";
import { CategoryChips, ErrorPanel, JsonViewer, Field } from "./common";
import { api, ApiError } from "../api/client";
import type { Consent, ShareResult } from "../api/types";
import { selectClass, CATEGORY_LABEL } from "../lib";

/**
 * Consent-gated export. The Export button is NEVER disabled based on consent: the request always goes to the
 * server, which decides. Picking no consent demonstrates the server-side "EXPORT BLOCKED" response.
 */
export default function ExportDialog({ open, onClose, consents, onDone }: { open: boolean; onClose: () => void; consents: Consent[]; onDone?: () => void }) {
  const [consentId, setConsentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<ShareResult | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.post<ShareResult>("/share", consentId ? { consentId } : {}));
      onDone?.();
    } catch (e) {
      setError(e as ApiError);
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setError(null);
    setResult(null);
    onClose();
  }

  const chosen = consents.find((c) => c.id === consentId);
  return (
    <Dialog open={open} onClose={close} title="Export FHIR JSON (consent required)" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={close}>Close</Button><Button loading={busy} onClick={() => void run()}>Export</Button></div>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">Before any data leaves your organisation the server checks: consent status, expiry, that your organisation is a party to it, and that the data scope is within what the patient granted.</p>
        <Field label="Consent to export under">
          <select className={selectClass} value={consentId} onChange={(e) => setConsentId(e.target.value)}>
            <option value="">— none selected (will be blocked) —</option>
            {consents.map((c) => (
              <option key={c.id} value={c.id}>{c.id} · {c.recipientOrgName} · {c.status}{c.active ? ` (${c.daysRemaining}d left)` : ""}</option>
            ))}
          </select>
        </Field>
        {chosen && (
          <div className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
            <p className="mb-1 font-semibold">Granted scope</p>
            {chosen.grantedCategories.length ? <CategoryChips keys={chosen.grantedCategories} /> : <span className="text-slate-500">Nothing granted yet.</span>}
          </div>
        )}
        {error && <ErrorPanel error={error} />}
        {result && (
          <div className="space-y-3">
            <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">EXPORT ALLOWED · {result.share.id} · {result.bundle.entry ? (result.bundle.entry as unknown[]).length : 0} entries · validation {result.validation.status}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Shared: {result.minimisation.categoriesShared.map((k) => CATEGORY_LABEL[k] ?? k).join(", ")}. Withheld: {result.minimisation.categoriesWithheld.length ? result.minimisation.categoriesWithheld.map((k) => CATEGORY_LABEL[k] ?? k).join(", ") : "none"}. <Badge variant="neutral">{result.minimisation.redactions.length} reference(s) removed</Badge></p>
            <JsonViewer data={result.bundle} filename={`${String(result.bundle.id)}.fhir.json`} allowDownload maxHeight="14rem" />
          </div>
        )}
      </div>
    </Dialog>
  );
}
