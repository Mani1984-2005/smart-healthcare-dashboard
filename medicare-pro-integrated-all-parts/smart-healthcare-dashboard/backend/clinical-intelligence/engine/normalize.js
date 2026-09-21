// Part 4 — turns a validated ClinicalPatientContext into an addressable, rule-friendly form.
//  * every fact gets a stable source reference ("ref") so any finding can point at exactly what supports it
//  * stored units/values are preserved verbatim; canonical values are derived alongside, never in place of them
//  * data-quality problems are detected here and surfaced as findings (never silently "fixed")
import { toMillis } from "../contracts/schemas.js";
import { SYMPTOM_SYNONYMS, VITAL_UNIT_ALIASES, VITAL_PLAUSIBLE, BRAND_ALIASES, DRUG_CLASSES, TEST_ALIASES } from "../data/referenceData.js";
import { makeFinding } from "./explain.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEGATION_RE = /^(no|not|denies|denied|without|nil|absent|negative for|never)\b/i;
export const RED_FLAG_TAGS = new Set(["chest_pain", "syncope", "facial_droop", "slurred_speech", "unilateral_weakness", "sudden_vision_loss", "thunderclap_headache", "hematemesis", "melena", "confusion", "neck_stiffness"]);

const VITAL_LABELS = { temperature: "Temperature", heartRate: "Heart rate", systolicBp: "Systolic BP", diastolicBp: "Diastolic BP", respiratoryRate: "Respiratory rate", spo2: "SpO₂" };
const VITAL_KEYS = Object.keys(VITAL_LABELS);

const clean = (s) => String(s).toLowerCase().trim().replace(/\s+/g, " ");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function symptomTags(name) {
  const n = clean(name);
  const tags = new Set();
  for (const [tag, phrases] of Object.entries(SYMPTOM_SYNONYMS)) {
    for (const p of phrases) {
      // multi-word phrases match as whole-word substrings; single words must match exactly (avoids "arm weakness" -> "weakness")
      if (p.includes(" ") ? new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(n) : n === p) tags.add(tag);
    }
  }
  return tags;
}

export function testKey(name) {
  const n = clean(name);
  for (const [key, aliases] of Object.entries(TEST_ALIASES)) if (aliases.includes(n)) return key;
  return n;
}

export const unitKey = (unit) => (unit ? String(unit).toLowerCase().replace(/\s+/g, "").replace("²", "2") : "");

const CLASS_BY_INGREDIENT = new Map();
for (const [cls, members] of Object.entries(DRUG_CLASSES)) for (const m of members) CLASS_BY_INGREDIENT.set(m, cls);

