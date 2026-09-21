import { useState } from "react";
import { Badge, Button, Card, EmptyState, LoadingState, PageHeader, Section } from "../../components/ui";
import { ErrorPanel, JsonViewer, ValidationPanel } from "../components/common";
import PatientSelect from "../components/PatientSelect";
import { api, ApiError } from "../api/client";
import type { FhirJson, ResourceSummary, ValidationResult } from "../api/types";
import { useApi } from "../hooks/useApi";
import { usePatients } from "../hooks/usePatients";
import { CATEGORY_LABEL, formatDateTime } from "../lib";

const TYPES = ["Patient", "Encounter", "Condition", "Observation", "MedicationRequest", "DiagnosticReport", "AllergyIntolerance", "DocumentReference"];

export default function Resources() {
  const patients = usePatients(["custodian"]);
  const current = patients.current;
  const [types, setTypes] = useState<string[]>(TYPES);
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const list = useApi(() => api.get<{ resources: ResourceSummary[] }>(`/fhir/resources?patientId=${current?.id}`), [current?.id], Boolean(current));
  const detail = useApi(() => { const [t, id] = openKey!.split("/"); return api.get<{ resource: FhirJson; validation: ValidationResult; meta: { generatedAt: string; generatedBy: string } }>(`/fhir/resources/${t}/${id}`); }, [openKey], Boolean(openKey));

  async function generate() {
    if (!current) return;
    setBusy(true);
    setGenError(null);
    setNotice(null);
    try {
      const r = await api.post<{ count: number }>("/fhir/generate", { patientId: current.id, resourceTypes: types });
      setNotice(`Generated ${r.count} FHIR resource(s) from the demo record.`);
      list.reload();
    } catch (e) {
      setGenError(e as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const forbidden = patients.error;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Part 6 · FHIR" title="FHIR Resources" description="Convert a demo patient record into FHIR R4 resources, inspect the JSON and validate its structure. This is an in-house preview for the data custodian; releasing data to others requires consent (see Data Sharing)." />
      {patients.loading && <LoadingState />}
      {forbidden && <ErrorPanel error={forbidden} onRetry={patients.reload} />}
      {!patients.loading && !forbidden && !current && <EmptyState title="No records held by your organisation" description="Your role or organisation is not the custodian of any demo patient, so there is nothing to convert." />}
      {current && (
        <>
          <Section title="Resource generator" description="Patient → FHIR Resource Generator → FHIR resources">
            <div className="space-y-4">
              <PatientSelect rows={patients.rows} value={current.id} onChange={patients.select} />
              <fieldset>
                <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Resource types</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <label key={t} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${types.includes(t) ? "border-cyan-600 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200" : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>
                      <input type="checkbox" className="sr-only" checked={types.includes(t)} onChange={() => setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])} />
                      {t}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Practitioner and Organization are generated automatically when referenced.</p>
              </fieldset>
              <Button loading={busy} disabled={types.length === 0} onClick={() => void generate()}>Generate FHIR resources</Button>
              {notice && <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{notice}</p>}
              {genError && <ErrorPanel error={genError} />}
            </div>
          </Section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Generated resources" description={`${list.data?.resources.length ?? 0} stored for this patient`}>
              {list.loading && <LoadingState label="Loading resources…" />}
              {list.error && <ErrorPanel error={list.error} onRetry={list.reload} />}
              {list.data && list.data.resources.length === 0 && <EmptyState title="Nothing generated yet" description="Choose resource types and select Generate." />}
              {list.data && list.data.resources.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2 pr-3">Type</th><th className="pr-3">ID</th><th className="pr-3">Category</th><th>Valid</th></tr></thead>
                    <tbody>
                      {list.data.resources.map((r) => (
                        <tr key={r.key} onClick={() => setOpenKey(r.key)} className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 ${openKey === r.key ? "bg-cyan-50/60 dark:bg-cyan-950/30" : ""}`}>
                          <td className="py-2 pr-3 font-medium">
                            <button type="button" className="text-left text-cyan-800 hover:underline dark:text-cyan-300" onClick={() => setOpenKey(r.key)}>{r.resourceType}</button>
                          </td>
                          <td className="pr-3"><code className="text-xs">{r.id}</code></td>
                          <td className="pr-3 text-xs text-slate-500">{r.category ? CATEGORY_LABEL[r.category] : "Supporting"}</td>
                          <td><Badge variant={r.validation.status === "VALID" ? "success" : "danger"}>{r.validation.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Resource inspector" description="JSON, metadata and validation">
              {!openKey && <EmptyState title="Select a resource" description="Choose a row to inspect its JSON and validation result." />}
              {openKey && detail.loading && <LoadingState label="Loading resource…" />}
              {openKey && detail.error && <ErrorPanel error={detail.error} onRetry={detail.reload} />}
              {detail.data && openKey && (
                <div className="space-y-4">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-slate-500">Resource type</dt><dd className="font-semibold">{String(detail.data.resource.resourceType)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Resource ID</dt><dd><code>{String(detail.data.resource.id)}</code></dd></div>
                    <div><dt className="text-xs text-slate-500">Generated</dt><dd>{formatDateTime(detail.data.meta.generatedAt)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Generated by</dt><dd>{detail.data.meta.generatedBy}</dd></div>
                  </dl>
                  <JsonViewer data={detail.data.resource} />
                  <ValidationPanel result={detail.data.validation} />
                  <Card className="!p-4"><p className="text-xs text-slate-500">Copying JSON here is an in-house view for the custodian. To <strong>export</strong> data outside your organisation, use Data Sharing: that path enforces consent on the server.</p></Card>
                </div>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
