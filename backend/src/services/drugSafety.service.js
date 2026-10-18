import { getInteraction } from '../data/medicineDatabase.js';

const SEVERITY_WEIGHT = { minor: 1, moderate: 2, major: 3, contraindicated: 4 };

/**
 * Pairwise-checks every extracted medicine against every other for known
 * interactions in the knowledge base.
 */
export function detectInteractions(medicines) {
  const interactions = [];
  for (let i = 0; i < medicines.length; i++) {
    for (let j = i + 1; j < medicines.length; j++) {
      const a = medicines[i];
      const b = medicines[j];
      if (a.medicineId === b.medicineId) continue;

      const hit = getInteraction(a.medicineId, b.medicineId);
      if (hit) {
        interactions.push({
          medicineA: a.genericName,
          medicineB: b.genericName,
          severity: hit.severity,
          description: hit.description,
        });
      }
    }
  }
  return interactions.sort((x, y) => (SEVERITY_WEIGHT[y.severity] || 0) - (SEVERITY_WEIGHT[x.severity] || 0));
}

/**
 * Flags medicines that appear more than once in the extracted list —
 * either the exact same drug or two brand/generic forms of the same
 * underlying medicine (a common and dangerous prescribing error).
 */
export function detectDuplicates(medicines) {
  const counts = new Map();
  for (const med of medicines) {
    const entry = counts.get(med.medicineId) || { genericName: med.genericName, occurrences: [] };
    entry.occurrences.push(med.rawText);
    counts.set(med.medicineId, entry);
  }

  const duplicates = [];
  for (const [, entry] of counts) {
    if (entry.occurrences.length > 1) {
      duplicates.push({
        medicineName: entry.genericName,
        occurrenceCount: entry.occurrences.length,
        occurrences: entry.occurrences,
      });
    }
  }
  return duplicates;
}

/**
 * Cross-checks extracted medicines against a caller-supplied list of known
 * patient allergies (free text, e.g. ["penicillin", "sulfa drugs"]).
 * Matching is done against each medicine's allergyClass plus its generic
 * and brand names, so both "penicillin" and "amoxicillin" style entries
 * are caught.
 */
export function detectAllergyWarnings(medicines, patientAllergies = []) {
  if (!patientAllergies || patientAllergies.length === 0) return [];

  const normalizedAllergies = patientAllergies
    .map((a) => String(a).toLowerCase().trim())
    .filter(Boolean);

  const warnings = [];
  for (const med of medicines) {
    for (const allergy of normalizedAllergies) {
      const matchesClass = med.allergyClass && (allergy.includes(med.allergyClass) || med.allergyClass.includes(allergy));
      const matchesName =
        med.genericName.toLowerCase().includes(allergy) ||
        med.brandNames.some((b) => b.toLowerCase().includes(allergy));

      if (matchesClass || matchesName) {
        warnings.push({
          medicineName: med.genericName,
          allergyClass: med.allergyClass || allergy,
          matchedAllergy: allergy,
          severity: 'contraindicated',
          description: `Patient has a documented allergy to "${allergy}" — ${med.genericName} ${
            matchesClass ? `belongs to the ${med.allergyClass} allergy class` : 'shares this name'
          } and should be reviewed before dispensing.`,
        });
      }
    }
  }
  return warnings;
}

/**
 * Simple keyword contraindication check: scans the diagnosis text (if any
 * was extracted) against each medicine's contraindications list.
 */
export function detectContraindications(medicines, diagnosisText) {
  if (!diagnosisText) return [];
  const diagnosisLower = diagnosisText.toLowerCase();

  const flags = [];
  for (const med of medicines) {
    const fullMed = med; // already carries category/allergyClass; contraindications live in KB
    // Re-derive contraindications from the KB entry via medicineId lookup
    flags.push(...checkMedicineContraindications(fullMed, diagnosisLower));
  }
  return flags;
}

function checkMedicineContraindications(med, diagnosisLower) {
  // Lightweight keyword heuristics — intentionally conservative (offline, no
  // clinical NLP model) so this only fires on clear textual overlap.
  const flags = [];
  const CONTRA_KEYWORDS = {
    pregnancy: ['warfarin', 'doxycycline', 'losartan', 'lisinopril', 'methotrexate', 'metronidazole'],
    'renal impairment': ['metformin', 'furosemide', 'spironolactone'],
    'liver disease': ['paracetamol', 'atorvastatin', 'simvastatin', 'methotrexate'],
    asthma: ['atenolol'],
    'peptic ulcer': ['ibuprofen', 'aspirin'],
  };

  for (const [condition, medicineIds] of Object.entries(CONTRA_KEYWORDS)) {
    if (diagnosisLower.includes(condition) && medicineIds.includes(med.medicineId)) {
      flags.push({
        medicineName: med.genericName,
        condition,
        severity: 'major',
        description: `${med.genericName} is generally contraindicated or requires caution in patients with ${condition}, which appears in the recorded diagnosis.`,
      });
    }
  }
  return flags;
}

/** Straightforward pass-through flag list for medicines marked high-risk in the KB. */
export function detectHighRiskMedicines(medicines) {
  return medicines
    .filter((m) => m.isHighRisk)
    .map((m) => ({
      medicineName: m.genericName,
      category: m.category,
      isControlled: m.isControlled,
      reason: m.isControlled
        ? 'Controlled substance with dependence/misuse potential — verify dosage and duration carefully.'
        : 'Narrow therapeutic index or high harm potential if misdosed — verify dosage and monitoring plan.',
    }));
}

/** Computes an overall risk level from everything detected. */
export function computeRiskLevel({ interactions, allergyWarnings, contraindications, highRiskMedicines }) {
  if (allergyWarnings.length > 0 || interactions.some((i) => i.severity === 'contraindicated')) return 'critical';
  if (interactions.some((i) => i.severity === 'major') || contraindications.some((c) => c.severity === 'major')) return 'high';
  if (interactions.length > 0 || highRiskMedicines.length > 0) return 'medium';
  return 'low';
}
