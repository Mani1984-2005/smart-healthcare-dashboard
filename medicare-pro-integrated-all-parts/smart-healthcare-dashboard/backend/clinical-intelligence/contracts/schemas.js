// Part 4 — Clinical Intelligence: standalone data contract (validated with zod).
//
// Design rules enforced here:
//  * Every object is .strict(): unknown keys are REJECTED. This blocks smuggled fields such as
//    reviewStatus / reviewedBy / approved from ever entering the pipeline.
//  * "Absent" and "none" are different things. Allergies, medications and history are wrapped in a
//    record list with an explicit status: documented | none_known | not_provided.
//    Missing data is therefore never silently treated as "no allergies" or "no medications".
//  * Units are preserved verbatim. Nothing in this module converts a stored unit.
import { z } from "zod";

export const LIMITS = Object.freeze({
  text: 5000,
  short: 300,
  name: 120,
  encounters: 50,
  symptoms: 60,
  examination: 60,
  investigations: 300,
  medications: 100,
  allergies: 50,
  history: 100,
});

export const KNOWN_ROLES = ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "LAB_TECHNICIAN", "PHARMACIST", "BILLING", "PATIENT"];
export const REVIEW_DECISIONS = ["accepted", "rejected", "modified"];

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

export function isValidClinicalDate(value) {
  const m = DATE_RE.exec(String(value));
  if (!m) return false;
  const [, y, mo, d, h = "00", mi = "00", s = "00"] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (year < 1900 || month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return false;
  return Number(h) <= 23 && Number(mi) <= 59 && Number(s) <= 59;
}

// Date-only and offset-less datetimes are interpreted as UTC so results never depend on server timezone.
export function toMillis(value) {
  const v = String(value);
  const hasTime = v.includes("T");
  const hasZone = /(Z|[+-]\d{2}:\d{2})$/.test(v);
  return Date.parse(hasTime && !hasZone ? `${v}Z` : v);
}

const text = (max = LIMITS.short) => z.string().trim().min(1, "must not be empty").max(max, `must be at most ${max} characters`);
const idString = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/, "must be 1-64 characters: letters, digits, _ . : -");
const dateString = z.string().trim().refine(isValidClinicalDate, "must be an ISO-8601 date (YYYY-MM-DD or YYYY-MM-DDTHH:mm[:ss][Z|±hh:mm])");

const vital = z.object({ value: z.number().finite(), unit: text(20).optional() }).strict();

export const vitalsSchema = z
  .object({
    temperature: vital.optional(),
    heartRate: vital.optional(),
    systolicBp: vital.optional(),
    diastolicBp: vital.optional(),
    respiratoryRate: vital.optional(),
    spo2: vital.optional(),
  })
  .strict();

export const symptomSchema = z
  .object({
    name: text(100),
    present: z.union([z.boolean(), z.literal("unknown")]),
    duration: text(100).optional(),
    severity: z.enum(["mild", "moderate", "severe"]).optional(),
  })
  .strict();

export const observationSchema = z
  .object({
    system: text(60).optional(),
    finding: text(500),
    abnormal: z.union([z.boolean(), z.literal("unknown")]).optional(),
  })
  .strict();

export const encounterSchema = z
  .object({
    id: idString,
    date: dateString,
    type: text(60).optional(),
    chiefComplaint: text(500).optional(),
    symptoms: z.array(symptomSchema).max(LIMITS.symptoms).default([]),
    vitals: vitalsSchema.optional(),
    examination: z.array(observationSchema).max(LIMITS.examination).default([]),
    notes: text(LIMITS.text).optional(),
    followUp: z.object({ date: dateString.optional(), instruction: text(500) }).strict().optional(),
  })
  .strict();

export const historySchema = z
  .object({
    kind: z.enum(["condition", "surgery", "family", "social", "risk_factor"]),
    text: text(300),
    since: text(40).optional(),
  })
  .strict();

export const medicationSchema = z
  .object({
    name: text(120),
    genericName: text(120).optional(),
    dose: text(60).optional(),
    frequency: text(60).optional(),
    route: text(40).optional(),
    startDate: dateString.optional(),
    stopDate: dateString.optional(),
    status: z.enum(["active", "stopped", "unknown"]),
  })
  .strict();

