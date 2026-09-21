// Part 4 — possible clinical considerations (NOT diagnoses).
// Each pattern lists recognised features. A consideration is surfaced only when its core feature and enough
// supporting features are documented. "Evidence coverage" (matched / recognised features) is reported instead of a
// probability, because a probability would not be technically justified by a rule-based matcher.
import { makeFinding } from "./explain.js";
import { symptomTags } from "./normalize.js";

function latestPresent(ctx, tag) {
  const enc = ctx.latestEncounter;
  return enc ? enc.symptoms.filter((s) => s.present === true && !s.contradicted && s.tags.has(tag)) : [];
}
function abnormal(inv, key, status) {
  const list = inv.results.filter((r) => r.key === key && r.status !== "not_interpreted");
  const last = list[list.length - 1];
  return last && last.status === status ? last : null;
}
function historyMatch(ctx, re) {
  return ctx.history.filter((h) => re.test(h.text));
}
const F = (label, refs) => (refs.length ? { label, refs } : null);

export function evaluateConsiderations(ctx, invAnalysis) {
  const inv = { results: invAnalysis.results.map((r) => ({ ...r, key: ctx.investigations.find((i) => i.ref === r.ref)?.key })) };
  const out = [];
  const enc = ctx.latestEncounter;
  const vit = enc?.vitalsNorm ?? {};

  const patterns = [
    {
      id: "acs", condition: "an acute coronary syndrome (cardiac cause of chest pain)", severity: "high", minSupport: 1,
      core: () => F("Chest pain documented", latestPresent(ctx, "chest_pain").map((s) => s.ref)),
      support: () => [
        F("Breathlessness", latestPresent(ctx, "dyspnea").map((s) => s.ref)),
        F("Sweating", latestPresent(ctx, "diaphoresis").map((s) => s.ref)),
        F("Pain radiating to arm/jaw", latestPresent(ctx, "radiating_pain").map((s) => s.ref)),
        F("Nausea", latestPresent(ctx, "nausea").map((s) => s.ref)),
        F("Diabetes in history", historyMatch(ctx, /diabet/i).map((h) => h.ref)),
        F("Hypertension in history", historyMatch(ctx, /hypertension/i).map((h) => h.ref)),
        F("Smoking documented", historyMatch(ctx, /smok/i).map((h) => h.ref)),
        F("Family history of cardiac event", historyMatch(ctx, /(myocardial|heart attack|coronary|cardiac)/i).filter((h) => h.kind === "family").map((h) => h.ref)),
      ],
      missing: () => ["ECG", "Cardiac biomarkers (e.g. troponin)", "Examination findings"],
      verification: ["ECG and cardiac biomarkers per local protocol", "Detailed pain history and cardiovascular examination"],
    },
    {
      id: "lrti", condition: "a lower respiratory tract infection", severity: "moderate", minSupport: 2,
      core: () => F("Cough or breathlessness documented", [...latestPresent(ctx, "cough"), ...latestPresent(ctx, "dyspnea")].map((s) => s.ref)),
      support: () => [
        F("Fever reported", latestPresent(ctx, "fever").map((s) => s.ref)),
        F("Temperature ≥ 38.0 °C", vit.temperature?.evaluable && vit.temperature.canonicalValue >= 38 ? [vit.temperature.ref] : []),
        F("Sputum", latestPresent(ctx, "sputum").map((s) => s.ref)),
        F("Oxygen saturation ≤ 94 %", vit.spo2?.evaluable && vit.spo2.canonicalValue <= 94 ? [vit.spo2.ref] : []),
        F("WBC above supplied range", (() => { const r = abnormal(inv, "wbc", "above_range"); return r ? [r.ref] : []; })()),
        F("CRP above supplied range", (() => { const r = abnormal(inv, "crp", "above_range"); return r ? [r.ref] : []; })()),
      ],
      missing: () => ["Chest examination", "Chest imaging if indicated", "Inflammatory markers"],
      verification: ["Chest examination and, if indicated, chest imaging", "Assessment of severity per local protocol"],
    },
    {
      id: "hyperglycaemia", condition: "hyperglycaemia / poor glycaemic control", severity: "moderate", minSupport: 1,
      core: () => F("Raised glucose or HbA1c versus supplied range, or polyuria/polydipsia", [
        ...[abnormal(inv, "glucose", "above_range"), abnormal(inv, "hba1c", "above_range")].filter(Boolean).map((r) => r.ref),
        ...latestPresent(ctx, "polyuria").map((s) => s.ref), ...latestPresent(ctx, "polydipsia").map((s) => s.ref)]),
      support: () => [
        F("Polydipsia", latestPresent(ctx, "polydipsia").map((s) => s.ref)),
        F("Polyuria", latestPresent(ctx, "polyuria").map((s) => s.ref)),
        F("Fatigue", latestPresent(ctx, "fatigue").map((s) => s.ref)),
        F("Weight loss", latestPresent(ctx, "weight_loss").map((s) => s.ref)),
        F("Blurred vision", latestPresent(ctx, "blurred_vision").map((s) => s.ref)),
        F("Glucose above supplied range", (() => { const r = abnormal(inv, "glucose", "above_range"); return r ? [r.ref] : []; })()),
        F("HbA1c above supplied range", (() => { const r = abnormal(inv, "hba1c", "above_range"); return r ? [r.ref] : []; })()),
        F("Diabetes in history", historyMatch(ctx, /diabet/i).map((h) => h.ref)),
      ],
      missing: () => ["Current glucose readings/ketone status if symptomatic", "Adherence and dietary history"],
      verification: ["Confirm glycaemic status with appropriate testing", "Review current diabetes treatment"],
    },
    {
      id: "anaemia", condition: "anaemia", severity: "moderate", minSupport: 1,
      core: () => F("Haemoglobin below supplied range", (() => { const r = abnormal(inv, "hemoglobin", "below_range"); return r ? [r.ref] : []; })()),
      support: () => [
        F("Fatigue", latestPresent(ctx, "fatigue").map((s) => s.ref)),
        F("Pallor", latestPresent(ctx, "pallor").map((s) => s.ref)),
        F("Breathlessness", latestPresent(ctx, "dyspnea").map((s) => s.ref)),
        F("MCV below supplied range", (() => { const r = abnormal(inv, "mcv", "below_range"); return r ? [r.ref] : []; })()),
        F("Ferritin below supplied range", (() => { const r = abnormal(inv, "ferritin", "below_range"); return r ? [r.ref] : []; })()),
      ],
      missing: () => ["Red-cell indices", "Iron studies", "Bleeding/dietary history"],
      verification: ["Red-cell indices and iron studies", "History for blood loss or nutritional causes"],
    },
    {
      id: "uti", condition: "a urinary tract infection", severity: "moderate", minSupport: 1,
      core: () => F("Dysuria documented", latestPresent(ctx, "dysuria").map((s) => s.ref)),
      support: () => [
        F("Urinary frequency", latestPresent(ctx, "urinary_frequency").map((s) => s.ref)),
        F("Fever", latestPresent(ctx, "fever").map((s) => s.ref)),
        F("Flank/suprapubic pain", latestPresent(ctx, "flank_pain").map((s) => s.ref)),
      ],
      missing: () => ["Urinalysis", "Urine culture if indicated"],
      verification: ["Urinalysis and, if indicated, culture", "Examination for flank tenderness"],
    },
  ];

  for (const p of patterns) {
    const core = p.core();
    if (!core) continue;
    const supports = p.support();
    const matched = supports.filter(Boolean);
    if (matched.length < p.minSupport) continue;
    const refs = [...new Set([...core.refs, ...matched.flatMap((m) => m.refs)])];
    const total = 1 + supports.length;
    out.push(makeFinding({
      kind: "consideration", category: "Possible consideration", ruleId: `cons-${p.id}`, key: p.id, severity: p.severity,
      title: `Possible consideration: ${p.condition}`,
      statement: `The available information may be consistent with ${p.condition}; clinician evaluation and appropriate investigation are required.`,
      what: `A recognised pattern for ${p.condition} is partly matched by the documented information.`,
      why: `Core feature: ${core.label}. Supporting features found: ${matched.map((m) => m.label).join("; ")}. Evidence coverage is ${1 + matched.length} of ${total} recognised features — this is not a probability. This is a rule-based pattern match, not a diagnosis.`,
      evidenceRefs: refs, missing: p.missing(),
      action: `Clinician to consider verification: ${p.verification.join("; ")}.`,
      extra: { evidenceCoverage: { matched: 1 + matched.length, recognised: total }, verification: p.verification, supporting: [core.label, ...matched.map((m) => m.label)] },
    }));
  }

  // persistent elevated BP across encounters
  const elevated = ctx.encounters.filter((e) => {
    const s = e.vitalsNorm.systolicBp; const d = e.vitalsNorm.diastolicBp;
    return (s?.evaluable && s.canonicalUnit === "mmHg" && s.canonicalValue >= 140) || (d?.evaluable && d.canonicalUnit === "mmHg" && d.canonicalValue >= 90);
  });
  if (elevated.length >= 2) {
    const refs = elevated.flatMap((e) => [e.vitalsNorm.systolicBp?.ref, e.vitalsNorm.diastolicBp?.ref].filter(Boolean));
    out.push(makeFinding({
      kind: "consideration", category: "Possible consideration", ruleId: "cons-bp-persistent", key: "bp", severity: "low",
      title: "Possible consideration: persistently elevated blood pressure readings",
      statement: "The available information may be consistent with inadequately controlled blood pressure; clinician evaluation is required.",
      what: `Blood pressure at or above 140/90 mmHg is recorded at ${elevated.length} encounters.`,
      why: "Rule: systolic ≥140 or diastolic ≥90 mmHg on two or more encounters (a commonly used clinic threshold; demo value, not clinically validated). Each reading is displayed with its date. This is a rule-based pattern match, not a diagnosis.",
      evidenceRefs: refs, missing: ["Home/ambulatory readings", "Adherence and secondary-cause assessment"],
      action: "Clinician to review blood-pressure control and current treatment.",
      extra: { evidenceCoverage: { matched: elevated.length, recognised: ctx.encounters.length }, verification: ["Confirm with repeat or ambulatory measurement"], supporting: [`${elevated.length} encounters with elevated readings`] },
    }));
  }
  void symptomTags;
  return out;
}
