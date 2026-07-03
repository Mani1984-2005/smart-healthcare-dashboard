import { extractStructuredData } from './nlpExtraction.service.js';
import {
  detectInteractions,
  detectDuplicates,
  detectAllergyWarnings,
  detectContraindications,
  detectHighRiskMedicines,
  computeRiskLevel,
} from './drugSafety.service.js';
import { generatePrescriptionSummary } from './summary.service.js';

export const AI_ANALYSIS_VERSION = 'part2-rule-engine-v1';

/**
 * Runs the complete offline AI Clinical Engine pipeline against a
 * prescription's raw OCR text and returns a single structured result,
 * ready to be persisted and/or serialized to the client.
 */
export function runAiAnalysis({ rawOcrText, patientAllergies = [] }) {
  const extracted = extractStructuredData(rawOcrText);

  const interactions = detectInteractions(extracted.medicines);
  const duplicates = detectDuplicates(extracted.medicines);
  const allergyWarnings = detectAllergyWarnings(extracted.medicines, patientAllergies);
  const contraindications = detectContraindications(extracted.medicines, extracted.diagnosis);
  const highRiskMedicines = detectHighRiskMedicines(extracted.medicines);

  const riskLevel = computeRiskLevel({ interactions, allergyWarnings, contraindications, highRiskMedicines });

  const summary = generatePrescriptionSummary({
    patientName: extracted.patientName,
    doctorName: extracted.doctorName,
    diagnosis: extracted.diagnosis,
    medicines: extracted.medicines,
    interactions,
    duplicates,
    allergyWarnings,
    contraindications,
    highRiskMedicines,
    riskLevel,
  });

  return {
    version: AI_ANALYSIS_VERSION,
    patientName: extracted.patientName,
    patientNameConfidence: extracted.patientNameConfidence,
    doctorName: extracted.doctorName,
    doctorNameConfidence: extracted.doctorNameConfidence,
    diagnosis: extracted.diagnosis,
    diagnosisConfidence: extracted.diagnosisConfidence,
    medicines: extracted.medicines,
    interactions,
    duplicates,
    allergyWarnings,
    contraindications,
    highRiskMedicines,
    overallConfidence: extracted.overallConfidence,
    riskLevel,
    summary,
  };
}
