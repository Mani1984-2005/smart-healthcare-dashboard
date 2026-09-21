import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngines, scenario, ids } from "./helpers.js";

const withMeds = (base, meds, allergies) => {
  const c = scenario(base);
  c.medications = { status: "documented", items: meds };
  if (allergies) c.allergies = allergies;
  return c;
};
const M = (name, extra = {}) => ({ name, dose: "10 mg", frequency: "once daily", status: "active", ...extra });

test("scenario 3: documented penicillin allergy conflicts with amoxicillin (high, 'Review required')", () => {
  const { med } = runEngines(scenario("CI-DEMO-003"));
  const f = med.findings.find((x) => x.ruleId === "med-allergy-conflict");
  assert.ok(f); assert.equal(f.severity, "high");
  assert.match(f.statement, /^Review required/);
  assert.match(f.explanation.action, /does not change the prescription/);
});

test("scenario 3: warfarin + NSAIDs interactions, NSAID duplication and incomplete paracetamol entry", () => {
  const { med } = runEngines(scenario("CI-DEMO-003"));
  assert.equal(med.findings.filter((f) => f.ruleId === "med-interaction-warfarin-nsaid").length, 2);
  assert.ok(ids(med.findings).includes("med-duplicate-class"));
  const inc = med.findings.find((f) => f.ruleId === "med-incomplete-record");
  assert.match(inc.title, /Paracetamol/);
  assert.deepEqual(inc.explanation.missing.sort(), ["active/stopped status", "dose", "frequency"].sort());
});

test("brand names resolve to ingredients (Augmentin vs penicillin allergy)", () => {
  const c = withMeds("CI-DEMO-001", [M("Augmentin")], { status: "documented", items: [{ substance: "Penicillin", category: "drug" }] });
  assert.ok(ids(runEngines(c).med.findings).includes("med-allergy-conflict"));
});

test("exact-ingredient and class-level allergy matches; related class is only 'moderate'", () => {
  const exact = runEngines(withMeds("CI-DEMO-001", [M("Ibuprofen")], { status: "documented", items: [{ substance: "Ibuprofen" }] })).med.findings.find((f) => f.ruleId === "med-allergy-conflict");
  assert.match(exact.statement, /same drug/);
  const cls = runEngines(withMeds("CI-DEMO-001", [M("Diclofenac")], { status: "documented", items: [{ substance: "NSAIDs" }] })).med.findings.find((f) => f.ruleId === "med-allergy-conflict");
  assert.match(cls.statement, /same drug class/); assert.equal(cls.severity, "high");
  const rel = runEngines(withMeds("CI-DEMO-001", [M("Cefuroxime")], { status: "documented", items: [{ substance: "Penicillin" }] })).med.findings.find((f) => f.ruleId === "med-allergy-conflict");
  assert.equal(rel.severity, "moderate"); assert.match(rel.title, /cross-reactivity/);
});

test("food/environmental allergies are not matched against drugs", () => {
  const c = withMeds("CI-DEMO-001", [M("Amoxicillin")], { status: "documented", items: [{ substance: "Penicillin", category: "food" }] });
  assert.ok(!ids(runEngines(c).med.findings).includes("med-allergy-conflict"));
});

test("stopped medications are ignored by conflict/interaction checks", () => {
  const c = withMeds("CI-DEMO-001", [M("Warfarin"), M("Ibuprofen", { status: "stopped" })]);
  assert.ok(!ids(runEngines(c).med.findings).some((r) => r.startsWith("med-interaction")));
});

test("allergy status 'not_provided': allergy check is NOT performed and says it is not 'no allergies'", () => {
  const c = withMeds("CI-DEMO-001", [M("Amoxicillin")], { status: "not_provided", items: [] });
  const { med } = runEngines(c);
  assert.equal(med.performed.allergy, false);
  assert.ok(!ids(med.findings).includes("med-allergy-conflict"));
  assert.match(med.notPerformed.find((x) => x.check === "allergy conflict").reason, /not the same as 'no allergies'/);
});

