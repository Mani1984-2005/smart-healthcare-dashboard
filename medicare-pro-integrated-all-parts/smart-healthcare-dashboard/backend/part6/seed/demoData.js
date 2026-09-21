// SYNTHETIC DEMO DATA. No real people, no real identifiers. Everything here is fabricated for the prototype.
import { ROLES } from "../domain/constants.js";

export const ORGANIZATIONS = [
  { id: "ORG-DEMO-001", name: "MediCare Demo Hospital" },
  { id: "ORG-DEMO-002", name: "Demo Community Clinic" },
];

export const USERS = [
  { id: "USR-PAT-001", displayName: "Demo Patient", role: ROLES.PATIENT, patientId: "MCP-DEMO-001", orgId: null, blurb: "Data principal: grants, denies and revokes consent for their own record." },
  { id: "USR-PAT-002", displayName: "Demo Patient Two", role: ROLES.PATIENT, patientId: "MCP-DEMO-002", orgId: null, blurb: "A second patient, used to show that patients cannot see each other's data." },
  { id: "USR-DOC-001", displayName: "Dr. Demo User", role: ROLES.DOCTOR, patientId: null, orgId: "ORG-DEMO-001", practitionerId: "PRAC-DEMO-001", blurb: "Doctor at MediCare Demo Hospital (custodian of Demo Patient)." },
  { id: "USR-DOC-002", displayName: "Dr. Demo Two", role: ROLES.DOCTOR, patientId: null, orgId: "ORG-DEMO-002", practitionerId: "PRAC-DEMO-002", blurb: "Doctor at Demo Community Clinic (custodian of Demo Patient Two)." },
  { id: "USR-HADM-001", displayName: "Hospital Demo Admin", role: ROLES.HOSPITAL_ADMIN, patientId: null, orgId: "ORG-DEMO-001", blurb: "Hospital administrator: organisation-level oversight." },
  { id: "USR-SADM-001", displayName: "Demo System Admin", role: ROLES.SYSTEM_ADMIN, patientId: null, orgId: null, blurb: "Platform administrator: security, settings and audit. No clinical-data access." },
];

export const PATIENTS = [
  {
    id: "MCP-DEMO-001",
    fullName: "Demo Patient",
    given: ["Demo"],
    family: "Patient",
    gender: "female",
    birthDate: "1985-04-12",
    custodianOrgId: "ORG-DEMO-001",
  },
  {
    id: "MCP-DEMO-002",
    fullName: "Demo Patient Two",
    given: ["Demo"],
    family: "Patient Two",
    gender: "male",
    birthDate: "1972-09-03",
    custodianOrgId: "ORG-DEMO-002",
  },
];

// ABHA / ABDM identity is a SEPARATE identifier from the internal patient id and is not verified.
export const IDENTITY_LINKS = [
  { internalPatientId: "MCP-DEMO-001", abhaAddress: "DEMO-ABHA-001", abhaNumberMasked: "XX-XXXX-XXXX-XXXX" },
  { internalPatientId: "MCP-DEMO-002", abhaAddress: "DEMO-ABHA-002", abhaNumberMasked: "XX-XXXX-XXXX-XXXX" },
].map((l) => ({
  id: `LNK-${l.internalPatientId}`,
  ...l,
  status: "DEMO_NOT_CONNECTED",
  verification: "PROTOTYPE",
  verifiedAt: null,
}));

const TZ = "+05:30";
const H = (date, time) => `${date}T${time}${TZ}`;

const BP = { code: "85354-9", display: "Blood pressure panel with all children optional" };
const sys = (v) => ({ code: "8480-6", display: "Systolic blood pressure", value: v, unit: "mmHg", ucum: "mm[Hg]" });
const dia = (v) => ({ code: "8462-4", display: "Diastolic blood pressure", value: v, unit: "mmHg", ucum: "mm[Hg]" });

