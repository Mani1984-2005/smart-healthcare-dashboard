// Part 4 — the AI safety gate. Model output is treated as UNTRUSTED. It is accepted only if it:
//   1. parses as JSON and matches a strict schema (unknown keys, e.g. reviewStatus/approved, are rejected)
//   2. cites only source references that actually exist in the supplied record
//   3. contains no definitive-diagnosis, prescriptive, or "clinician-approved" language
//   4. introduces no number that is absent from the supplied record (blocks fabricated values)
// Anything else is REJECTED — there is no "best effort" fallback and no invented replacement content.
import { z } from "zod";

const aiSchema = z.object({
  narrative: z.string().trim().min(1).max(2000),
  citedRefs: z.array(z.string().max(120)).min(1).max(60),
  considerations: z.array(z.object({
    condition: z.string().trim().min(1).max(120),
    supportingRefs: z.array(z.string().max(120)).min(1).max(20),
    missingInformation: z.array(z.string().trim().max(200)).max(10).default([]),
    reasoning: z.string().trim().min(1).max(600),
  }).strict()).max(5).default([]),
}).strict();

const DEFINITIVE = /\b(definitely|certainly|undoubtedly|conclusively|without (a )?doubt|100 ?%|confirmed diagnosis|diagnosis is confirmed|the diagnosis is|diagnosed as|patient (definitely )?has)\b/i;
const PRESCRIPTIVE = /\b(prescribe|start (the patient|him|her|them|on)|initiate|administer|increase the dose|decrease the dose|reduce the dose|stop (taking|the)|discontinue|give \d)/i;
const APPROVAL = /\b(physician|clinician|doctor)[- ]approved\b|\bapproved by\b|\bverified by (a |the )?(physician|clinician|doctor)\b|\bclinically validated\b/i;

export const AI_REJECTION = Object.freeze({
  MALFORMED: "MALFORMED", SCHEMA: "SCHEMA", UNKNOWN_REF: "UNKNOWN_REF", DEFINITIVE_LANGUAGE: "DEFINITIVE_LANGUAGE",
  PRESCRIPTIVE_LANGUAGE: "PRESCRIPTIVE_LANGUAGE", APPROVAL_CLAIM: "APPROVAL_CLAIM", UNGROUNDED_NUMBER: "UNGROUNDED_NUMBER",
});

const numbersIn = (s) => String(s).match(/\d+(?:\.\d+)?/g) ?? [];

export function validateAIResponse(raw, { allowedRefs, context }) {
  const reject = (code) => ({ ok: false, code });
  let data = raw;
  if (typeof raw === "string") {
    if (raw.length > 20000) return reject(AI_REJECTION.MALFORMED);
    const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { data = JSON.parse(stripped); } catch { return reject(AI_REJECTION.MALFORMED); }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return reject(AI_REJECTION.MALFORMED);

  const parsed = aiSchema.safeParse(data);
  if (!parsed.success) return reject(AI_REJECTION.SCHEMA);
  const v = parsed.data;

  const refs = [...v.citedRefs, ...v.considerations.flatMap((c) => c.supportingRefs)];
  if (refs.some((r) => !allowedRefs.has(r))) return reject(AI_REJECTION.UNKNOWN_REF);

  const texts = [v.narrative, ...v.considerations.flatMap((c) => [c.condition, c.reasoning, ...c.missingInformation])];
  if (texts.some((t) => DEFINITIVE.test(t))) return reject(AI_REJECTION.DEFINITIVE_LANGUAGE);
  if (texts.some((t) => PRESCRIPTIVE.test(t))) return reject(AI_REJECTION.PRESCRIPTIVE_LANGUAGE);
  if (texts.some((t) => APPROVAL.test(t))) return reject(AI_REJECTION.APPROVAL_CLAIM);

  const known = new Set(numbersIn(JSON.stringify(context)));
  const free = [v.narrative, ...v.considerations.map((c) => c.reasoning)];
  if (free.some((t) => numbersIn(t).some((n) => !known.has(n)))) return reject(AI_REJECTION.UNGROUNDED_NUMBER);

  return { ok: true, value: v };
}
