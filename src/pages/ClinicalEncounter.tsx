import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import api from "../services/api.js";
import {
  clinicalEncounters as seedEncounters,
  type ClinicalEncounter as DemoClinicalEncounter,
} from "../demo/prototypeData";
import { Badge, Button, Dialog, EmptyState, PageHeader, Section } from "../components/ui";
import { describeWorkflowContext, hasLiveContext, resolveWorkflowContext } from "../utils/workflowContext";

type TabId = "Overview" | "Diagnosis" | "Treatment" | "Prescription" | "Follow-up" | "History";

const TABS: TabId[] = ["Overview", "Diagnosis", "Treatment", "Prescription", "Follow-up", "History"];

function cloneSeed(): DemoClinicalEncounter[] {
  return seedEncounters.map((e) => ({ ...e, prescriptions: [...e.prescriptions] }));
}

export default function ClinicalEncounter() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Refresh-safe: router state first, persisted appointment/encounter second.
  const workflow = resolveWorkflowContext({
    ...((location.state as Record<string, unknown> | null) ?? {}),
    encounterId: (location.state as Record<string, unknown> | null)?.encounterId ?? id,
  });
  const liveContextActive = hasLiveContext(workflow);
  const [encounters, setEncounters] = useState(cloneSeed);
  const [liveEncounter, setLiveEncounter] = useState<Record<string, any> | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("Overview");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchLive = async () => {
    if (!id) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const response = await api.get(`/encounters/${id}`);
      const encounterData = response?.data?.encounter ?? response?.data?.data ?? null;
      if (!encounterData) {
        setLiveEncounter(null);
        setLiveError("Encounter could not be loaded. It may not exist or you may not have access.");
      } else {
        setLiveEncounter(encounterData);
        setLiveError(null);
      }
    } catch (err) {
      setLiveEncounter(null);
      const msg = err instanceof Error ? err.message : "Encounter could not be loaded";
      if (/not found/i.test(msg)) setLiveError(`Encounter not found (“${id}”). Check the appointment workflow and try again.`);
      else if (/forbidden|unauthorized|sign in/i.test(msg)) setLiveError("Please sign in again — you do not have access to this encounter.");
      else setLiveError(msg);
    } finally {
      setLiveLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const resolvedEncounter = useMemo(() => {
    const raw: Record<string, any> | undefined = (liveEncounter as Record<string, any> | null) ?? (encounters.find((e) => e.id === id) as unknown as Record<string, any> | undefined) ?? undefined;
    if (!raw) return null;
    const source = raw;

    return {
      ...source,
      id: source.id ?? id ?? "",
      patientName: source.patientName ?? source.patient?.name ?? "Patient",
      patientId: String(source.patientId ?? source.patient?.id ?? workflow.patientId ?? ""),
      doctorName: source.doctorName ?? source.doctor?.name ?? "Doctor",
      doctorId: String(source.doctorId ?? source.doctor?.id ?? workflow.doctorId ?? ""),
      appointmentId: String(source.appointmentId ?? source.appointment?.id ?? workflow.appointmentId ?? ""),
      status: source.status ?? "IN_PROGRESS",
      diagnosis: source.diagnosis ?? "",
      treatmentPlan: source.treatmentPlan ?? "",
      prescriptions: Array.isArray(source.prescriptions)
        ? source.prescriptions.map((rx: string | { name?: string } | null) => typeof rx === "string" ? rx : rx?.name ?? "")
        : Array.isArray((source as Record<string, any>).prescriptionRecords)
          ? ((source as Record<string, any>).prescriptionRecords as Array<{ notes?: string }>).map((p) => p.notes ?? "").filter(Boolean)
          : [],
      followUpDate: source.followUpDate ?? null,
      notes: source.notes ?? "",
      signedOffAt: source.signedOffAt ?? source.completedAt ?? null,
      locked: Boolean(source.locked) || source.status === "COMPLETED" || source.status === "SIGNED_OFF",
      chiefComplaint: source.chiefComplaint ?? "",
      createdAt: source.createdAt ?? source.startedAt ?? new Date().toISOString(),
      updatedAt: source.updatedAt ?? new Date().toISOString(),
    };
  }, [encounters, id, workflow.appointmentId, workflow.doctorId, workflow.patientId, liveEncounter]);

  const encounter = resolvedEncounter;
  const isLive = Boolean(liveEncounter);
  const locked = Boolean(encounter?.locked || encounter?.status === "SIGNED_OFF" || encounter?.status === "COMPLETED");

  const history = useMemo(() => {
    if (!encounter || liveEncounter) return [];
    return encounters
      .filter((e) => e.patientId === encounter.patientId && e.id !== encounter.id)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [encounter, encounters, liveEncounter]);

  const patchLive = (updates: { diagnosis?: string; notes?: string; chiefComplaint?: string; treatmentPlan?: string }) => {
    if (!encounter) return;
    if (isLive) {
      setLiveEncounter((prev) => (prev ? { ...prev, ...updates } : prev));
    } else {
      setEncounters((prev) =>
        prev.map((e) =>
          e.id === encounter.id
            ? { ...e, ...updates, status: e.status === "DRAFT" ? "IN_PROGRESS" : e.status, updatedAt: new Date().toISOString() }
            : e
        )
      );
    }
  };

  const handleSave = async () => {
    if (!encounter || locked || !isLive || !id) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      const response = await api.put(`/encounters/${id}`, {
        diagnosis: encounter.diagnosis,
        notes: encounter.notes,
        chiefComplaint: encounter.chiefComplaint,
      });
      const updated = response?.data?.encounter ?? response?.data?.data ?? null;
      if (updated) setLiveEncounter(updated);
      setSaveOk("Clinical notes saved — data persists after refresh.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save encounter");
    } finally {
      setSaving(false);
    }
  };

  const patch = (updates: Partial<DemoClinicalEncounter>) => {
    if (!encounter || locked) return;
    if (isLive) {
      const allowed: Record<string, unknown> = {};
      if (updates.diagnosis !== undefined) allowed.diagnosis = updates.diagnosis;
      if (updates.notes !== undefined) allowed.notes = updates.notes;
      if (updates.chiefComplaint !== undefined) allowed.chiefComplaint = updates.chiefComplaint;
      if ((updates as Record<string, unknown>).treatmentPlan !== undefined) allowed.treatmentPlan = updates.treatmentPlan;
      patchLive(allowed);
      return;
    }
    setEncounters((prev) =>
      prev.map((e) =>
        e.id === encounter.id
          ? { ...e, ...updates, status: e.status === "DRAFT" ? "IN_PROGRESS" : e.status, updatedAt: new Date().toISOString() }
          : e
      )
    );
  };

  const confirmSignOff = async () => {
    if (!encounter || locked) return;
    if (!encounter.diagnosis.trim()) {
      setConfirmOpen(false);
      window.alert("Diagnosis is required before sign-off.");
      return;
    }
    if (!isLive) {
      const now = new Date().toISOString();
      setEncounters((prev) =>
        prev.map((e) =>
          e.id === encounter.id ? { ...e, status: "SIGNED_OFF", locked: true, signedOffAt: now, updatedAt: now } : e
        )
      );
      setConfirmOpen(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      // Persist latest notes first, then complete (locks the encounter server-side).
      await api.put(`/encounters/${id}`, {
        diagnosis: encounter.diagnosis,
        notes: encounter.notes,
        chiefComplaint: encounter.chiefComplaint,
      });
      const response = await api.post(`/encounters/${id}/complete`, {});
      const updated = response?.data?.encounter ?? response?.data?.data ?? null;
      if (updated) setLiveEncounter(updated);
      else await fetchLive();
      setSaveOk("Encounter signed off and locked.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to sign off encounter");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  if (liveLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Clinical" title="Loading encounter…" description={`Loading encounter ${id ?? ""} from the live backend.`} />
        <p className="text-sm text-slate-500">Loading encounter…</p>
      </div>
    );
  }

  if (!encounter) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Clinical" title="Encounter not found" description={liveError || "This encounter ID is not available from the live backend."} />
        <EmptyState
          title="Unknown encounter"
          description={liveError || `No encounter matches “${id}”.`}
          action={<Button onClick={() => navigate("/clinical")}>Back to clinical list</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Encounter ${encounter.id}${isLive ? " · Live" : " · Demo"}`}
        title={encounter.patientName}
        description={`${encounter.doctorName} · Appointment ${encounter.appointmentId || "—"} · Patient ${encounter.patientId || "—"} · Doctor ${encounter.doctorId || "—"}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/clinical")}>
              <ArrowLeft className="h-4 w-4" />
              All encounters
            </Button>
            {isLive && !locked && (
              <Button variant="secondary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save notes"}
              </Button>
            )}
            <Button onClick={() => setConfirmOpen(true)} disabled={locked || saving}>
              Sign off
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          {liveContextActive || isLive
            ? `Live workflow context active: ${describeWorkflowContext({ appointmentId: encounter.appointmentId || workflow.appointmentId, patientId: encounter.patientId || workflow.patientId, doctorId: encounter.doctorId || workflow.doctorId, encounterId: encounter.id })}.`
            : "Prototype clinical UI — demo data only. Open via Appointments → Start Consultation for a live encounter."}
        </p>
      </div>

      {liveError && !isLive && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Live backend: {liveError} Showing demo fallback below — clearly marked as demo.
        </div>
      )}
      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{saveError}</div>
      )}
      {saveOk && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{saveOk}</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={locked ? "success" : "info"}>{encounter.status.replace("_", " ")}</Badge>
        <Badge variant={isLive ? "info" : "neutral"}>{isLive ? "Live backend" : "Demo"}</Badge>
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
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === t
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
              ["Patient", `${encounter.patientName} (${encounter.patientId || "—"})`],
              ["Clinician", `${encounter.doctorName} (${encounter.doctorId || "—"})`],
              ["Appointment", encounter.appointmentId || "—"],
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
            disabled={locked || isLive}
            rows={6}
            value={encounter.treatmentPlan}
            onChange={(e) => patch({ treatmentPlan: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Document treatment plan"
          />
          {isLive ? (
            <p className="mt-2 text-xs text-slate-500">Treatment plan is currently display-only for live encounters. Use Notes/Diagnosis for persisted clinical documentation. Prescriptions and lab orders are handled through their respective modules.</p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Treatment plan is kept with the encounter note; prescriptions and lab orders use the Prescription / Laboratory modules with the same patient + encounter IDs.</p>
          )}
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
            <EmptyState title="No prior encounters" description={isLive ? "No other live encounters for this patient." : "This is the only demo encounter for this patient."} />
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
            <Button onClick={confirmSignOff} disabled={saving}>{saving ? "Working…" : "Sign off & lock"}</Button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Signing off will lock encounter <strong>{encounter.id}</strong> for {encounter.patientName}. Diagnosis and
          treatment will become read-only. {isLive ? "This writes to the live backend (PUT + complete) and persists after refresh." : "This demo action updates local state only."}
        </p>
      </Dialog>
    </div>
  );
}