export const SOURCE_RECORDS = [
  // ----- practitioners -----
  { id: "PRAC-DEMO-001", type: "practitioner", patientId: null, name: "Dr. Demo User", prefix: ["Dr."], given: ["Demo"], family: "User", registration: "DEMO-REG-0001", specialty: "General Medicine", orgId: "ORG-DEMO-001" },
  { id: "PRAC-DEMO-002", type: "practitioner", patientId: null, name: "Dr. Demo Two", prefix: ["Dr."], given: ["Demo"], family: "Two", registration: "DEMO-REG-0002", specialty: "Family Medicine", orgId: "ORG-DEMO-002" },

  // ===== Patient 1: MCP-DEMO-001 (custodian: MediCare Demo Hospital) =====
  { id: "ENC-DEMO-001", type: "encounter", patientId: "MCP-DEMO-001", status: "finished", classCode: "AMB", classDisplay: "ambulatory", typeText: "Outpatient follow-up", start: H("2026-08-12", "09:30:00"), end: H("2026-08-12", "10:05:00"), practitionerId: "PRAC-DEMO-001", orgId: "ORG-DEMO-001", reason: "Diabetes review" },
  { id: "ENC-DEMO-002", type: "encounter", patientId: "MCP-DEMO-001", status: "finished", classCode: "AMB", classDisplay: "ambulatory", typeText: "Outpatient visit", start: H("2026-09-02", "11:00:00"), end: H("2026-09-02", "11:25:00"), practitionerId: "PRAC-DEMO-001", orgId: "ORG-DEMO-001", reason: "Blood pressure check" },
  { id: "COND-DEMO-001", type: "condition", patientId: "MCP-DEMO-001", code: "44054006", display: "Diabetes mellitus type 2", clinicalStatus: "active", verificationStatus: "confirmed", onset: "2021-03-01", recordedDate: "2021-03-01", encounterId: "ENC-DEMO-001" },
  { id: "COND-DEMO-002", type: "condition", patientId: "MCP-DEMO-001", code: "38341003", display: "Hypertensive disorder", clinicalStatus: "active", verificationStatus: "confirmed", onset: "2023-06-15", recordedDate: "2023-06-15", encounterId: "ENC-DEMO-002" },
  { id: "OBS-DEMO-001", type: "observation", patientId: "MCP-DEMO-001", category: "vital-signs", ...BP, components: [sys(128), dia(82)], effective: H("2026-09-02", "11:05:00"), encounterId: "ENC-DEMO-002", performerId: "PRAC-DEMO-001" },
  { id: "OBS-DEMO-002", type: "observation", patientId: "MCP-DEMO-001", category: "laboratory", code: "4548-4", display: "Hemoglobin A1c/Hemoglobin.total in Blood", value: { value: 7.2, unit: "%", ucum: "%" }, effective: H("2026-08-12", "09:45:00"), encounterId: "ENC-DEMO-001", performerId: "PRAC-DEMO-001" },
  { id: "OBS-DEMO-003", type: "observation", patientId: "MCP-DEMO-001", category: "laboratory", code: "2339-0", display: "Glucose [Mass/volume] in Blood", value: { value: 118, unit: "mg/dL", ucum: "mg/dL" }, effective: H("2026-08-12", "09:45:00"), encounterId: "ENC-DEMO-001", performerId: "PRAC-DEMO-001" },
  { id: "OBS-DEMO-004", type: "observation", patientId: "MCP-DEMO-001", category: "vital-signs", code: "29463-7", display: "Body weight", value: { value: 68.5, unit: "kg", ucum: "kg" }, effective: H("2026-08-12", "09:35:00"), encounterId: "ENC-DEMO-001", performerId: "PRAC-DEMO-001" },
  { id: "MED-DEMO-001", type: "medication", patientId: "MCP-DEMO-001", code: "372567009", display: "Metformin", status: "active", authoredOn: H("2026-08-12", "10:00:00"), prescriberId: "PRAC-DEMO-001", dosageText: "500 mg orally twice daily with meals", encounterId: "ENC-DEMO-001", reasonConditionId: "COND-DEMO-001" },
  { id: "MED-DEMO-002", type: "medication", patientId: "MCP-DEMO-001", code: "386864001", display: "Amlodipine", status: "active", authoredOn: H("2026-09-02", "11:20:00"), prescriberId: "PRAC-DEMO-001", dosageText: "5 mg orally once daily", encounterId: "ENC-DEMO-002", reasonConditionId: "COND-DEMO-002" },
  { id: "DR-DEMO-001", type: "diagnosticReport", patientId: "MCP-DEMO-001", status: "final", code: "11502-2", display: "Laboratory report", effective: H("2026-08-12", "09:45:00"), issued: "2026-08-12T16:00:00+05:30", performerId: "PRAC-DEMO-001", encounterId: "ENC-DEMO-001", resultIds: ["OBS-DEMO-002", "OBS-DEMO-003"], conclusion: "Routine monitoring panel completed; see result observations." },
  { id: "ALG-DEMO-001", type: "allergy", patientId: "MCP-DEMO-001", code: "91936005", display: "Allergy to penicillin", clinicalStatus: "active", verificationStatus: "confirmed", criticality: "low", recordedDate: "2019-05-20", reaction: { code: "271807003", display: "Eruption of skin", severity: "mild" } },
  { id: "DOC-DEMO-001", type: "document", patientId: "MCP-DEMO-001", typeCode: "34133-9", typeDisplay: "Summarization of episode note", title: "Clinical summary (synthetic demo document)", date: "2026-09-02T12:00:00+05:30", authorId: "PRAC-DEMO-001", encounterId: "ENC-DEMO-002", text: "SYNTHETIC DEMO DOCUMENT. Outpatient visit summary for a fictitious patient. Not real clinical data." },

  // ===== Patient 2: MCP-DEMO-002 (custodian: Demo Community Clinic) =====
  { id: "ENC-DEMO-003", type: "encounter", patientId: "MCP-DEMO-002", status: "finished", classCode: "AMB", classDisplay: "ambulatory", typeText: "Outpatient visit", start: H("2026-08-20", "10:00:00"), end: H("2026-08-20", "10:30:00"), practitionerId: "PRAC-DEMO-002", orgId: "ORG-DEMO-002", reason: "Asthma review" },
  { id: "COND-DEMO-003", type: "condition", patientId: "MCP-DEMO-002", code: "195967001", display: "Asthma", clinicalStatus: "active", verificationStatus: "confirmed", onset: "2015-01-10", recordedDate: "2015-01-10", encounterId: "ENC-DEMO-003" },
  { id: "COND-DEMO-004", type: "condition", patientId: "MCP-DEMO-002", code: "38341003", display: "Hypertensive disorder", clinicalStatus: "active", verificationStatus: "confirmed", onset: "2020-11-02", recordedDate: "2020-11-02", encounterId: "ENC-DEMO-003" },
  { id: "OBS-DEMO-005", type: "observation", patientId: "MCP-DEMO-002", category: "vital-signs", ...BP, components: [sys(138), dia(88)], effective: H("2026-08-20", "10:05:00"), encounterId: "ENC-DEMO-003", performerId: "PRAC-DEMO-002" },
  { id: "OBS-DEMO-006", type: "observation", patientId: "MCP-DEMO-002", category: "vital-signs", code: "8867-4", display: "Heart rate", value: { value: 76, unit: "/min", ucum: "/min" }, effective: H("2026-08-20", "10:05:00"), encounterId: "ENC-DEMO-003", performerId: "PRAC-DEMO-002" },
  { id: "OBS-DEMO-007", type: "observation", patientId: "MCP-DEMO-002", category: "laboratory", code: "2160-0", display: "Creatinine [Mass/volume] in Serum or Plasma", value: { value: 0.9, unit: "mg/dL", ucum: "mg/dL" }, effective: H("2026-08-20", "10:10:00"), encounterId: "ENC-DEMO-003", performerId: "PRAC-DEMO-002" },
  { id: "MED-DEMO-003", type: "medication", patientId: "MCP-DEMO-002", code: "372897005", display: "Albuterol", status: "active", authoredOn: H("2026-08-20", "10:20:00"), prescriberId: "PRAC-DEMO-002", dosageText: "2 puffs inhaled as needed", encounterId: "ENC-DEMO-003", reasonConditionId: "COND-DEMO-003" },
  { id: "MED-DEMO-004", type: "medication", patientId: "MCP-DEMO-002", code: "386864001", display: "Amlodipine", status: "active", authoredOn: H("2026-08-20", "10:22:00"), prescriberId: "PRAC-DEMO-002", dosageText: "5 mg orally once daily", encounterId: "ENC-DEMO-003", reasonConditionId: "COND-DEMO-004" },
  { id: "DR-DEMO-002", type: "diagnosticReport", patientId: "MCP-DEMO-002", status: "final", code: "11502-2", display: "Laboratory report", effective: H("2026-08-20", "10:10:00"), issued: "2026-08-20T15:00:00+05:30", performerId: "PRAC-DEMO-002", encounterId: "ENC-DEMO-003", resultIds: ["OBS-DEMO-007"], conclusion: "Routine monitoring panel completed; see result observations." },
  { id: "DOC-DEMO-002", type: "document", patientId: "MCP-DEMO-002", typeCode: "34133-9", typeDisplay: "Summarization of episode note", title: "Clinical summary (synthetic demo document)", date: "2026-08-20T12:00:00+05:30", authorId: "PRAC-DEMO-002", encounterId: "ENC-DEMO-003", text: "SYNTHETIC DEMO DOCUMENT. Outpatient visit summary for a fictitious patient. Not real clinical data." },
  // (Patient 2 intentionally has no allergy records: demonstrates the empty state.)
];
