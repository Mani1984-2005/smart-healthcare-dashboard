// backend/integration/intakeToClinicalIntelligenceProvider.js
//
// This file is deliberately OUTSIDE backend/clinical-intelligence/ (Part 4's
// own directory), even though it implements Part 4's own documented
// extension interface (contextProvider.js: "any future data source...
// implement { name, list(), get(patientId) }"). Part 4 ships an automated
// independence test (clinical-intelligence/__tests__/safety.test.js,
// "INDEPENDENCE: the module imports only from itself...") that scans every
// non-test .js file under clinical-intelligence/ and fails if it statically
// imports outside the module, or even mentions another SIH part by name.
// That invariant is a genuine, tested safety property of Part 4's own
// delivery ("no runtime dependency on any other MediCare Pro module"), so
// this integration keeps it intact rather than editing the test to allow an
// exception. Living here, as ordinary integration glue between two modules,
// respects that boundary completely: Part 4's own directory is unmodified
// by this file's existence, and Part 4 only ever sees this provider if
// server.js explicitly opts in via `createClinicalIntelligenceRouter({
// contextProvider })` (see server.js).
//
// Part 1 -> Part 4 integration boundary. Like intakeRecordAdapter.js
// (Part 1 -> Part 5, backend/services/physicianWorkspace/) and
// realRecordSource.js (Part 1 -> Part 6, backend/part6/adapters/), this is a
// COMPOSITE provider: it wraps Part 4's own DemoContextProvider so the six
// synthetic demo patients keep working unmodified, and adds real, completed
// Part 1 intake sessions on top, reachable by `INTAKE-<sessionId>` (the
// same case id intakeRecordAdapter.js already uses for Part 5, so the same
// session is addressable the same way across both bridges).
//
// SCOPE, AND WHAT IS DELIBERATELY LEFT OUT (never fabricated):
// - patient.ageYears / patient.sex: the intake module does not capture
//   demographics as coded fields (confirmed in the Part 5 bridge already)
//   -> left undefined (both optional in Part 4's schema), never guessed.
// - encounters[0].symptoms: Part 4's symptomSchema needs a named symptom
//   with an explicit present:true|false|"unknown" tri-state. The intake's
//   chief complaint is one free-text statement, not a structured list of
//   named symptoms each explicitly affirmed or denied - inventing symptom
//   names to populate this array would be fabricating structured data from
//   unstructured text, which is exactly what this whole integration has
//   avoided doing. Left as an empty array; the actual complaint is carried
//   verbatim in encounters[0].chiefComplaint instead, which Part 4's
//   engines and UI already display as free text.
// - investigations: the intake module does not collect lab/investigation
//   data (patient self-report intake only, confirmed in the Part 5 bridge)
//   -> left as an empty array.
// - Part 3 document evidence (optional, see IntakeContextProvider.setPart3Store
//   below): appended to encounters[0].notes as clearly-labeled OCR text from
//   documents whose OCR has actually completed for this patient — never
//   turned into a coded `investigations[]` entry. Part 4's
//   investigationSchema requires `referenceRange.source: "lab_reported"`,
//   which would assert a trustworthiness Part 3's own README explicitly
//   disclaims ("rule-based... does not diagnose"); stacking one unverified
//   extraction pipeline's output on top of another's as if it were a lab
//   value is exactly the kind of fabricated certainty this integration has
//   avoided everywhere else. Free-text evidence in `notes` is Part 4's own
//   existing free-text field — no schema change was needed for this.
// - medications: the intake module captures only free-text medication
//   names, with no dose/frequency/status. Each is mapped with
//   status:"unknown" (Part 4's own enum for "we don't know"), never
//   guessed as "active".
// - allergies / history record-list "status": mapped from the intake
//   module's own DENIED/REPORTED/UNKNOWN provenance status to Part 4's
//   documented/none_known/not_provided - the same three-way distinction
//   the intake module already makes, not a new one invented here.
//
// intakeService is loaded dynamically (not statically imported) so that
// backend/clinical-intelligence/ itself never needs to reference it, and so
// that Part 4 keeps working normally even if this file, or the module it
// loads, is ever removed.
let intakeServicePromise = null;
function loadIntakeService() {
  intakeServicePromise ??= import("../services/intakeService.js");
  return intakeServicePromise;
}

import { DemoContextProvider } from "../clinical-intelligence/providers/contextProvider.js";

const INTAKE_CASE_PREFIX = "INTAKE-";
const PAST_OCR = new Set(["OCR_COMPLETED", "EXTRACTED", "ON_TIMELINE"]);

function allergyRecordList(historyAllergies) {
  const items = (historyAllergies?.items || []).map((i) => ({ substance: String(i.substance).slice(0, 120) }));
  if (historyAllergies?.status === "DENIED") return { status: "none_known", items: [] };
  if (items.length > 0) return { status: "documented", items };
  return { status: "not_provided", items: [] }; // REPORTED-but-empty or UNKNOWN: never claim "none known"
}

function medicationRecordList(medicationFacts) {
  const items = (medicationFacts || []).map((f) => ({ name: String(f.value).slice(0, 120), status: "unknown" }));
  return items.length > 0 ? { status: "documented", items } : { status: "not_provided", items: [] };
}

