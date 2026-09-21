// backend/part6/adapters/realRecordSource.js
//
// Part 1 -> Part 6 integration boundary (RecordSource contract, see
// ./recordSource.js). This is the ONLY file that lets Part 6 see data from
// any other MediCare Pro module — Part 6's own services never import Part 1
// directly, exactly as documented in createPart6.js ("Part 6 imports
// NOTHING from any other MediCare Pro module... swap for an adapter to
// integrate another system").
//
// This is a COMPOSITE source: it wraps a base RecordSource (normally Part
// 6's own createDemoRecordSource) and adds real data on top, so nothing
// Part 6 already ships (its seeded demo patients, orgs, practitioners,
// consents) is removed or altered. Real and demo patients coexist, each
// reachable by their own id.
//
// ---------------------------------------------------------------------------
// SCOPE OF WHAT IS BRIDGED, AND WHY NOT MORE (see
// docs/SIH_PARTS_1_2_5_6_INTEGRATION.md, "Part 1 -> Part 6" for the full
// writeup):
//
// - getPatient / listPatients: bridged. A real patient's identity (id, name)
//   comes from the same `patients` table Part 1 already validates
//   `patientId` against. `gender` and `birthDate` are left undefined rather
//   than guessed (Part 1 does not capture demographics as coded FHIR-ready
//   fields), and `custodianOrgId` is left undefined (see below).
//
// - getClinicalRecords: bridged, but ONLY as a `document`-type record (FHIR
//   DocumentReference, see fhir/mappers.js `mapDocument`) — a plain-text
//   rendering of the patient's real, completed Part 1 ClinicalHistory. This
//   is the one record type in Part 6's TYPE_MAPPERS that requires no
//   clinical coding. It is NOT mapped into `condition` / `medication` /
//   `observation` / `allergy` FHIR resources, because those require SNOMED
//   CT / LOINC coded terminology (see the seeded demo records in
//   seed/demoData.js) that Part 1's free-text, patient-reported intake does
//   not produce and this integration pass is not authorized to invent —
//   fabricating a diagnosis/medication code from unstructured patient text
//   would be exactly the "diagnosis" / "AI_DERIVED-to-CONFIRMED" line this
//   whole integration has been careful not to cross, and is squarely Part
//   4 "Clinical Intelligence" territory, which is out of scope here.
//
// - getOrganization / listOrganizations / getPractitioner / getIdentityLink:
//   NOT bridged — delegated to the base (demo) source only. A real Part 1
//   patient therefore has no `custodianOrgId`, which means Part 6's own
//   `requireCustodianOf` check (fhirService.js) will correctly DENY any
//   FHIR-generation request for a bridged real patient with
//   code NOT_CUSTODIAN, rather than silently granting access. This is the
//   correct, fail-closed outcome per the integration brief's own instruction
//   not to bypass authorization to make a demo work — but it does mean FHIR
//   generation for a bridged real patient does not yet functionally work
//   end-to-end. Assigning real patients to a Part 6 organisation (or
//   otherwise deciding how custodianship works for non-demo patients) is an
//   authorization-model decision, explicitly out of scope for this pass
//   ("Do NOT solve the broader authentication problem in this task").
// ---------------------------------------------------------------------------

// - Part 6's RecordSource contract is SYNCHRONOUS everywhere it is called
//   (fhirService.mapPatientRecord, requireCustodianOf, etc. call
//   `source.getPatient(id)` and use the result directly, without awaiting).
//   Part 1's own data access is Postgres-backed and inherently asynchronous.
//   This file's getPatient/getClinicalRecords are therefore async and are
//   NOT drop-in compatible with `createPart6({ source })` as written today —
//   plugging this in directly would hand Part 6's synchronous call sites an
//   unawaited Promise instead of data. Making it synchronous would need
//   either a pre-fetched/cached snapshot layer (a real design decision: how
//   fresh, refreshed when, cache-invalidated how) or making Part 6's core
//   async (a rewrite of Part 6 — explicitly out of scope). This module is
//   therefore exercised directly by its own tests as a working, correct
//   bridge at the data-access level, but is INTENTIONALLY NOT wired into
//   createPart6's default `source` in this pass — see the integration doc's
//   "Part 1 -> Part 6" section for this and the custodianOrgId gap above,
//   both flagged as conflicts requiring a decision rather than silently
//   resolved.
// - Part 3 documents/OCR: bridged the same way as Part 1's synthesized
//   document above — one `document`-type record per Part 3 document that
//   has SUCCESSFULLY completed OCR (status OCR_COMPLETED, EXTRACTED or
//   ON_TIMELINE), carrying the OCR text verbatim. A document still
//   UPLOADED, mid-OCR, or with OCR_FAILED/OCR_EMPTY is never included —
//   there is no text to show, and including a placeholder would misrepresent
//   an unread document as a record. Only Part 3's own OCR text is used;
//   Part 3's extracted entities (medications/diagnoses/labs) are NOT mapped
//   into coded FHIR resources for the same reason Part 1's data isn't (see
//   above) — that mapping is Part 3's own extraction pipeline's rule-based
//   guess at structure, not a validated clinical code.
// ---------------------------------------------------------------------------

import pool from "../../db.js";
import * as intakeService from "../../services/intakeService.js";

function part3DocumentToRecord(doc, ocrResult) {
  return {
    id: `DOC-P3-${doc.id}`,
    type: "document",
    patientId: doc.patientId,
    typeCode: "34133-9",
    typeDisplay: "Summarization of episode note",
    title: `${doc.docType || "Medical document"} — ${doc.originalFilename}`,
    date: doc.uploadedAt,
    authorId: null,
    encounterId: null,
    text: [
      `Source: Part 3 Medical Documents & OCR — document ${doc.id} (${doc.origin === "SYNTHETIC_FIXTURE" ? "synthetic demo document" : "uploaded document"}).`,
      "OCR-extracted text, unverified by a clinician. See Part 3's own audit trail for provenance.",
      "",
      ocrResult.text,
    ].join("\n"),
  };
}

