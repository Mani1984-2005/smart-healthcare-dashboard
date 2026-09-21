// Regenerates the frontend UI-test fixtures from the REAL engine (so UI tests can never drift from the backend contract).
//   node clinical-intelligence/scripts/exportUiFixtures.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClinicalIntelligenceModule } from "../index.js";
import { loadConfig } from "../config.js";

const NOW = Date.parse("2026-09-20T00:00:00Z");
const actor = { id: "demo-fixture", role: "DOCTOR", name: "Dr. Fixture", hospitalId: "hospital-01" };
const mod = createClinicalIntelligenceModule({ config: loadConfig({ CLINICAL_DEMO_MODE: "true" }), forwardAudit: false, clock: () => NOW });

const out = { status: { success: true, demoMode: true, auth: "demo", ai: { provider: "mock" }, disclaimer: "Decision support only. Clinician review required." }, patients: await mod.service.listPatients(), contexts: {}, analyses: {} };
for (const p of out.patients) {
  out.contexts[p.id] = await mod.service.contextFor(p.id, actor);
  out.analyses[p.id] = { plain: mod.reviews.view(await mod.service.analyze({ patientId: p.id, useAI: false }, actor)), withAI: mod.reviews.view(await mod.service.analyze({ patientId: p.id, useAI: true }, actor)) };
}
const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../src/features/clinical-intelligence/__fixtures__/clinical.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out));
console.log(`wrote ${path.relative(process.cwd(), target)} (${Object.keys(out.analyses).length} patients)`);
process.exit(0);
