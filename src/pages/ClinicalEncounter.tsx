import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import {
  clinicalEncounters as seedEncounters,
  type ClinicalEncounter as DemoClinicalEncounter,
} from "../demo/prototypeData";
import { Badge, Button, Dialog, EmptyState, PageHeader, Section } from "../components/ui";

type TabId = "Overview" | "Diagnosis" | "Treatment" | "Prescription" | "Follow-up" | "History";

const TABS: TabId[] = ["Overview", "Diagnosis", "Treatment", "Prescription", "Follow-up", "History"];

function cloneSeed(): DemoClinicalEncounter[] {
  return seedEncounters.map((e) => ({ ...e, prescriptions: [...e.prescriptions] }));
}

export default function ClinicalEncounter() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState(cloneSeed);
  const [tab, setTab] = useState<TabId>("Overview");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const encounter = encounters.find((e) => e.id === id) ?? null;
  const locked = Boolean(encounter?.locked || encounter?.status === "SIGNED_OFF");

  const history = useMemo(() => {
    if (!encounter) return [];
    return encounters
      .filter((e) => e.patientId === encounter.patientId && e.id !== encounter.id)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [encounter, encounters]);

  const patch = (updates: Partial<DemoClinicalEncounter>) => {
    if (!encounter || locked) return;
    setEncounters((prev) =>
      prev.map((e) =>
        e.id === encounter.id
          ? {
              ...e,
              ...updates,
              status: e.status === "DRAFT" ? "IN_PROGRESS" : e.status,
              updatedAt: new Date().toISOString(),
            }
          : e
      )
    );
  };

  const confirmSignOff = () => {
    if (!encounter || locked) return;
    if (!encounter.diagnosis.trim() || !encounter.treatmentPlan.trim()) {
      setConfirmOpen(false);
      window.alert("Diagnosis and treatment plan are required before sign-off.");
      return;
    }
    const now = new Date().toISOString();
    setEncounters((prev) =>
      prev.map((e) =>
        e.id === encounter.id ? { ...e, status: "SIGNED_OFF", locked: true, signedOffAt: now, updatedAt: now } : e
      )
    );
    setConfirmOpen(false);
  };

  if (!encounter) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Clinical" title="Encounter not found" description="This encounter ID is not in the demo dataset." />
        <EmptyState
          title="Unknown encounter"
          description={`No prototype encounter matches “${id}”.`}
          action={<Button onClick={() => navigate("/clinical")}>Back to clinical list</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Encounter ${encounter.id}`}
        title={encounter.patientName}
        description={`${encounter.doctorName} · Appointment ${encounter.appointmentId}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/clinical")}>
              <ArrowLeft className="h-4 w-4" />
              All encounters
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={locked}>
              Sign off
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Prototype clinical UI — Part 4 API not connected in this workspace; demo data only.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={locked ? "success" : "info"}>{encounter.status.replace("_", " ")}</Badge>
        {locked && (
          <Badge variant="success">
            <Lock className="mr-1 inline h-3 w-3" />
            Locked
          </Badge>
        )}
        {encounter.signedOffAt && (
          <span className="text-xs text-slate-500">Signed {new Date(encounter.signedOffAt).toLocaleString("en-IN")}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2 dark:border-slate-800" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t
                ? "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <Section title="Encounter overview" description="Summary of the current clinical visit">
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Patient", `${encounter.patientName} (${encounter.patientId})`],
              ["Clinician", encounter.doctorName],
              ["Appointment", encounter.appointmentId],
              ["Status", encounter.status.replace("_", " ")],
              ["Chief complaint", encounter.chiefComplaint || "—"],
              ["Last updated", encounter.updatedAt ? new Date(encounter.updatedAt).toLocaleString("en-IN") : "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Notes</label>
            <textarea
              disabled={locked}
              rows={3}
              value={encounter.notes ?? ""}
              onChange={(e) => patch({ notes: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </Section>
      )}

      {tab === "Diagnosis" && (
        <Section title="Diagnosis" description="Working and final diagnoses for this encounter">
          <textarea
            disabled={locked}
            rows={5}
            value={encounter.diagnosis}
            onChange={(e) => patch({ diagnosis: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Enter diagnosis"
          />
        </Section>
      )}

      {tab === "Treatment" && (
        <Section title="Treatment plan" description="Investigations, therapies, and referrals">
          <textarea
            disabled={locked}
            rows={6}
            value={encounter.treatmentPlan}
            onChange={(e) => patch({ treatmentPlan: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Document treatment plan"
          />
        </Section>
      )}

      {tab === "Prescription" && (
        <Section title="Prescriptions" description="One medication instruction per line">
          <textarea
            disabled={locked}
            rows={6}
            value={encounter.prescriptions.join("\n")}
            onChange={(e) =>
              patch({
                prescriptions: e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              })
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
          />
          {encounter.prescriptions.length > 0 && (
            <ul className="mt-4 space-y-2">
              {encounter.prescriptions.map((rx) => (
                <li key={rx} className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                  {rx}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === "Follow-up" && (
        <Section title="Follow-up" description="Schedule the next clinical touchpoint">
          <input
            type="date"
            disabled={locked}
            value={encounter.followUpDate ?? ""}
            onChange={(e) => patch({ followUpDate: e.target.value || null })}
            className="max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
          />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            {encounter.followUpDate
              ? `Follow-up planned for ${new Date(encounter.followUpDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`
              : "No follow-up date set."}
          </p>
        </Section>
      )}

      {tab === "History" && (
        <Section title="Prior encounters" description={`Other visits for ${encounter.patientName}`}>
          {history.length === 0 ? (
            <EmptyState title="No prior encounters" description="This is the only demo encounter for this patient." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{h.id}</p>
                    <p className="text-xs text-slate-500">
                      {h.diagnosis || "No diagnosis"} · {h.createdAt ? new Date(h.createdAt).toLocaleDateString("en-IN") : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={h.locked ? "success" : "info"}>{h.status.replace("_", " ")}</Badge>
                    <Button variant="ghost" onClick={() => navigate(`/clinical/${h.id}`)}>
                      Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm clinical sign-off"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSignOff}>Sign off &amp; lock</Button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Signing off will lock encounter <strong>{encounter.id}</strong> for {encounter.patientName}. Diagnosis and
          treatment will become read-only. This prototype action updates local state only — no clinical API write occurs.
        </p>
      </Dialog>
    </div>
  );
}
