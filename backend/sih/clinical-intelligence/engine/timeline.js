// Part 4 — clinical timeline. Built only from supplied dated facts; nothing is inferred or back-filled.
import { toMillis } from "../contracts/schemas.js";

const ORDER = { encounter: 0, symptom: 1, examination: 2, investigation: 3, note: 4, medication_start: 5, medication_stop: 6, follow_up: 7 };

export function buildTimeline(ctx) {
  const events = [];
  const push = (date, kind, title, detail, sourceRef, encounterId = null) => events.push({ id: `${kind}:${sourceRef}`, date, kind, title, detail, sourceRef, encounterId, t: toMillis(date) });

  for (const e of ctx.encounters) {
    push(e.date, "encounter", `${e.type ?? "Encounter"}${e.chiefComplaint ? ` — ${e.chiefComplaint}` : ""}`, null, `enc:${e.id}`, e.id);
    const present = e.symptoms.filter((s) => s.present === true);
    if (present.length) push(e.date, "symptom", "Symptoms", present.map((s) => s.name + (s.severity ? ` (${s.severity})` : "")).join(", "), `enc:${e.id}.symptom.0`, e.id);
    const vit = Object.values(e.vitalsNorm);
    if (vit.length) push(e.date, "examination", "Vital signs", vit.map((v) => `${v.label} ${v.value}${v.unit ? ` ${v.unit}` : ""}`).join(" · "), vit[0].ref, e.id);
    e.examination.forEach((o) => push(e.date, "examination", `Examination${o.system ? ` — ${o.system}` : ""}`, o.finding, o.ref, e.id));
    if (e.notes) push(e.date, "note", "Clinical note", e.notes, `enc:${e.id}.note`, e.id);
    if (e.followUp) push(e.followUp.date ?? e.date, "follow_up", e.followUp.date ? "Follow-up due" : "Follow-up instruction (no date given)", e.followUp.instruction, `enc:${e.id}.followup`, e.id);
  }
  for (const r of ctx.investigations) {
    push(r.collectedAt, "investigation", r.name, `${r.value}${r.unit ? ` ${r.unit}` : ""}${r.referenceRange ? ` (ref ${r.referenceRange.low ?? "…"}–${r.referenceRange.high ?? "…"})` : ""}`, r.ref);
  }
  for (const m of ctx.medications) {
    if (m.startDate) push(m.startDate, "medication_start", `Started: ${m.name}`, [m.dose, m.frequency].filter(Boolean).join(", ") || null, m.ref);
    if (m.stopDate) push(m.stopDate, "medication_stop", `Stopped: ${m.name}`, null, m.ref);
  }
  events.sort((a, b) => a.t - b.t || ORDER[a.kind] - ORDER[b.kind]);
  return events.map(({ t: _t, ...rest }) => rest);
}
