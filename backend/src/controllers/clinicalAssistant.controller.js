import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import * as assistant from '../services/clinicalAssistant.service.js';

export const askAssistant = asyncHandler(async (req, res) => {
  const { question, sessionId, prescriptionId, patientId, currentMedicines, knownAllergies, diagnosisText } = req.body || {};
  const { session, message } = await assistant.ask({
    sessionId,
    question,
    askedBy: req.user?.id,
    context: { prescriptionId, patientId, currentMedicines, knownAllergies, diagnosisText },
  });

  await recordAudit({
    userId: req.user?.id,
    prescriptionId: prescriptionId || session.prescription_id,
    action: 'CLINICAL_ASSISTANT_QUERIED',
    details: { sessionId: session.id, provider: message.provider },
    ...auditContextFromRequest(req),
  });

  res.status(201).json({ success: true, data: { sessionId: session.id, message } });
});

export const getSessionHistory = asyncHandler(async (req, res) => {
  const history = await assistant.getHistory(req.params.sessionId);
  res.json({ success: true, data: history });
});

export const getPrescriptionSessionHistory = asyncHandler(async (req, res) => {
  const history = await assistant.getHistoryForPrescription(req.params.id);
  res.json({ success: true, data: history });
});
