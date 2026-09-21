import { ReactNode, useState } from "react";
import { AlertTriangle, Ban, Check, CheckCircle2, Copy, Download, FlaskConical, Lock, MinusCircle, ShieldAlert, XCircle } from "lucide-react";
import { Badge, Button } from "../../components/ui";
import type { ApiError } from "../api/client";
import type { ConsentStatus, ValidationResult } from "../api/types";
import { CATEGORY_LABEL, consentVariant, describeError, detailList, downloadJson } from "../lib";

export function DemoBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        <strong>DEMO / MOCK / PROTOTYPE.</strong>{" "}
        {compact
          ? "ABDM-ready prototype: not connected to live ABDM. Synthetic data only."
          : "ABDM-ready prototype: this is not connected to live ABDM, performs no ABHA verification and is not FHIR-certified. All patients, identifiers and records are synthetic."}
      </p>
    </div>
  );
}

export function StatusBadge({ status }: { status: ConsentStatus }) {
  return <Badge variant={consentVariant(status)}>{status}</Badge>;
}

export function OutcomeBadge({ status }: { status: "success" | "denied" | "failure" }) {
  return <Badge variant={status === "success" ? "success" : status === "denied" ? "warning" : "danger"}>{status === "success" ? "Success" : status === "denied" ? "Denied" : "Failed"}</Badge>;
}

/** Consistent presentation for every error state (Unauthorized, Forbidden, Consent Required, Expired ...). */
export function ErrorPanel({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const info = describeError(error);
  const details = detailList(error);
  const tone = { danger: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100", warning: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100", info: "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" }[info.tone];
  const Icon = error.status === 401 ? Lock : error.status === 403 ? Ban : info.tone === "danger" ? ShieldAlert : AlertTriangle;
  return (
    <div role="alert" className={`rounded-xl border p-5 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-wide">{info.heading}</p>
          <p className="mt-1 text-sm">{info.message}</p>
          {details.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          {error.requestId && <p className="mt-2 text-xs opacity-70">Reference: {error.requestId}</p>}
          {onRetry && (
            <Button variant="secondary" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function JsonViewer({ data, filename, label = "FHIR DEMO RESOURCE", allowDownload = false, maxHeight = "28rem" }: { data: unknown; filename?: string; label?: string; allowDownload?: boolean; maxHeight?: string }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <Badge variant="warning">{label}</Badge>
        <div className="flex gap-2">
          <Button variant="secondary" className="min-h-8 px-3 py-1 text-xs" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? "Copied" : "Copy JSON"}
          </Button>
          {allowDownload && filename && (
            <Button variant="secondary" className="min-h-8 px-3 py-1 text-xs" onClick={() => downloadJson(filename, data)}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download
            </Button>
          )}
        </div>
      </div>
      <pre tabIndex={0} style={{ maxHeight }} className="overflow-auto bg-white p-4 text-xs leading-relaxed text-slate-800 dark:bg-slate-950 dark:text-slate-200">
        {text}
      </pre>
    </div>
  );
}

export function ValidationPanel({ result }: { result: ValidationResult }) {
  const valid = result.status === "VALID";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h3 className="text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100">FHIR VALIDATION</h3>
        <span className="text-xs text-slate-500">
          {result.resourceType ?? "Unknown"}
          {result.resourceId ? ` / ${result.resourceId}` : ""}
        </span>
      </div>
      <ul className="space-y-2 px-4 py-3 text-sm">
        {result.checks.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            {c.status === "passed" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : c.status === "failed" ? <XCircle className="h-4 w-4 text-rose-600" aria-hidden="true" /> : <MinusCircle className="h-4 w-4 text-slate-400" aria-hidden="true" />}
            <span className={c.status === "failed" ? "font-medium text-rose-700 dark:text-rose-300" : "text-slate-700 dark:text-slate-200"}>{c.label}</span>
            {c.status === "skipped" && <span className="text-xs text-slate-400">(skipped)</span>}
          </li>
        ))}
      </ul>
      <div className={`flex items-center justify-between border-t px-4 py-3 text-sm font-bold ${valid ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"}`}>
        <span>STATUS: {result.status}</span>
        {result.warningCount > 0 && <span className="text-xs font-medium">{result.warningCount} warning(s)</span>}
      </div>
      {result.issues.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Issues:</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {result.issues.slice(0, 40).map((i, idx) => (
              <li key={`${i.path}-${idx}`} className="flex gap-2">
                <span className={i.severity === "error" ? "text-rose-600" : "text-amber-600"}>•</span>
                <span className="text-slate-700 dark:text-slate-200">
                  {i.message} <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">{i.path}</code>
                </span>
              </li>
            ))}
            {result.issues.length > 40 && <li className="text-xs text-slate-500">…and {result.issues.length - 40} more.</li>}
          </ul>
        </div>
      )}
      <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">{result.disclaimer}</p>
    </div>
  );
}

export function CategoryPicker({ categories, selected, onChange, disabled = false, hint, lockedKeys = [], notShareable = [] }: { categories: { key: string; label: string; description: string }[]; selected: string[]; onChange: (next: string[]) => void; disabled?: boolean; hint?: (key: string) => ReactNode; lockedKeys?: string[]; notShareable?: { key: string; label: string; reason: string }[] }) {
  const toggle = (k: string) => onChange(selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]);
  return (
    <fieldset disabled={disabled} className="space-y-2">
      {categories.map((c) => {
        const locked = lockedKeys.includes(c.key);
        return (
          <label key={c.key} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${selected.includes(c.key) ? "border-cyan-500 bg-cyan-50/60 dark:border-cyan-700 dark:bg-cyan-950/30" : "border-slate-200 dark:border-slate-800"} ${locked ? "opacity-60" : "cursor-pointer"}`}>
            <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-700" checked={selected.includes(c.key)} disabled={locked} onChange={() => toggle(c.key)} />
            <span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{c.label}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{c.description}</span>
              {hint?.(c.key)}
            </span>
          </label>
        );
      })}
      {notShareable.map((n) => (
        <div key={n.key} className="flex items-start gap-3 rounded-lg border border-dashed border-slate-300 p-3 text-sm opacity-70 dark:border-slate-700">
          <Lock className="mt-0.5 h-4 w-4 text-slate-500" aria-hidden="true" />
          <span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{n.label}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{n.reason}</span>
          </span>
        </div>
      ))}
    </fieldset>
  );
}

export const CategoryChips = ({ keys }: { keys: string[] }) => (
  <span className="flex flex-wrap gap-1.5">
    {keys.map((k) => (
      <Badge key={k} variant="neutral">
        {CATEGORY_LABEL[k] ?? k}
      </Badge>
    ))}
  </span>
);

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}
