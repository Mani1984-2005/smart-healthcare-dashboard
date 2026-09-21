// Part 4 — deterministic red-flag rules. No AI is involved in any safety-critical check.
// Rules read STRUCTURED fields only (present === true). Free text is never keyword-scanned here, which avoids
// misreading negations such as "no chest pain". Nothing fires on unknown/absent/contradicted entries.
import { VITAL_THRESHOLDS } from "../data/referenceData.js";
import { makeFinding } from "./explain.js";

const has = (syms, tag) => syms.filter((s) => s.tags.has(tag));
const refs = (list) => list.map((s) => s.ref);
const CAVEAT = "Thresholds are configurable demo values adapted from early-warning-score extreme bands; they are not clinically validated.";

function matches(t, v) {
  return t.op === "gte" ? v >= t.value : v <= t.value;
}

export function evaluateRedFlags(ctx) {
  const findings = [];
  const notEvaluated = [];
  const enc = ctx.latestEncounter;
  const flag = (o) => findings.push(makeFinding({ kind: "red_flag", category: "Red flag", severity: "high", ...o }));

  if (!enc) {
    notEvaluated.push("No encounter recorded: symptom and vital-sign red-flag rules were not evaluated.");
  } else {
    const adult = ctx.patient.ageYears !== undefined && ctx.patient.ageYears >= 16;
    const vitals = enc.vitalsNorm;
    const symptoms = enc.symptoms.filter((s) => s.present === true && !s.contradicted && !s.negatedName);

    // ---- vital signs (adult thresholds only) ----
    if (!adult) {
      notEvaluated.push(ctx.patient.ageYears === undefined
        ? "Age not provided: adult vital-sign thresholds were not applied."
        : "Patient is under 16: adult vital-sign thresholds were not applied.");
    } else if (Object.keys(vitals).length === 0) {
      notEvaluated.push(`No vital signs recorded in the latest encounter (${enc.date}): vital-sign red-flag rules were not evaluated.`);
    } else {
      for (const [key, thresholds] of Object.entries(VITAL_THRESHOLDS)) {
        const v = vitals[key];
        if (!v?.evaluable) continue;
        const hit = thresholds.find((t) => t.unit === v.canonicalUnit && matches(t, v.canonicalValue));
        if (!hit) continue;
        flag({
          ruleId: `rf-vital-${key}`, key: String(hit.value), urgency: hit.urgency, title: `${hit.label}`,
          statement: `Potential warning sign: ${hit.label.toLowerCase()} (${v.value} ${v.unit}${v.converted ? `, ${v.canonicalValue} ${v.canonicalUnit} after conversion for rule evaluation` : ""}).`,
          what: `${v.label} of ${v.value} ${v.unit} recorded on ${v.date} is ${hit.op === "gte" ? "at or above" : "at or below"} ${hit.value} ${hit.unit}.`,
          why: `Single-parameter extreme-band rule. ${CAVEAT}${hit.caveat ? ` ${hit.caveat}` : ""}`,
          evidenceRefs: [v.ref], missing: ["Repeat/confirmatory measurement", "Clinical context and trend"],
          action: "Clinician to verify the measurement and assess the patient in context.",
        });
      }
      // qSOFA-style screen: >=2 of RR>=22, SBP<=100, new confusion
      const crit = [];
      if (vitals.respiratoryRate?.evaluable && vitals.respiratoryRate.canonicalUnit === "breaths/min" && vitals.respiratoryRate.canonicalValue >= 22) crit.push(vitals.respiratoryRate.ref);
      if (vitals.systolicBp?.evaluable && vitals.systolicBp.canonicalUnit === "mmHg" && vitals.systolicBp.canonicalValue <= 100) crit.push(vitals.systolicBp.ref);
      const conf = has(symptoms, "confusion");
      crit.push(...refs(conf));
      if (crit.length >= 2) {
        flag({
          ruleId: "rf-qsofa-style", key: "qsofa", urgency: "immediate_review", title: "Multiple sepsis-screen criteria met",
          statement: "Potential warning sign: at least two qSOFA-style criteria are present.",
          what: `${crit.length} of 3 qSOFA-style criteria (respiratory rate ≥22, systolic BP ≤100, new confusion) are documented in the latest encounter.`,
          why: "qSOFA is a bedside screening tool for patients with suspected infection. It is not a diagnosis, and it is not scored against infection status here. " + CAVEAT,
          evidenceRefs: crit, missing: ["Whether infection is suspected", "Lactate and other investigations"],
          action: "Clinician to assess urgently for deterioration and consider the cause.",
        });
      }
    }

    // ---- symptom patterns ----
    const chest = has(symptoms, "chest_pain");
    if (chest.length) {
      const assoc = ["dyspnea", "diaphoresis", "radiating_pain", "nausea", "syncope"].flatMap((t) => has(symptoms, t));
      const withAssoc = assoc.length > 0;
      flag({
        ruleId: "rf-chest-pain", key: withAssoc ? "assoc" : "alone", urgency: withAssoc ? "immediate_review" : "prompt_review",
        title: withAssoc ? "Chest pain with associated features" : "Chest pain documented",
        statement: withAssoc ? "Potential warning sign: chest pain is documented together with other symptoms that warrant prompt clinical evaluation." : "Potential warning sign: chest pain is documented.",
        what: withAssoc ? "Chest pain is recorded together with breathlessness, sweating, radiation, nausea and/or syncope." : "Chest pain is recorded as present.",
        why: "Chest pain has cardiac and non-cardiac causes; the combination of features raises the priority of review. This rule flags for review only and makes no diagnosis.",
        evidenceRefs: [...refs(chest), ...refs(assoc)],
        missing: ["ECG", "Cardiac biomarkers", ...(chest.some((s) => s.duration) ? [] : ["Onset/duration of pain"])],
        action: "Clinician to assess promptly and decide on appropriate investigation.",
      });
    }
    const neuro = ["facial_droop", "slurred_speech", "unilateral_weakness", "sudden_vision_loss"].flatMap((t) => has(symptoms, t));
    if (neuro.length) flag({
      ruleId: "rf-neuro-deficit", key: "neuro", urgency: "immediate_review", title: "Possible acute neurological deficit features",
      statement: "Potential warning sign: symptoms that may indicate an acute neurological deficit are documented.",
      what: "One or more of facial droop, slurred speech, one-sided weakness or sudden vision loss is recorded as present.",
      why: "These features can be time-critical; the rule flags them for review and makes no diagnosis.",
      evidenceRefs: refs(neuro), missing: neuro.some((s) => s.duration) ? ["Neurological examination", "Time last known well"] : ["Time of onset", "Neurological examination"],
      action: "Clinician to assess urgently and establish onset time.",
    });
    const thunder = has(symptoms, "thunderclap_headache");
    if (thunder.length) flag({
      ruleId: "rf-thunderclap", key: "thunder", urgency: "immediate_review", title: "Sudden severe headache documented",
      statement: "Potential warning sign: a sudden, severe headache is documented.",
      what: "A sudden severe (thunderclap-type) headache is recorded as present.", why: "Abrupt-onset severe headache is a recognised warning symptom that warrants clinician review.",
      evidenceRefs: refs(thunder), missing: ["Onset details", "Neurological examination"], action: "Clinician to assess promptly.",
    });
    const sevDysp = has(symptoms, "dyspnea").filter((s) => s.severity === "severe");
    if (sevDysp.length) flag({
      ruleId: "rf-severe-dyspnea", key: "dyspnea", urgency: "prompt_review", title: "Severe breathlessness documented",
      statement: "Potential warning sign: severe breathlessness is documented.", what: "Breathlessness is recorded as present with severe intensity.",
      why: "Severe breathlessness can indicate a serious cardiorespiratory problem; flagged for review only.",
      evidenceRefs: refs(sevDysp), missing: ["Oxygen saturation trend", "Examination findings"], action: "Clinician to assess promptly.",
    });
    const bleed = ["hematemesis", "melena", "rectal_bleeding"].flatMap((t) => has(symptoms, t));
    if (bleed.length) flag({
      ruleId: "rf-gi-bleed", key: "bleed", urgency: "prompt_review", title: "Possible gastrointestinal bleeding features",
      statement: "Potential warning sign: symptoms that may indicate gastrointestinal bleeding are documented.", what: "Vomiting blood, black stool and/or rectal bleeding is recorded as present.",
      why: "These are recognised warning symptoms; flagged for review only.", evidenceRefs: refs(bleed), missing: ["Haemoglobin", "Anticoagulant/antiplatelet use"], action: "Clinician to assess and decide on investigation.",
    });
    const syn = has(symptoms, "syncope");
    if (syn.length) flag({
      ruleId: "rf-syncope", key: "syncope", urgency: "prompt_review", title: "Syncope / collapse documented",
      statement: "Potential warning sign: fainting or collapse is documented.", what: "Syncope, collapse or loss of consciousness is recorded as present.",
      why: "Transient loss of consciousness has several potentially serious causes; flagged for review only.", evidenceRefs: refs(syn), missing: ["Circumstances", "ECG"], action: "Clinician to assess.",
    });
    const fever = has(symptoms, "fever");
    const neck = has(symptoms, "neck_stiffness");
    if (fever.length && neck.length) flag({
      ruleId: "rf-fever-neck", key: "meningism", urgency: "immediate_review", title: "Fever with neck stiffness",
      statement: "Potential warning sign: fever and neck stiffness are documented together.", what: "Fever and neck stiffness are both recorded as present.",
      why: "The combination is a recognised warning pattern; flagged for review only.", evidenceRefs: [...refs(fever), ...refs(neck)], missing: ["Neurological examination", "Headache/photophobia status"], action: "Clinician to assess urgently.",
    });
  }

  // ---- lab-reported critical ranges (only when the lab supplied them) ----
  const latest = new Map();
  for (const inv of ctx.investigations) {
    if (!inv.numeric || !inv.unit || !inv.referenceRange) continue;
    const k = `${inv.key}|${inv.unitKey}`;
    if (!latest.has(k) || latest.get(k).t < inv.t) latest.set(k, inv);
  }
  for (const inv of latest.values()) {
    const r = inv.referenceRange;
    const low = r.criticalLow !== undefined && inv.value <= r.criticalLow;
    const high = r.criticalHigh !== undefined && inv.value >= r.criticalHigh;
    if (!low && !high) continue;
    flag({
      ruleId: "rf-lab-critical", key: inv.ref, urgency: "immediate_review", title: `${inv.name} in lab-reported critical range`,
      statement: `Potential warning sign: ${inv.name} ${inv.value} ${inv.unit} is beyond the critical limit supplied with the result.`,
      what: `${inv.name} is ${inv.value} ${inv.unit}, ${low ? `at or below the lab critical low of ${r.criticalLow}` : `at or above the lab critical high of ${r.criticalHigh}`}.`,
      why: "The critical limit was supplied by the laboratory with the result; this engine did not choose it.",
      evidenceRefs: [inv.ref], missing: ["Clinical context", "Repeat result if indicated"], action: "Clinician to review immediately per local critical-result policy.",
    });
  }
  return { findings, notEvaluated };
}