export function ingredientsOf(med) {
  let base = clean(med.genericName || med.name)
    .replace(/\b\d+(\.\d+)?\s*(mg|mcg|µg|g|ml|iu|%)\b/g, "")
    .replace(/\b(tablets?|tabs?|capsules?|caps?|syrup|injection|inj|cream|ointment)\b/g, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (BRAND_ALIASES[base]) return [...BRAND_ALIASES[base]];
  const parts = base.split(/\s*(?:\+|,|\band\b)\s*/).filter(Boolean);
  return parts.flatMap((p) => BRAND_ALIASES[p] ?? [p]);
}
export const classesOf = (ingredients) => [...new Set(ingredients.map((i) => CLASS_BY_INGREDIENT.get(i)).filter(Boolean))];

function normalizeVital(key, v, encounter) {
  const label = VITAL_LABELS[key];
  const ref = `enc:${encounter.id}.vital.${key}`;
  const base = { key, label, ref, value: v.value, unit: v.unit ?? null, encounterId: encounter.id, date: encounter.date };
  if (!v.unit) return { ...base, evaluable: false, reason: `${label}: unit not provided; value not evaluated by rules` };
  const canonicalUnit = VITAL_UNIT_ALIASES[key]?.[clean(v.unit)];
  if (!canonicalUnit) return { ...base, evaluable: false, reason: `${label}: unit '${v.unit}' is not recognised; value not evaluated by rules` };
  let canonicalValue = v.value;
  let converted = false;
  let unitOut = canonicalUnit;
  if (key === "temperature" && canonicalUnit === "°F") {
    canonicalValue = Math.round(((v.value - 32) * 5) / 9 * 10) / 10;
    unitOut = "°C";
    converted = true;
  }
  const [lo, hi] = VITAL_PLAUSIBLE[key];
  if (canonicalValue < lo || canonicalValue > hi) {
    return { ...base, evaluable: false, reason: `${label}: ${v.value} ${v.unit} is outside the physiologically plausible range; probable entry error, not evaluated by rules` };
  }
  return { ...base, evaluable: true, canonicalValue, canonicalUnit: unitOut, converted };
}

const fmtRange = (r) => (r ? ` (ref ${r.low ?? "…"}–${r.high ?? "…"})` : "");

export function normalizeContext(context, { now = Date.now() } = {}) {
  const refIndex = new Map();
  const dq = []; // data-quality findings
  const add = (ref, label, date) => refIndex.set(ref, { label, date: date ?? null });

  const encounters = context.encounters
    .map((e, i) => ({ e, i, t: toMillis(e.date) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map(({ e }) => e);

  const dqFinding = (o) => dq.push(makeFinding({ kind: "data_quality", category: "Data quality", severity: "low", reviewRequired: false, ...o }));

  const encs = encounters.map((enc) => {
    if (toMillis(enc.date) > now + DAY_MS) {
      dqFinding({ ruleId: "dq-future-encounter", key: enc.id, title: "Encounter dated in the future", statement: `Encounter ${enc.id} has a date later than today.`,
        what: `Encounter ${enc.id} is dated ${enc.date}, which is in the future.`, why: "Clinical encounters cannot have occurred yet; this is probably a data-entry error.",
        evidenceRefs: [`enc:${enc.id}`], missing: ["Confirmed encounter date"], action: "Verify the encounter date before relying on the timeline or any finding from this encounter." });
    }
    add(`enc:${enc.id}`, `${enc.type ?? "Encounter"} on ${enc.date}`, enc.date);
    if (enc.chiefComplaint) add(`enc:${enc.id}.complaint`, `Chief complaint (${enc.date}): “${enc.chiefComplaint}”`, enc.date);
    if (enc.notes) add(`enc:${enc.id}.note`, `Clinical note (${enc.date})`, enc.date);
    if (enc.followUp) add(`enc:${enc.id}.followup`, `Follow-up instruction (${enc.date}): ${enc.followUp.instruction}`, enc.date);

    const seen = new Map();
    const symptoms = enc.symptoms.map((s, i) => {
      const ref = `enc:${enc.id}.symptom.${i}`;
      const norm = clean(s.name);
      const negatedName = s.present === true && NEGATION_RE.test(s.name.trim());
      const label = `${cap(s.name)}: ${s.present === true ? "present" : s.present === false ? "absent" : "unknown"}${s.severity ? `, ${s.severity}` : ""}${s.duration ? `, ${s.duration}` : ""}`;
      add(ref, label, enc.date);
      const entry = { ...s, ref, encounterId: enc.id, date: enc.date, norm, tags: negatedName ? new Set() : symptomTags(s.name), negatedName, contradicted: false };
      const list = seen.get(norm) ?? [];
      list.push(entry);
      seen.set(norm, list);
      return entry;
    });

    for (const list of seen.values()) {
      const states = new Set(list.map((x) => String(x.present)));
      if (list.length > 1 && states.has("true") && states.has("false")) {
        list.forEach((x) => { x.contradicted = true; });
        const redTag = list.some((x) => [...symptomTags(x.name)].some((t) => RED_FLAG_TAGS.has(t)));
        dqFinding({ ruleId: "dq-contradictory-symptom", key: `${enc.id}:${list[0].norm}`, severity: redTag ? "high" : "moderate",
          title: redTag ? "Contradictory entries for a warning symptom" : "Contradictory symptom entries",
          statement: `“${list[0].name}” is recorded as both present and absent in the same encounter.`,
          what: `The symptom “${list[0].name}” appears as both present and absent in encounter ${enc.id}.`,
          why: "A symptom cannot be both present and absent; the record contradicts itself.",
          evidenceRefs: list.map((x) => x.ref), missing: ["Which entry is correct"],
          action: `Resolve the contradiction with the patient/record. Until then no rule uses this symptom${redTag ? ", so a genuine warning symptom could be under-reported — verify promptly" : ""}.` });
      } else if (list.length > 1) {
        dqFinding({ ruleId: "dq-duplicate-symptom", key: `${enc.id}:${list[0].norm}`, severity: "info", title: "Duplicate symptom entry",
          statement: `“${list[0].name}” is listed more than once in the same encounter.`,
          what: `The symptom “${list[0].name}” is entered ${list.length} times in encounter ${enc.id}.`, why: "Duplicate entries can distort counts and suggest a copy/paste error.",
          evidenceRefs: list.map((x) => x.ref), missing: [], action: "Remove the duplicate entry if it is not intentional." });
      }
      list.filter((x) => x.negatedName).forEach((x) => dqFinding({ ruleId: "dq-negated-symptom-name", key: x.ref, severity: "moderate",
        title: "Ambiguous symptom entry", statement: `“${x.name}” reads as a negation but is marked present.`,
        what: `The entry “${x.name}” contains negating wording yet has present = true.`, why: "The wording and the flag disagree, so the intended meaning is unclear.",
        evidenceRefs: [x.ref], missing: ["Whether the symptom is present or absent"], action: "Correct the entry (set present to false, or remove the negating wording). No rule uses it meanwhile." }));
    }

    const vitals = {};
    for (const key of VITAL_KEYS) {
      const v = enc.vitals?.[key];
      if (!v) continue;
      const nv = normalizeVital(key, v, enc);
      add(nv.ref, `${nv.label} ${v.value}${v.unit ? ` ${v.unit}` : " (no unit)"} (${enc.date})`, enc.date);
      vitals[key] = nv;
      if (!nv.evaluable) {
        dqFinding({ ruleId: "dq-vital-not-evaluable", key: nv.ref, title: "Vital sign not evaluated", statement: nv.reason,
          what: nv.reason, why: "Rules only evaluate values whose unit is known and physiologically plausible.",
          evidenceRefs: [nv.ref], missing: ["A valid unit / corrected value"], action: "Correct or re-measure the value so it can be evaluated." });
      }
    }
    if (vitals.systolicBp?.evaluable && vitals.diastolicBp?.evaluable && vitals.diastolicBp.canonicalValue >= vitals.systolicBp.canonicalValue) {
      dqFinding({ ruleId: "dq-bp-order", key: enc.id, severity: "moderate", title: "Diastolic BP not lower than systolic",
        statement: "The recorded diastolic pressure is not lower than the systolic pressure.",
        what: `Diastolic ${vitals.diastolicBp.value} is not below systolic ${vitals.systolicBp.value} in encounter ${enc.id}.`, why: "This is physiologically implausible and suggests transposed or mistyped values.",
        evidenceRefs: [vitals.systolicBp.ref, vitals.diastolicBp.ref], missing: ["Verified blood pressure reading"], action: "Re-check the blood pressure entry." });
    }

    const examination = enc.examination.map((o, i) => {
      const ref = `enc:${enc.id}.exam.${i}`;
      add(ref, `${o.system ? `${o.system}: ` : ""}${o.finding}${o.abnormal === true ? " (abnormal)" : o.abnormal === false ? " (normal)" : ""}`, enc.date);
      return { ...o, ref };
    });

    return { ...enc, symptoms, vitalsNorm: vitals, examination };
  });

  const allergies = context.allergies.items.map((a, i) => {
    const ref = `allergy:${i}`;
    add(ref, `Allergy: ${a.substance}${a.reaction ? ` — ${a.reaction}` : ""}${a.severity && a.severity !== "unknown" ? ` (${a.severity})` : ""}`);
    return { ...a, ref, norm: clean(a.substance) };
  });
  add("allergies:status", `Allergy status: ${context.allergies.status.replace("_", " ")}`);

  const medications = context.medications.items.map((m, i) => {
    const ref = `med:${i}`;
    const ingredients = ingredientsOf(m);
    add(ref, `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? `, ${m.frequency}` : ""} (${m.status})`, m.startDate);
    if (m.startDate && m.stopDate && toMillis(m.stopDate) < toMillis(m.startDate)) {
      dqFinding({ ruleId: "dq-med-dates", key: ref, severity: "moderate", title: "Medication stop date precedes start date", statement: `${m.name} has a stop date earlier than its start date.`,
        what: `${m.name} is recorded as stopped (${m.stopDate}) before it started (${m.startDate}).`, why: "The dates are chronologically impossible.",
        evidenceRefs: [ref], missing: ["Correct start/stop dates"], action: "Correct the medication dates." });
    }
    return { ...m, ref, ingredients, classes: classesOf(ingredients), active: m.status !== "stopped" };
  });
  add("medications:status", `Medication status: ${context.medications.status.replace("_", " ")}`);

  const history = context.history.items.map((h, i) => {
    const ref = `hist:${i}`;
    add(ref, `${cap(h.kind.replace("_", " "))}: ${h.text}${h.since ? ` (since ${h.since})` : ""}`);
    return { ...h, ref };
  });
  add("history:status", `History status: ${context.history.status.replace("_", " ")}`);

  const investigations = context.investigations.map((inv, i) => {
    const ref = `inv:${inv.id ?? `inv-${i + 1}`}`;
    const numeric = typeof inv.value === "number";
    add(ref, `${inv.name} ${inv.value}${inv.unit ? ` ${inv.unit}` : " (no unit)"}${fmtRange(inv.referenceRange)} (${inv.collectedAt.slice(0, 10)})`, inv.collectedAt);
    if (toMillis(inv.collectedAt) > now + DAY_MS) {
      dqFinding({ ruleId: "dq-future-result", key: ref, title: "Result dated in the future", statement: `${inv.name} has a collection date later than today.`,
        what: `${inv.name} is dated ${inv.collectedAt}, which is in the future.`, why: "A result cannot be collected in the future; probably a date-entry error.",
        evidenceRefs: [ref], missing: ["Confirmed collection date"], action: "Verify the collection date." });
    }
    return { ...inv, ref, numeric, key: testKey(inv.name), unitKey: unitKey(inv.unit), t: toMillis(inv.collectedAt) };
  });

  // exact duplicates
  const dupSeen = new Map();
  for (const inv of investigations) {
    const k = [inv.key, inv.t, inv.value, inv.unitKey].join("|");
    if (dupSeen.has(k)) {
      dqFinding({ ruleId: "dq-duplicate-result", key: inv.ref, severity: "info", title: "Duplicate investigation result", statement: `${inv.name} appears twice with identical date, value and unit.`,
        what: `${inv.name} (${inv.collectedAt.slice(0, 10)}) is entered more than once with the same value.`, why: "Duplicates can distort trend analysis.",
        evidenceRefs: [dupSeen.get(k), inv.ref], missing: [], action: "Remove the duplicate if unintended." });
    } else dupSeen.set(k, inv.ref);
  }

  const latestEncounter = encs.length ? encs[encs.length - 1] : null;
  const patient = context.patient;
  if (patient.ageYears !== undefined) add("patient:age", `Age: ${patient.ageYears} years`);
  if (patient.sex && patient.sex !== "unknown") add("patient:sex", `Sex: ${patient.sex}`);

  return { patient, allergiesStatus: context.allergies.status, medicationsStatus: context.medications.status, historyStatus: context.history.status,
    encounters: encs, latestEncounter, allergies, medications, history, investigations, refIndex, dataQuality: dq, now };
}
