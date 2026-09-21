// Part 4 — record-derived clinical summary + information gaps. Nothing here is AI-generated and nothing is invented:
// every line is traceable to a source reference, and absent information is stated explicitly.
import { makeFinding } from "./explain.js";

const NOT_PROVIDED = "Not provided";
const section = (items) => (items.length ? { status: "provided", items } : { status: "not_provided", display: NOT_PROVIDED, items: [] });

export function buildSummary(ctx, invAnalysis) {
  const enc = ctx.latestEncounter;
  const line = (text, ...sourceRefs) => ({ text, sourceRefs });
  const latestByTest = new Map();
  for (const r of invAnalysis.results) latestByTest.set(r.name.toLowerCase(), r);

  const present = enc ? enc.symptoms.filter((s) => s.present === true) : [];
  const absent = enc ? enc.symptoms.filter((s) => s.present === false) : [];
  const vitals = enc ? Object.values(enc.vitalsNorm) : [];

  return {
    origin: "record",
    asOf: enc?.date ?? null,
    presentingComplaint: enc?.chiefComplaint ? { status: "provided", items: [line(enc.chiefComplaint, `enc:${enc.id}.complaint`)] } : section([]),
    symptoms: section(present.map((s) => line(`${s.name}${s.severity ? `, ${s.severity}` : ""}${s.duration ? `, ${s.duration}` : ""}${s.contradicted ? " (conflicting entry — see data quality)" : ""}`, s.ref))),
    documentedAbsent: section(absent.map((s) => line(`${s.name}${s.contradicted ? " (conflicting entry — see data quality)" : ""}`, s.ref))),
    relevantHistory: ctx.historyStatus === "none_known" ? { status: "none_known", display: "None known (documented)", items: [] }
      : section(ctx.history.map((h) => line(`${h.text}${h.since ? ` (since ${h.since})` : ""}`, h.ref))),
    currentMedications: ctx.medicationsStatus === "none_known" ? { status: "none_known", display: "None (documented)", items: [] }
      : section(ctx.medications.filter((m) => m.active).map((m) => line(`${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? `, ${m.frequency}` : ""}${m.status === "unknown" ? " (status unknown)" : ""}`, m.ref))),
    allergies: ctx.allergiesStatus === "none_known" ? { status: "none_known", display: "No known allergies (documented)", items: [] }
      : section(ctx.allergies.map((a) => line(`${a.substance}${a.reaction ? ` — ${a.reaction}` : ""}${a.severity && a.severity !== "unknown" ? ` (${a.severity})` : ""}`, a.ref))),
    vitals: section(vitals.map((v) => line(`${v.label} ${v.value}${v.unit ? ` ${v.unit}` : " (no unit)"}`, v.ref))),
    examination: section(enc ? enc.examination.map((o) => line(`${o.system ? `${o.system}: ` : ""}${o.finding}`, o.ref)) : []),
    investigations: section([...latestByTest.values()].map((r) => line(
      `${r.name} ${r.value}${r.unit ? ` ${r.unit}` : ""}${r.referenceRange ? ` (ref ${r.referenceRange.low ?? "…"}–${r.referenceRange.high ?? "…"})` : ""} — ${r.status === "not_interpreted" ? "not interpreted" : r.status.replace("_", " ")}`, r.ref))),
    followUp: section(ctx.encounters.filter((e) => e.followUp).map((e) => line(`${e.followUp.instruction}${e.followUp.date ? ` (by ${e.followUp.date})` : ""}`, `enc:${e.id}.followup`))),
  };
}

export function collectGaps(ctx, invAnalysis, redFlagNotEvaluated, medNotPerformed) {
  const gaps = [];
  const gap = (ruleId, title, missing, why, action, refs = [], severity = "low") =>
    gaps.push(makeFinding({ kind: "information_gap", category: "Missing information", ruleId, key: title, severity, reviewRequired: false, title,
      statement: `${title}. The system has not assumed a value.`, what: title, why, missing, action, evidenceRefs: refs }));
  const enc = ctx.latestEncounter;

  if (!enc) gap("gap-no-encounter", "No encounter recorded", ["Any encounter"], "Symptom, vital-sign and examination information comes from encounters.", "Add an encounter before relying on this output.");
  else {
    if (!enc.chiefComplaint) gap("gap-complaint", "Chief complaint not provided", ["Chief complaint"], "The reason for the encounter is not stated.", "Record the presenting complaint.", [`enc:${enc.id}`]);
    if (enc.symptoms.length === 0) gap("gap-symptoms", "No symptoms recorded in the latest encounter", ["Symptoms (present and absent)"], "Symptom-based rules cannot run without structured symptoms.", "Record symptoms as structured entries with present/absent.", [`enc:${enc.id}`]);
    if (Object.keys(enc.vitalsNorm).length === 0) gap("gap-vitals", "No vital signs recorded in the latest encounter", ["Vital signs"], "Vital-sign rules cannot run.", "Record vital signs with units.", [`enc:${enc.id}`]);
    if (enc.examination.length === 0) gap("gap-exam", "No examination findings recorded in the latest encounter", ["Examination findings"], "No examination information is available.", "Record examination findings.", [`enc:${enc.id}`]);
    const noDur = enc.symptoms.filter((s) => s.present === true && !s.duration && !s.contradicted);
    if (noDur.length) gap("gap-duration", "Duration not provided for present symptoms", noDur.map((s) => `Duration: ${s.name}`), "Onset and duration influence clinical interpretation.", "Record onset/duration.", noDur.map((s) => s.ref));
  }
  if (ctx.patient.ageYears === undefined) gap("gap-age", "Age not provided", ["Age"], "Adult vital-sign thresholds and age-dependent context cannot be applied.", "Record the patient's age.", [], "moderate");
  if (!ctx.patient.sex || ctx.patient.sex === "unknown") gap("gap-sex", "Sex not provided", ["Sex"], "Some interpretation depends on sex.", "Record sex if clinically relevant.");
  if (ctx.allergiesStatus === "not_provided") gap("gap-allergies", "Allergy status not provided", ["Allergy status"], "Allergy checks were NOT performed. Missing is not the same as 'no allergies'.", "Ask about and record allergies.", ["allergies:status"], "moderate");
  if (ctx.medicationsStatus === "not_provided") gap("gap-meds", "Medication list not provided", ["Current medications"], "Interaction, duplication and allergy-conflict checks were NOT performed.", "Record current medications (or document none).", ["medications:status"], "moderate");
  if (ctx.historyStatus === "not_provided") gap("gap-history", "Medical history not provided", ["Past medical history", "Risk factors"], "Risk-factor–dependent considerations cannot be assessed.", "Record relevant history (or document none known).", ["history:status"]);
  if (ctx.investigations.length === 0) gap("gap-investigations", "No investigations recorded", ["Laboratory/investigation results"], "Investigation intelligence had no results to assess.", "Add results if any have been performed.");
  for (const reason of redFlagNotEvaluated) gap("gap-redflag-not-evaluated", "Red-flag rule not evaluated", [reason], reason, "Supply the missing information so screening can run.", [], "moderate");
  for (const m of medNotPerformed.filter((x) => ctx.medicationsStatus === "documented" && x.check.startsWith("renal"))) gap("gap-check-not-performed", `Check not performed: ${m.check}`, [m.reason], m.reason, "Supply the missing information so the check can run.", [], "moderate");
  void invAnalysis;
  return gaps;
}