test("allergy status 'none_known': check is performed and finds nothing", () => {
  const { med } = runEngines(withMeds("CI-DEMO-001", [M("Amoxicillin")]));
  assert.equal(med.performed.allergy, true);
  assert.ok(!ids(med.findings).includes("med-allergy-conflict"));
});

test("medication list not provided: no medication check is performed and each is reported as not performed", () => {
  const { med } = runEngines(scenario("CI-DEMO-004"));
  assert.deepEqual(med.findings, []);
  assert.equal(Object.values(med.performed).some(Boolean), false);
  assert.ok(med.notPerformed.length >= 4);
});

test("interaction table: statin/macrolide, ACEi/K-sparing, SSRI/tramadol, nitrate/sildenafil, opioid/benzodiazepine", () => {
  const has = (meds, id) => ids(runEngines(withMeds("CI-DEMO-001", meds.map((n) => M(n)))).med.findings).includes(`med-interaction-${id}`);
  assert.ok(has(["Simvastatin", "Clarithromycin"], "simvastatin-clarithromycin"));
  assert.ok(has(["Lisinopril", "Spironolactone"], "acei-potassium-sparing"));
  assert.ok(has(["Sertraline", "Tramadol"], "ssri-tramadol"));
  assert.ok(has(["Sildenafil", "Isosorbide mononitrate"], "sildenafil-nitrate"));
  assert.ok(has(["Codeine", "Diazepam"], "opioid-benzodiazepine"));
  assert.ok(!has(["Paracetamol", "Amlodipine"], "simvastatin-amlodipine"));
});

test("same ingredient listed twice is flagged; differing doses raise severity to moderate", () => {
  const f = runEngines(withMeds("CI-DEMO-001", [M("Metformin", { dose: "500 mg" }), M("Metformin", { dose: "1000 mg" })])).med.findings.find((x) => x.ruleId === "med-duplicate-ingredient");
  assert.equal(f.severity, "moderate");
  const g = runEngines(withMeds("CI-DEMO-001", [M("Ibuprofen"), M("Combiflam")])).med.findings.find((x) => x.ruleId === "med-duplicate-ingredient");
  assert.match(g.title, /ibuprofen/);
});

test("metformin + eGFR: <30 high, 30–44 moderate, ≥45 none; wrong unit / no eGFR => not performed", () => {
  const egfr = (v, unit = "mL/min/1.73 m²") => {
    const c = scenario("CI-DEMO-002");
    c.investigations = [{ name: "eGFR", value: v, unit, collectedAt: "2026-09-10" }];
    return runEngines(c).med;
  };
  assert.equal(egfr(26).findings.find((f) => f.ruleId === "med-metformin-egfr").severity, "high");
  assert.equal(egfr(38).findings.find((f) => f.ruleId === "med-metformin-egfr").severity, "moderate");
  assert.ok(!ids(egfr(72).findings).includes("med-metformin-egfr"));
  assert.ok(egfr(26, "mL/min").notPerformed.some((x) => x.check.startsWith("renal")));
  const c = scenario("CI-DEMO-002"); c.investigations = [];
  assert.ok(runEngines(c).med.notPerformed.some((x) => x.check.startsWith("renal")));
});

test("scenario 2 metformin finding uses the LATEST eGFR (26), not the older 48", () => {
  const f = runEngines(scenario("CI-DEMO-002")).med.findings.find((x) => x.ruleId === "med-metformin-egfr");
  assert.match(f.title, /26/);
});

test("every medication finding is framed as review-required and never instructs a change", () => {
  for (const id of ["CI-DEMO-002", "CI-DEMO-003", "CI-DEMO-005"]) {
    for (const f of runEngines(scenario(id)).med.findings) {
      assert.match(f.statement, /^Review required/);
      assert.equal(f.reviewRequired, true);
      assert.doesNotMatch(`${f.statement} ${f.explanation.action}`, /\b(prescribe|discontinue|stop taking|increase the dose|reduce the dose)\b/i);
    }
  }
});
