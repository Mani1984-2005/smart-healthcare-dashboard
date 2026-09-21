import { FormEvent, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/ui/LoadingState";
import Section from "../../components/ui/Section";
import { useAsyncData } from "../hooks/useAsyncData";
import { usePart3Client } from "../services/clientContext";
import { ACCEPTED_UPLOAD_TYPES, DOC_TYPE_LABEL, MAX_UPLOAD_BYTES, docTypeLabel, formatBytes } from "../services/format";
import { SyntheticBadge } from "./badges";
import ErrorNotice from "./ErrorNotice";
import type { DocType, Patient } from "../types/part3";

export default function DocumentPicker({ patientId, patients, onOpened }: { patientId: string; patients: Patient[]; onOpened: (documentId: string) => void }) {
  const client = usePart3Client();
  const fixtures = useAsyncData("fixtures", () => client.listFixtures());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [docType, setDocType] = useState<DocType>("prescription");
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const patientName = (id: string) => patients.find((p) => p.id === id)?.displayName ?? id;

  async function openFixture(id: string) {
    setBusy(id); setError(null);
    try { onOpened((await client.ingestFixture(id)).document.id); } catch (e) { setError(e); } finally { setBusy(null); }
  }
  async function download(id: string) {
    setError(null);
    try {
      const blob = await client.downloadFixture(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${id}.png`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e); }
  }
  async function upload(ev: FormEvent) {
    ev.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setFileError("Choose a file to upload.");
    if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) return setFileError("Only PNG, JPEG or PDF files can be uploaded.");
    if (file.size === 0) return setFileError("This file is empty.");
    if (file.size > MAX_UPLOAD_BYTES) return setFileError(`This file is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`);
    setFileError(null); setBusy("upload"); setError(null);
    try { onOpened((await client.uploadDocument({ file, patientId, docType })).document.id); } catch (e) { setError(e); } finally { setBusy(null); }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Section title="Synthetic demo documents" description="Made for software demonstration. They are not real patient records.">
        {fixtures.error ? <ErrorNotice error={fixtures.error} onRetry={fixtures.reload} /> : !fixtures.data ? <LoadingState label="Loading demo documents…" /> : (
          <ul className="space-y-3">
            {fixtures.data.items.map((f) => (
              <li key={f.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{f.title}</p><SyntheticBadge /></div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{docTypeLabel(f.docType)} · for {patientName(f.patientId)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{f.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button loading={busy === f.id} disabled={busy !== null} onClick={() => openFixture(f.id)}>{f.ingestedDocumentId ? "Open" : "Use this document"}</Button>
                  <Button variant="ghost" disabled={busy !== null} onClick={() => download(f.id)}><Download className="h-4 w-4" aria-hidden="true" />Download sample</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Upload a scan" description={`For ${patientName(patientId)}. PNG, JPEG or PDF, up to ${formatBytes(MAX_UPLOAD_BYTES)}.`}>
        <form onSubmit={upload} className="space-y-4" noValidate>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Document type
            <select value={docType} onChange={(e) => setDocType(e.target.value as DocType)} className="mt-2 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
              {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => <option key={t} value={t}>{DOC_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">File
            <input ref={fileRef} type="file" accept={ACCEPTED_UPLOAD_TYPES.join(",")} aria-describedby="upload-hint" aria-invalid={Boolean(fileError)} className="mt-2 block w-full text-sm file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:font-semibold dark:file:bg-slate-800" />
          </label>
          {fileError && <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-300">{fileError}</p>}
          <p id="upload-hint" className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            Prototype limit: the built-in demo OCR can only read the synthetic demo documents (use “Download sample” to try an upload). Other files upload fine, but OCR will say it cannot read them until a real OCR provider is connected. Do not upload real patient records.
          </p>
          <Button type="submit" loading={busy === "upload"} disabled={busy !== null}><Upload className="h-4 w-4" aria-hidden="true" />Upload and open</Button>
        </form>
      </Section>

      {error !== null && <div className="lg:col-span-2"><ErrorNotice error={error} title="That did not work" /></div>}
    </div>
  );
}
