import { useState } from "react";
import { Button, PageHeader, Section } from "../../components/ui";
import { ErrorPanel, Field, ValidationPanel } from "../components/common";
import { api, ApiError } from "../api/client";
import type { ValidationResult } from "../api/types";
import { selectClass } from "../lib";
import { useApi } from "../hooks/useApi";
import type { BundleSummary } from "../api/types";
import { usePart6Auth } from "../store/authStore";

// Synthetic samples so the validator can be exercised without any stored data.
const VALID_PATIENT = {
  resourceType: "Patient",
  id: "SAMPLE-001",
  identifier: [{ system: "https://medicare-pro.example/fhir/id/patient", value: "SAMPLE-001" }],
  name: [{ family: "Sample", given: ["Demo"] }],
  gender: "female",
  birthDate: "1990-01-15",
};
const INVALID_PATIENT = { resourceType: "Patient", id: "SAMPLE-002", name: [{ family: "Sample" }], gender: "robot", birthDate: "15/01/1990", managingOrganization: { reference: "Practitioner/x" }, favouriteColour: "blue" };
const BROKEN_JSON = '{ "resourceType": "Patient", "id": "x", ';

export default function Validation() {
  const role = usePart6Auth((s) => s.user!.role);
  const [text, setText] = useState(JSON.stringify(VALID_PATIENT, null, 2));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [bundleId, setBundleId] = useState("");
  const canStored = role === "DOCTOR" || role === "HOSPITAL_ADMIN";
  const bundles = useApi(() => api.get<{ bundles: BundleSummary[] }>("/fhir/bundles"), [], canStored);

  async function run(body: unknown) {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.post<ValidationResult>("/fhir/validate", body));
    } catch (e) {
      setResult(null);
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Part 6 · FHIR" title="FHIR Validation" description="Structural validation of FHIR R4 JSON: valid JSON, supported resource type, permitted elements, required fields, identifiers, value-set codes, reference targets and Bundle rules." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Validate JSON" description="Paste a resource or Bundle, or load a sample.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setText(JSON.stringify(VALID_PATIENT, null, 2))}>Sample: valid Patient</Button>
              <Button variant="secondary" onClick={() => setText(JSON.stringify(INVALID_PATIENT, null, 2))}>Sample: invalid Patient</Button>
              <Button variant="secondary" onClick={() => setText(BROKEN_JSON)}>Sample: broken JSON</Button>
            </div>
            <Field label="FHIR JSON">
              <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} rows={16} className={`${selectClass} font-mono text-xs`} />
            </Field>
            <Button loading={busy} onClick={() => void run({ raw: text })}>Validate</Button>
            {canStored && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <Field label="…or validate a stored bundle">
                  <div className="flex gap-2">
                    <select className={selectClass} value={bundleId} onChange={(e) => setBundleId(e.target.value)}>
                      <option value="">Select a bundle</option>
                      {bundles.data?.bundles.map((b) => <option key={b.id} value={b.id}>{b.id} · {b.entryCount} entries</option>)}
                    </select>
                    <Button variant="secondary" disabled={!bundleId} onClick={() => void run({ bundleId })}>Validate</Button>
                  </div>
                </Field>
              </div>
            )}
          </div>
        </Section>
        <Section title="Result">
          {!result && !error && <p className="text-sm text-slate-500">Run a validation to see the checks, status and issues.</p>}
          {error && <ErrorPanel error={error} />}
          {result && (
            <div className="space-y-4">
              <ValidationPanel result={result} />
              {result.bundle && (
                <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                  <p className="font-semibold">Bundle summary</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">Type <strong>{result.bundle.type}</strong> · {result.bundle.entryCount} entries · {result.bundle.referencesChecked} references checked</p>
                  <p className="mt-1 text-xs text-slate-500">{Object.entries(result.bundle.resourceTypes).map(([t, n]) => `${t} ×${n}`).join(", ")}</p>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