export const allergySchema = z
  .object({
    substance: text(120),
    reaction: text(200).optional(),
    severity: z.enum(["mild", "moderate", "severe", "unknown"]).optional(),
    category: z.enum(["drug", "food", "environmental", "unknown"]).optional(),
  })
  .strict();

const rangeSchema = z
  .object({
    low: z.number().finite().optional(),
    high: z.number().finite().optional(),
    criticalLow: z.number().finite().optional(),
    criticalHigh: z.number().finite().optional(),
    source: z.literal("lab_reported"), // ranges are only ever taken from the lab/record — never invented
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.low === undefined && r.high === undefined) {
      ctx.addIssue({ code: "custom", message: "referenceRange needs at least one of low/high" });
    }
    if (r.low !== undefined && r.high !== undefined && r.low > r.high) {
      ctx.addIssue({ code: "custom", message: "referenceRange low must not exceed high" });
    }
  });

export const investigationSchema = z
  .object({
    id: idString.optional(),
    name: text(LIMITS.name),
    value: z.union([z.number().finite(), text(80)]),
    unit: text(30).optional(),
    referenceRange: rangeSchema.optional(),
    collectedAt: dateString,
    status: z.enum(["final", "preliminary", "unknown"]).optional(),
  })
  .strict();

// A record list makes "not provided" explicit and structurally different from "none known".
function recordList(itemSchema, max) {
  return z
    .object({
      status: z.enum(["documented", "none_known", "not_provided"]),
      items: z.array(itemSchema).max(max).default([]),
    })
    .strict()
    .superRefine((v, ctx) => {
      if (v.status === "documented" && v.items.length === 0) {
        ctx.addIssue({ code: "custom", path: ["items"], message: "status 'documented' requires at least one item" });
      }
      if (v.status !== "documented" && v.items.length > 0) {
        ctx.addIssue({ code: "custom", path: ["items"], message: `status '${v.status}' must have no items` });
      }
    });
}

const notProvided = () => ({ status: "not_provided", items: [] });

export const contextSchema = z
  .object({
    schemaVersion: z.literal("1").default("1"),
    patient: z
      .object({
        id: idString,
        displayName: text(LIMITS.name).optional(),
        ageYears: z.number().int().min(0).max(130).optional(),
        sex: z.enum(["female", "male", "other", "unknown"]).optional(),
      })
      .strict(),
    encounters: z.array(encounterSchema).max(LIMITS.encounters).default([]),
    allergies: recordList(allergySchema, LIMITS.allergies).default(notProvided),
    medications: recordList(medicationSchema, LIMITS.medications).default(notProvided),
    history: recordList(historySchema, LIMITS.history).default(notProvided),
    investigations: z.array(investigationSchema).max(LIMITS.investigations).default([]),
  })
  .strict()
  .superRefine((ctx, zctx) => {
    const seen = new Set();
    ctx.encounters.forEach((e, i) => {
      if (seen.has(e.id)) zctx.addIssue({ code: "custom", path: ["encounters", i, "id"], message: "duplicate encounter id" });
      seen.add(e.id);
    });
  });

export const analyzeRequestSchema = z
  .object({
    patientId: idString.optional(),
    context: contextSchema.optional(),
    options: z.object({ useAI: z.boolean().optional() }).strict().optional(),
  })
  .strict()
  .refine((v) => Boolean(v.patientId) !== Boolean(v.context), { message: "Provide exactly one of patientId or context" });

// Note: the reviewer identity and timestamp are deliberately NOT part of this schema.
// They are derived server-side from the verified session — a client cannot claim to be a reviewer.
export const reviewRequestSchema = z
  .object({
    itemId: text(120),
    decision: z.enum(REVIEW_DECISIONS),
    note: text(1000).optional(),
    modifiedText: text(2000).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.decision === "rejected" && !v.note) ctx.addIssue({ code: "custom", path: ["note"], message: "a note explaining the rejection is required" });
    if (v.decision === "modified" && !v.modifiedText) ctx.addIssue({ code: "custom", path: ["modifiedText"], message: "modifiedText is required when decision is 'modified'" });
    if (v.decision !== "modified" && v.modifiedText) ctx.addIssue({ code: "custom", path: ["modifiedText"], message: "modifiedText is only allowed when decision is 'modified'" });
  });

export const sessionRequestSchema = z
  .object({
    role: z.enum(KNOWN_ROLES),
    displayName: text(80).optional(),
    hospitalId: idString.optional(),
  })
  .strict();
