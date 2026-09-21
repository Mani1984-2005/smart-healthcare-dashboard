// Shared vocabulary for Part 6. Single source of truth for roles, statuses, categories and purposes.
export const ROLES = Object.freeze({
  PATIENT: "PATIENT",
  DOCTOR: "DOCTOR",
  HOSPITAL_ADMIN: "HOSPITAL_ADMIN",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
});

export const CONSENT_STATUS = Object.freeze({
  PENDING: "Pending",
  GRANTED: "Granted",
  DENIED: "Denied",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
});

/**
 * Data categories a patient can share individually (minimum-necessary sharing).
 * "Billing / administrative" data is intentionally NOT a shareable category in this prototype.
 */
export const DATA_CATEGORIES = Object.freeze({
  "clinical-history": {
    label: "Clinical History",
    description: "Encounters, conditions and vital-sign observations",
  },
  "lab-reports": { label: "Lab Reports", description: "Laboratory observations" },
  medications: { label: "Medications", description: "Medication requests (prescriptions)" },
  allergies: { label: "Allergies", description: "Allergies and intolerances" },
  "diagnostic-reports": { label: "Diagnostic Reports", description: "Diagnostic report summaries" },
  documents: { label: "Documents", description: "Clinical document references" },
});

export const PURPOSES = Object.freeze({
  CLINICAL_CARE: "Clinical Care",
  CARE_CONTINUITY: "Continuity of Care",
  REFERRAL: "Referral / Second Opinion",
});

export const SUPPORTED_RESOURCE_TYPES = Object.freeze([
  "Patient",
  "Practitioner",
  "Organization",
  "Encounter",
  "Condition",
  "Observation",
  "MedicationRequest",
  "DiagnosticReport",
  "AllergyIntolerance",
  "DocumentReference",
]);

/** Which consent category governs a given FHIR resource. Supporting resources return null. */
export function categoryOfResource(resource) {
  switch (resource?.resourceType) {
    case "Encounter":
    case "Condition":
      return "clinical-history";
    case "Observation": {
      const isLab = (resource.category ?? []).some((c) => (c.coding ?? []).some((k) => k.code === "laboratory"));
      return isLab ? "lab-reports" : "clinical-history";
    }
    case "MedicationRequest":
      return "medications";
    case "AllergyIntolerance":
      return "allergies";
    case "DiagnosticReport":
      return "diagnostic-reports";
    case "DocumentReference":
      return "documents";
    default:
      return null;
  }
}

export const DEMO_LABEL = "DEMO / MOCK / PROTOTYPE";
export const DEMO_TAG_SYSTEM = "https://medicare-pro.example/fhir/tags";
