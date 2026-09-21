// Part 4 — data minimisation before any external AI call. Removes the patient's name and replaces the identifier
// with a one-way pseudonym. LIMITATION: free-text fields (chief complaint, notes) are passed through and could
// contain identifiers typed by staff; external AI must therefore stay opt-in and disabled by default.
import { createHash } from "node:crypto";

export function deidentifyForAI(context) {
  const copy = structuredClone(context);
  const pseudonym = `P-${createHash("sha256").update(String(context.patient.id)).digest("hex").slice(0, 10)}`;
  copy.patient = { id: pseudonym, ...(copy.patient.ageYears !== undefined ? { ageYears: copy.patient.ageYears } : {}), ...(copy.patient.sex ? { sex: copy.patient.sex } : {}) };
  return copy;
}
