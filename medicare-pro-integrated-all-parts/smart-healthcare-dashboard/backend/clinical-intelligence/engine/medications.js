// Part 4 — medication & allergy checks. Output is always framed as "Review required".
// This module never prescribes, changes, or recommends a dose. Checks that cannot run because information is
// missing are reported explicitly as NOT PERFORMED — absence of a warning is never presented as safety.
import { ALLERGY_CLASS_ALIASES, ALLERGY_RELATED_CLASSES, DUPLICATION_CLASSES, INTERACTIONS, EGFR_UNIT_ALIASES } from "../data/referenceData.js";
import { classesOf, unitKey } from "./normalize.js";
import { makeFinding } from "./explain.js";

const RULE_NOTE = "Curated demo rule set — not a clinically validated formulary. Verify against a licensed interaction database and local protocols.";
const EGFR_UNITS = EGFR_UNIT_ALIASES.map(unitKey);

function sideMatches(spec, med) {
  return spec.startsWith("class:") ? med.classes.includes(spec.slice(6)) : med.ingredients.includes(spec);
}

export function checkMedications(ctx) {
  const findings = [];
  const performed = { allergy: false, interaction: false, duplicate: false, completeness: false, renal: false };
  const notPerformed = [];
  const add = (o) => findings.push(makeFinding({ kind: "medication", category: "Medication safety", ...o }));

  const medsDocumented = ctx.medicationsStatus === "documented";
  const allergyKnown = ctx.allergiesStatus !== "not_provided";
  const active = ctx.medications.filter((m) => m.active);

  if (!medsDocumented) {
    const why = ctx.medicationsStatus === "none_known" ? "The record states no medications are taken." : "No medication list was provided.";
    ["allergy conflict", "interaction", "duplicate-medication", "medication-completeness", "renal-dose"].forEach((c) => notPerformed.push({ check: c, reason: why }));
  } else {
    // ---- allergy conflicts ----
    if (!allergyKnown) notPerformed.push({ check: "allergy conflict", reason: "Allergy status was not provided, so medications could not be checked against allergies. This is not the same as 'no allergies'." });
    else {
      performed.allergy = true;
      for (const allergy of ctx.allergies.filter((a) => !a.category || a.category === "drug" || a.category === "unknown")) {
        const allergyClass = ALLERGY_CLASS_ALIASES[allergy.norm] ?? classesOf([allergy.norm])[0] ?? null;
        for (const med of active) {
          let level = null;
          if (med.ingredients.includes(allergy.norm) || med.name.toLowerCase().trim() === allergy.norm) level = "exact";
          else if (allergyClass && med.classes.includes(allergyClass)) level = "class";
          else if (allergyClass && (ALLERGY_RELATED_CLASSES[allergyClass] ?? []).some((c) => med.classes.includes(c))) level = "related";
          if (!level) continue;
          const related = level === "related";
          add({
            ruleId: "med-allergy-conflict", key: `${allergy.ref}|${med.ref}`, severity: related ? "moderate" : "high",
            title: `${related ? "Possible allergy cross-reactivity" : "Documented allergy conflict"}: ${med.name}`,
            statement: `Review required: ${med.name} is an active medication and ${allergy.substance} allergy is documented (${level === "exact" ? "same drug" : level === "class" ? "same drug class" : "related drug class"}).`,
            what: `${med.name} (${med.status}) ${level === "exact" ? "matches" : level === "class" ? "belongs to the same class as" : "belongs to a class related to"} the documented allergy to ${allergy.substance}${allergy.reaction ? ` (reaction: ${allergy.reaction})` : ""}.`,
            why: `Name/class matching against the documented allergy. ${related ? "Cross-reactivity between these classes is possible but its degree depends on the agent and reaction history. " : ""}${RULE_NOTE}`,
            evidenceRefs: [allergy.ref, med.ref], missing: ["Confirmation the allergy history is accurate", "Whether the patient has tolerated this drug before"],
            action: "Prescriber to review this medication against the documented allergy before the next dose. This system does not change the prescription.",
          });
        }
      }
    }

    // ---- interactions ----
    performed.interaction = true;
    const seenPairs = new Set();
    for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) for (const rule of INTERACTIONS) {
      const fwd = sideMatches(rule.a, active[i]) && sideMatches(rule.b, active[j]);
      const rev = sideMatches(rule.a, active[j]) && sideMatches(rule.b, active[i]);
      if (!fwd && !rev) continue;
      const k = `${rule.id}|${active[i].ref}|${active[j].ref}`;
      if (seenPairs.has(k)) continue;
      seenPairs.add(k);
      add({
        ruleId: `med-interaction-${rule.id}`, key: k, severity: rule.severity,
        title: `Potential interaction: ${active[i].name} + ${active[j].name}`,
        statement: `Review required: ${active[i].name} and ${active[j].name} are both active and appear in an interaction rule.`,
        what: `${active[i].name} and ${active[j].name} are listed together as active medications.`,
        why: `${rule.rationale} ${RULE_NOTE}`,
        evidenceRefs: [active[i].ref, active[j].ref], missing: ["Doses, timing and monitoring already in place", "Patient-specific risk factors"],
        action: "Prescriber/pharmacist to review the combination and monitoring. This system does not change the prescription.",
      });
    }

    // ---- duplicates ----
    performed.duplicate = true;
    const byIngredient = new Map();
    for (const m of active) for (const ing of m.ingredients) byIngredient.set(ing, [...(byIngredient.get(ing) ?? []), m]);
    const dupIng = new Set();
    for (const [ing, list] of byIngredient) {
      if (list.length < 2) continue;
      dupIng.add(ing);
      const doses = new Set(list.map((m) => m.dose ?? "(no dose)"));
      add({
        ruleId: "med-duplicate-ingredient", key: ing, severity: doses.size > 1 ? "moderate" : "low",
        title: `${ing} listed more than once`, statement: `Review required: the same active ingredient (${ing}) appears in ${list.length} medication entries.`,
        what: `${list.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}`).join(" and ")} both contain ${ing}.`,
        why: `Identical ingredient in more than one active entry may be a duplicate or an inconsistent record${doses.size > 1 ? " (the doses differ)" : ""}.`,
        evidenceRefs: list.map((m) => m.ref), missing: ["Which entry is current"], action: "Prescriber to reconcile the medication list.",
      });
    }
    for (const cls of DUPLICATION_CLASSES) {
      const inClass = active.filter((m) => m.classes.includes(cls));
      const distinct = new Set(inClass.flatMap((m) => m.ingredients.filter((i) => classesOf([i]).includes(cls))));
      if (distinct.size < 2 || [...distinct].every((d) => dupIng.has(d))) continue;
      add({
        ruleId: "med-duplicate-class", key: cls, severity: "moderate",
        title: `Possible therapeutic duplication (${cls.replace("_", " ")})`, statement: `Review required: more than one active ${cls.replace("_", " ")} is listed.`,
        what: `${inClass.map((m) => m.name).join(" and ")} are both ${cls.replace("_", " ")} agents.`,
        why: `Two agents of the same class are active at once. ${RULE_NOTE}`,
        evidenceRefs: inClass.map((m) => m.ref), missing: ["Whether concurrent use is intentional"], action: "Prescriber to confirm whether both agents are intended.",
      });
    }

    // ---- completeness ----
    performed.completeness = true;
    for (const m of ctx.medications.filter((x) => x.active && (!x.dose || !x.frequency || x.status === "unknown"))) {
      const gaps = [!m.dose && "dose", !m.frequency && "frequency", m.status === "unknown" && "active/stopped status"].filter(Boolean);
      add({
        ruleId: "med-incomplete-record", key: m.ref, severity: "low", title: `Incomplete medication record: ${m.name}`,
        statement: `Review required: ${m.name} is missing ${gaps.join(", ")}.`, what: `${m.name} was entered without ${gaps.join(", ")}.`,
        why: "Incomplete entries limit every downstream check (duplicates, interactions, dosing review).",
        evidenceRefs: [m.ref], missing: gaps, action: "Complete the medication entry.",
      });
    }

    // ---- renal: metformin vs latest eGFR (product labelling thresholds) ----
    if (active.some((m) => m.ingredients.includes("metformin"))) {
      const egfrs = ctx.investigations.filter((r) => r.key === "egfr" && r.numeric).sort((a, b) => b.t - a.t);
      const latest = egfrs[0];
      if (!latest) notPerformed.push({ check: "renal-dose (metformin)", reason: "No numeric eGFR result is available." });
      else if (!latest.unit || !EGFR_UNITS.includes(latest.unitKey)) notPerformed.push({ check: "renal-dose (metformin)", reason: "eGFR unit is missing or not mL/min/1.73 m²; not evaluated." });
      else {
        performed.renal = true;
        const met = active.find((m) => m.ingredients.includes("metformin"));
        if (latest.value < 45) add({
          ruleId: "med-metformin-egfr", key: latest.ref, severity: latest.value < 30 ? "high" : "moderate",
          title: `Metformin with reduced eGFR (${latest.value} ${latest.unit})`,
          statement: `Review required: metformin is active and the latest eGFR is ${latest.value} ${latest.unit}.`,
          what: `Metformin is active and eGFR was ${latest.value} ${latest.unit} on ${latest.collectedAt.slice(0, 10)}.`,
          why: `Product labelling advises against metformin when eGFR is below 30 and recommends benefit-risk assessment when it falls below 45. ${RULE_NOTE}`,
          evidenceRefs: [met.ref, latest.ref], missing: ["Trend and cause of reduced eGFR", "Other renal risk factors"],
          action: "Prescriber to review metformin against current renal function. This system does not change the prescription.",
        });
      }
    }
  }
  return { performed, notPerformed, findings };
}
