import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import * as sessionsRepo from '../repositories/clinicalAssistant.repository.js';
import { findMedicinesInText, listAllMedicineNames } from './medicineLookup.service.js';
import { detectInteractions, detectAllergyWarnings, detectContraindications } from './drugSafety.service.js';

/**
 * ClinicalAssistantProvider — the integration seam for a real AI clinical
 * decision-support system (an LLM behind an HL7 CDS Hooks-compatible
 * service, a vendor API, etc). Every provider implements `ask({ question,
 * context }) -> { answer, groundingRefs }`. The active provider is chosen
 * by CLINICAL_ASSISTANT_PROVIDER; new providers register themselves below
 * without touching the controller/routes/session-persistence layer.
 */
const providers = new Map();

export function registerClinicalAssistantProvider(name, provider) {
  providers.set(name, provider);
}

/**
 * Default provider: deterministic, rule-based, and fully local. It reuses
 * the existing medicine-lookup and drug-safety engines so the assistant's
 * answers are grounded in the same data the rest of the app trusts, and
 * never fabricates a clinical claim. This is what ships out of the box;
 * swap in an LLM/vendor provider via registerClinicalAssistantProvider
 * once one is contracted, with zero changes to callers.
 */
registerClinicalAssistantProvider('rule-based', {
  async ask({ question, context }) {
    // Reuse the exact extracted-medicine shape the rest of the app relies
    // on (medicineId/genericName/brandNames/allergyClass) so the shared
    // drug-safety engine works unmodified.
    const combinedText = [question, ...(context.currentMedicines || [])].join(' ');
    const medicines = findMedicinesInText(combinedText).map((m) => ({
      medicineId: m.medicine.id,
      genericName: m.medicine.genericName,
      brandNames: m.medicine.brandNames,
      allergyClass: m.medicine.allergyClass,
      isHighRisk: m.medicine.isHighRisk,
      rawText: m.matchedName,
    }));

    const interactions = detectInteractions(medicines);
    const allergyWarnings = detectAllergyWarnings(medicines, context.knownAllergies || []);
    const contraindications = detectContraindications(medicines, context.diagnosisText || '');

    const parts = [];
    if (interactions.length) {
      parts.push(`Detected ${interactions.length} potential drug interaction(s) among the medicines discussed.`);
    }
    if (allergyWarnings.length) {
      parts.push(`${allergyWarnings.length} allergy warning(s) apply given the patient's known allergies.`);
    }
    if (contraindications.length) {
      parts.push(`${contraindications.length} contraindication flag(s) were found against the stated diagnosis.`);
    }
    if (!parts.length) {
      parts.push('No interaction, allergy, or contraindication flags were found for the medicines referenced in your question.');
    }
    parts.push('This is a rule-based safety check, not a diagnosis — a licensed clinician should confirm any clinical decision.');

    return {
      answer: parts.join(' '),
      groundingRefs: [
        { type: 'interactions', count: interactions.length },
        { type: 'allergyWarnings', count: allergyWarnings.length },
        { type: 'contraindications', count: contraindications.length },
        { type: 'knownMedicineCatalog', count: listAllMedicineNames().length },
      ],
    };
  },
});

function getProvider() {
  const name = process.env.CLINICAL_ASSISTANT_PROVIDER || 'rule-based';
  const provider = providers.get(name);
  if (!provider) throw AppError.internal(`No clinical assistant provider registered as "${name}".`);
  return provider;
}

export async function startSession({ prescriptionId, patientId, startedBy }) {
  return sessionsRepo.createSession({ prescriptionId, patientId, startedBy });
}

export async function ask({ sessionId, question, context = {}, askedBy }) {
  let session = sessionId ? await sessionsRepo.findSession(sessionId) : null;
  if (!session) {
    session = await startSession({
      prescriptionId: context.prescriptionId,
      patientId: context.patientId,
      startedBy: askedBy,
    });
  }

  await sessionsRepo.insertMessage({ sessionId: session.id, role: 'user', content: question });

  const provider = getProvider();
  let result;
  try {
    result = await provider.ask({ question, context });
  } catch (err) {
    logger.error('Clinical assistant provider failed', { error: err.message });
    throw AppError.internal('The clinical assistant provider is temporarily unavailable.');
  }

  const message = await sessionsRepo.insertMessage({
    sessionId: session.id, role: 'assistant', content: result.answer,
    provider: process.env.CLINICAL_ASSISTANT_PROVIDER || 'rule-based', groundingRefs: result.groundingRefs,
  });

  return { session, message };
}

export async function getHistory(sessionId) {
  const session = await sessionsRepo.findSession(sessionId);
  if (!session) throw AppError.notFound('Clinical assistant session not found.');
  const messages = await sessionsRepo.listMessages(sessionId);
  return { session, messages };
}

export async function getHistoryForPrescription(prescriptionId) {
  const session = await sessionsRepo.findSessionByPrescription(prescriptionId);
  if (!session) return { session: null, messages: [] };
  const messages = await sessionsRepo.listMessages(session.id);
  return { session, messages };
}