function renderClinicalHistoryAsText(history) {
  const factLine = (label, fact) => (fact ? `${label}: ${fact.value} [${fact.certainty}, ${fact.provenance.source}]` : null);
  const lines = [
    factLine("Chief complaint", history.chiefComplaint),
    history.historyOfPresentIllness && Object.keys(history.historyOfPresentIllness).length
      ? `History of present illness: ${Object.entries(history.historyOfPresentIllness)
          .map(([k, f]) => `${k}=${f.value}`)
          .join(", ")}`
      : null,
    ...(history.pastMedicalHistory || []).map((f) => factLine("Past medical history", f)),
    ...(history.medications || []).map((f) => factLine("Medication", f)),
    history.allergies?.items?.length
      ? `Allergies (${history.allergies.status}): ${history.allergies.items.map((i) => i.substance).join(", ")}`
      : `Allergies: ${history.allergies?.status ?? "UNKNOWN"}`,
    ...(history.uncertainties || []).map((u) => `Uncertain: ${u.field} - ${u.reason}`),
  ].filter(Boolean);
  return [
    "SYNTHESIS OF PATIENT-REPORTED AI CLINICAL INTAKE (Part 1).",
    "Patient-reported, not physician-verified. See provenance/certainty per line.",
    "",
    ...lines,
  ].join("\n");
}

/** Best-effort: returns [] rather than throwing when no live database is reachable (same caveat as the rest of Part 1's Postgres access in this environment). */
async function findRealPatientRecord(patientId) {
  try {
    const { rows } = await pool.query("SELECT id, name FROM patients WHERE id = $1", [patientId]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function findCompletedSessionIdsForPatient(patientId) {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM intake_sessions WHERE patient_id = $1 AND status = 'COMPLETED' ORDER BY completed_at DESC",
      [patientId]
    );
    return rows.map((r) => r.id);
  } catch {
    return [];
  }
}

/**
 * @param {import('./recordSource.js').RecordSource} baseSource Normally Part 6's own createDemoRecordSource(repo).
 * @param {{ part3Store?: import('../../part3/models/store.js').Part3Store }} [options] Optional Part 3 store instance
 *   (from `createPart3Context()`/`createPart3Router()`'s returned `context.store`) to also bridge documents from.
 *   Omitted entirely if Part 3 isn't mounted — that half of getClinicalRecords then simply contributes nothing.
 * @returns {import('./recordSource.js').RecordSource}
 */
export function createRealRecordSource(baseSource, { part3Store } = {}) {
  return {
    async getPatient(id) {
      const demo = baseSource.getPatient(id);
      if (demo) return demo;
      const real = await findRealPatientRecord(id);
      if (!real) return null;
      return {
        id: real.id,
        fullName: real.name ?? `Patient ${real.id}`,
        given: real.name ? [real.name] : [],
        family: undefined,
        gender: undefined, // not captured as a coded field by Part 1 — never guessed
        birthDate: undefined,
        custodianOrgId: undefined, // see file header: not yet assignable for real patients
      };
    },

    listPatients() {
      // Real patients are not enumerated here (no live-DB-backed "list all
      // patients with a completed intake" query in this pass) — only
      // reachable by id via getPatient, e.g. from a known intakeSessionId.
      // Demo patients continue to list exactly as before.
      return baseSource.listPatients();
    },

    getOrganization: (id) => baseSource.getOrganization(id),
    listOrganizations: () => baseSource.listOrganizations(),
    getPractitioner: (id) => baseSource.getPractitioner(id),
    getIdentityLink: (patientId) => baseSource.getIdentityLink(patientId),

    async getClinicalRecords(patientId) {
      const demoRecords = baseSource.getClinicalRecords(patientId);
      const sessionIds = await findCompletedSessionIdsForPatient(patientId);
      const realRecords = [];
      for (const sessionId of sessionIds) {
        try {
          const { history } = await intakeService.exportSession(sessionId);
          if (!history) continue;
          realRecords.push({
            id: `DOC-INTAKE-${sessionId}`,
            type: "document",
            patientId,
            typeCode: "34133-9",
            typeDisplay: "Summarization of episode note",
            title: `AI clinical intake — session ${sessionId}`,
            date: new Date().toISOString(),
            authorId: null,
            encounterId: null,
            text: renderClinicalHistoryAsText(history),
          });
        } catch {
          // A session that fails to export (e.g. concurrently modified) is
          // skipped rather than aborting the whole record list.
        }
      }

      const part3Records = [];
      if (part3Store) {
        const PAST_OCR = new Set(["OCR_COMPLETED", "EXTRACTED", "ON_TIMELINE"]);
        try {
          const { items } = part3Store.listDocuments({ patientId, limit: 1000 });
          for (const doc of items) {
            if (!PAST_OCR.has(doc.status)) continue; // no text yet, or OCR failed/empty — never fabricate a record for it
            const ocrResult = part3Store.getOcrResult(doc.id);
            if (!ocrResult?.text) continue;
            part3Records.push(part3DocumentToRecord(doc, ocrResult));
          }
        } catch {
          // Part 3 store unavailable for some reason -> contributes nothing, never throws.
        }
      }

      return [...demoRecords, ...realRecords, ...part3Records].sort((a, b) => a.id.localeCompare(b.id));
    },
  };
}
