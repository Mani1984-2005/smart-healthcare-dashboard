/**
 * Generates a human-readable prescription summary from structured
 * extraction + safety-analysis results. Deterministic, template-based —
 * no external LLM call, so it works fully offline.
 */
export function generatePrescriptionSummary({
  patientName,
  doctorName,
  diagnosis,
  medicines,
  interactions,
  duplicates,
  allergyWarnings,
  contraindications,
  highRiskMedicines,
  riskLevel,
}) {
  const lines = [];

  const who = patientName ? `for ${patientName}` : 'for the patient';
  const by = doctorName ? ` by ${doctorName}` : '';
  const dx = diagnosis ? ` for ${diagnosis}` : '';
  lines.push(`This prescription${dx} was analyzed ${who}${by}.`);

  if (medicines.length === 0) {
    lines.push('No recognized medicines were extracted from the OCR text — the analysis could not identify drug entries with sufficient confidence.');
  } else {
    const names = medicines.map((m) => m.genericName);
    lines.push(
      `${medicines.length} medicine${medicines.length > 1 ? 's were' : ' was'} identified: ${names.join(', ')}.`
    );
  }

  if (highRiskMedicines.length > 0) {
    lines.push(
      `${highRiskMedicines.length} high-risk medicine${highRiskMedicines.length > 1 ? 's require' : ' requires'} extra attention: ${highRiskMedicines
        .map((h) => h.medicineName)
        .join(', ')}.`
    );
  }

  if (duplicates.length > 0) {
    lines.push(
      `Possible duplicate prescribing detected for: ${duplicates.map((d) => d.medicineName).join(', ')}.`
    );
  }

  if (interactions.length > 0) {
    const worst = interactions[0];
    lines.push(
      `${interactions.length} drug interaction${interactions.length > 1 ? 's were' : ' was'} found, the most severe being ${worst.severity} between ${worst.medicineA} and ${worst.medicineB}.`
    );
  }

  if (allergyWarnings.length > 0) {
    lines.push(
      `⚠ Allergy conflict detected: ${allergyWarnings.map((a) => `${a.medicineName} (${a.matchedAllergy})`).join(', ')}. Review before dispensing.`
    );
  }

  if (contraindications.length > 0) {
    lines.push(
      `${contraindications.length} possible contraindication${contraindications.length > 1 ? 's' : ''} flagged against the recorded diagnosis.`
    );
  }

  lines.push(`Overall risk level: ${riskLevel.toUpperCase()}.`);

  if (riskLevel === 'low' && medicines.length > 0) {
    lines.push('No significant interactions, duplicates, or allergy conflicts were found in this offline analysis.');
  }

  lines.push('This is an automated, rule-based analysis and does not replace pharmacist or physician review.');

  return lines.join(' ');
}
