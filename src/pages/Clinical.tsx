import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ClipboardList, Lock, Stethoscope } from "lucide-react";
import {
  clinicalEncounters as seedEncounters,
  type ClinicalEncounter,
  type EncounterStatus,
} from "../demo/prototypeData";
import { Badge, Button, EmptyState, PageHeader, Section } from "../components/ui";

function statusVariant(status: EncounterStatus): "neutral" | "info" | "success" | "warning" {
  if (status === "SIGNED_OFF") return "success";
  if (status === "IN_PROGRESS") return "info";
  return "warning";
}

const STEPS = ["Patient", "Encounter", "Diagnosis", "Treatment", "Prescription", "Follow-up", "Sign-off"] as const;

export default function Clinical() {
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>(() =>
    seedEncounters.map((e) => ({ ...e, prescriptions: [...e.prescriptions] }))
  );
  const [selectedId, setSelectedId] = useState<string>(encounters[0]?.id ?? "");
  const selected = encounters.find((e) => e.id === selectedId) ?? null;
  const locked = Boolean(selected?.locked || selected?.status === "SIGNED_OFF");

  const metrics = useMemo(() => {
    const active = encounters.filter((e) => e.status !== "SIGNED_OFF").length;
    const signed = encounters.filter((e) => e.status === "SIGNED_OFF").length;
    const drafts = encounters.filter((e) => e.status === "DRAFT").length;
    return { active, signed, drafts, total: encounters.length };
  }, [encounters]);

  const updateSelected = (patch: Partial<ClinicalEncounter>) => {
    if (!selected || locked) return;
    setEncounters((prev) =>
      prev.map((e) => (e.id === selected.id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e))
    );
  };

  const handleSignOff = () => {
    if (!selected || locked) return;
    if (!selected.diagnosis.trim() || !selected.treatmentPlan.trim()) {
      window.alert("Diagnosis and treatment plan are required before sign-off.");
      return;
    }
    const now = new Date().toISOString();
    setEncounters((prev) =>
      prev.map((e) =>
        e.id === selected.id
          ? { ...e, status: "SIGNED_OFF", locked: true, signedOffAt: now, updatedAt: now }
          : e
      )
    );
  };

  const rxText = selected?.prescriptions.join("\n") ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical workflow"
        title="Clinical encounters"
        description="Document the care journey from patient presentation through sign-off. Locked notes cannot be edited."
        actions={
          <Button variant="secondary" onClick={() => selected && navigate(`/clinical/${selected.id}`)}>
            Open full workspace
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Prototype clinical UI — Part 4 API not connected in this workspace; demo data only.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Section title="Active" description="In progress or draft">
          <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{metrics.active}</p>
        </Section>
        <Section title="Signed off" description="Locked clinical notes">
          <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{metrics.signed}</p>
        </Section>
        <Section title="Drafts" description="Awaiting documentation">
          <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{metrics.drafts}</p>
        </Section>
        <Section title="Total encounters" description="Demo dataset">
          <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{metrics.total}</p>
        </Section>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <Section title="Encounter list" description="Select a record to review or continue documentation" action={<Badge variant="neutral">Demo</Badge>}>
          {encounters.length === 0 ? (
            <EmptyState title="No encounters" description="Clinical encounters will appear here when created." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {encounters.map((enc) => (
                <li key={enc.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(enc.id)}
                    className={`flex w-full flex-col gap-2 px-3 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900 ${
                      selectedId === enc.id ? "bg-cyan-50/80 dark:bg-cyan-950/40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{enc.patientName}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {enc.id} · {enc.doctorName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {enc.locked && <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
                        <Badge variant={statusVariant(enc.status)}>{enc.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                    <p className="line-clamp-1 text-xs text-slate-600 dark:text-slate-300">
                      {enc.diagnosis || enc.chiefComplaint || "No diagnosis recorded"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Encounter detail"
          description="Patient → Encounter → Diagnosis → Treatment → Prescription → Follow-up → Sign-off"
          action={
            locked ? (
              <Badge variant="success">
                <Lock className="mr-1 inline h-3 w-3" />
                Locked
              </Badge>
            ) : (
              <Badge variant="info">Editable</Badge>
            )
          }
        >
          {!selected ? (
            <EmptyState title="Select an encounter" description="Choose a patient encounter from the list to continue the clinical workflow." icon={<ClipboardList className="h-8 w-8" />} />
          ) : (
            <div className="space-y-5">
              <ol className="flex flex-wrap gap-2">
                {STEPS.map((step, index) => (
                  <li key={step}>
                    <Badge variant={index <= 5 || locked ? "info" : "neutral"}>
                      {index + 1}. {step}
                    </Badge>
                  </li>
                ))}
              </ol>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Patient</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{selected.patientName}</p>
                  <p className="text-xs text-slate-500">{selected.patientId}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Clinician</label>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <Stethoscope className="h-4 w-4 text-cyan-700" />
                    {selected.doctorName}
                  </p>
                  <p className="text-xs text-slate-500">Appointment {selected.appointmentId}</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Chief complaint</label>
                <input
                  disabled={locked}
                  value={selected.chiefComplaint ?? ""}
                  onChange={(e) => updateSelected({ chiefComplaint: e.target.value, status: selected.status === "DRAFT" ? "IN_PROGRESS" : selected.status })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Diagnosis</label>
                <textarea
                  disabled={locked}
                  rows={2}
                  value={selected.diagnosis}
                  onChange={(e) => updateSelected({ diagnosis: e.target.value, status: selected.status === "DRAFT" ? "IN_PROGRESS" : selected.status })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Enter working or final diagnosis"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Treatment plan</label>
                <textarea
                  disabled={locked}
                  rows={3}
                  value={selected.treatmentPlan}
                  onChange={(e) => updateSelected({ treatmentPlan: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Investigations, therapies, referrals"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Prescriptions (one per line)</label>
                <textarea
                  disabled={locked}
                  rows={3}
                  value={rxText}
                  onChange={(e) =>
                    updateSelected({
                      prescriptions: e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Follow-up date</label>
                  <input
                    type="date"
                    disabled={locked}
                    value={selected.followUpDate ?? ""}
                    onChange={(e) => updateSelected({ followUpDate: e.target.value || null })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Clinical notes</label>
                  <input
                    disabled={locked}
                    value={selected.notes ?? ""}
                    onChange={(e) => updateSelected({ notes: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>

              {locked && selected.signedOffAt && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Signed off at {new Date(selected.signedOffAt).toLocaleString("en-IN")} — encounter is locked.
                </p>
              )}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Button variant="secondary" onClick={() => navigate(`/patients/${selected.patientId}`)}>
                  Open patient
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/clinical/${selected.id}`)}>
                  Full workspace
                </Button>
                <Button onClick={handleSignOff} disabled={locked}>
                  Sign off &amp; lock
                </Button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