/**
 * Combines Part 1's pastMedicalHistory (kind: condition), familyHistory
 * (kind: family) and personalSocialHistory (kind: social) into Part 4's
 * single `history` record list. Each retains which Part 1 section it came
 * from via `kind`, so nothing is collapsed into an undifferentiated blob.
 */
function historyRecordList(history) {
  const items = [
    ...(history.pastMedicalHistory || []).map((f) => ({ kind: "condition", text: String(f.value).slice(0, 300) })),
    ...(history.pastSurgicalHistory || []).map((f) => ({ kind: "surgery", text: String(f.value).slice(0, 300) })),
    ...(history.familyHistory || []).map((f) => ({ kind: "family", text: String(f.value).slice(0, 300) })),
    ...Object.entries(history.personalSocialHistory || {}).map(([k, f]) => ({
      kind: "social",
      text: `${k}: ${f.value}`.slice(0, 300),
    })),
  ];
  return items.length > 0 ? { status: "documented", items } : { status: "not_provided", items: [] };
}

/**
 * Transforms one completed Part 1 session + ClinicalHistory into Part 4's
 * ClinicalPatientContext shape (contracts/schemas.js `contextSchema`). Part
 * 4 itself re-validates this with `contextSchema.parse` before any engine
 * runs, so a mapping error here fails loudly (422) rather than silently
 * passing bad data through.
 *
 * @param {{title:string,text:string}[]} [documentEvidence] Part 3 -> Part 4
 *   bridge: plain-text OCR excerpts from this patient's completed-OCR
 *   documents (see IntakeContextProvider.setPart3Store), appended to the
 *   encounter's free-text `notes`, clearly labeled as document/OCR-derived.
 *   Omitted entirely when Part 3 isn't configured or has no such documents.
 */
export function mapClinicalHistoryToContext({ session, history }, documentEvidence = []) {
  const intakeNotes = Object.keys(history.historyOfPresentIllness || {}).length
    ? Object.entries(history.historyOfPresentIllness)
        .map(([k, f]) => `${k}: ${f.value}`)
        .join("; ")
    : null;
  const evidenceNotes = documentEvidence.map((d) => `[Document — OCR text, unverified: ${d.title}] ${d.text}`);
  const notes = [intakeNotes, ...evidenceNotes].filter(Boolean).join("\n") || undefined;

  return {
    schemaVersion: "1",
    patient: { id: session.patientId },
    encounters: [
      {
        id: `intake-${session.id}`,
        date: session.completedAt ?? session.startedAt,
        type: "AI clinical intake",
        chiefComplaint: history.chiefComplaint?.value,
        symptoms: [],
        examination: [],
        notes,
      },
    ],
    allergies: allergyRecordList(history.allergies),
    medications: medicationRecordList(history.medications),
    history: historyRecordList(history),
    investigations: [],
  };
}

/**
 * @param {DemoContextProvider} [baseProvider] Defaults to Part 4's own demo provider.
 */
export class IntakeContextProvider {
  constructor(baseProvider = new DemoContextProvider()) {
    this.name = "intake+demo";
    this.origin = "mixed";
    this.base = baseProvider;
    this.part3Store = null;
  }

  /**
   * Part 3 -> Part 4 bridge entry point, called once from server.js after
   * Part 3 mounts (same "configure after construction" pattern as
   * services/physicianWorkspace/part3DocumentsAdapter.js). Optional: if
   * never called, contexts are built exactly as before this pass.
   */
  setPart3Store(store) {
    this.part3Store = store;
  }

  /** Demo scenarios only — real intake sessions are not enumerated (no "list all patients with a completed
   * intake" query in this pass; each is reachable by id once its `INTAKE-<sessionId>` id is known, e.g. from
   * the Part 5 bridge or the kiosk staff flow), matching the same limitation documented for the Part 1 -> Part 5
   * and Part 1 -> Part 6 bridges. */
  async list() {
    return this.base.list();
  }

  async get(patientId) {
    const demo = await this.base.get(patientId);
    if (demo) return demo;

    if (!patientId?.startsWith(INTAKE_CASE_PREFIX)) return null;
    const sessionId = patientId.slice(INTAKE_CASE_PREFIX.length);
    let exported;
    try {
      const intakeService = await loadIntakeService();
      exported = await intakeService.exportSession(sessionId);
    } catch {
      return null; // unknown session id, intake module unavailable, or no live DB in this environment -> not found, never fabricated
    }
    const { session, history } = exported;
    if (!session || session.status !== "COMPLETED" || !history) return null; // only completed sessions, per Part 1 -> Part 5's same rule
    const documentEvidence = this.#collectDocumentEvidence(session.patientId);
    return mapClinicalHistoryToContext({ session, history }, documentEvidence);
  }

  /** Completed-OCR document text for this patient, or [] if Part 3 isn't configured or has none. Never throws. */
  #collectDocumentEvidence(patientId) {
    if (!this.part3Store) return [];
    try {
      const { items } = this.part3Store.listDocuments({ patientId, limit: 50 });
      return items
        .filter((doc) => PAST_OCR.has(doc.status))
        .map((doc) => {
          const ocr = this.part3Store.getOcrResult(doc.id);
          return ocr?.text ? { title: `${doc.docType} — ${doc.originalFilename}`, text: ocr.text } : null;
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}
