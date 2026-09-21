// backend/controllers/intakeController.js
import * as intakeService from "../services/intakeService.js";
import { IntakeValidationError, IntakeNotFoundError, IntakeAuthError } from "../services/intakeService.js";

function handleError(res, err) {
  if (err instanceof IntakeValidationError) return res.status(400).json({ success: false, message: err.message });
  if (err instanceof IntakeNotFoundError) return res.status(404).json({ success: false, message: err.message });
  if (err instanceof IntakeAuthError) return res.status(401).json({ success: false, message: err.message });
  console.error("[intake] unexpected error", err);
  return res.status(500).json({ success: false, message: "Internal error processing intake request" });
}

export async function createSession(req, res) {
  try {
    const staffUid = req.user?.uid ?? req.user?.user_id ?? req.user?.sub;
    const { patientId, encounterId, intakeMode } = req.body ?? {};
    const result = await intakeService.createSession({ patientId, encounterId, intakeMode, staffUid });
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getSession(req, res) {
  try {
    const state = await intakeService.getSessionState(req.params.id);
    return res.json({ success: true, ...state });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function updateSession(req, res) {
  try {
    const session = await intakeService.updateSessionFields(req.params.id, req.body ?? {});
    return res.json({ success: true, session });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postMessage(req, res) {
  try {
    const message = await intakeService.appendMessage(req.params.id, req.body ?? {});
    return res.status(201).json({ success: true, message });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function postAnswer(req, res) {
  try {
    const result = await intakeService.submitAnswer(req.params.id, req.body ?? {});
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getHistory(req, res) {
  try {
    const history = await intakeService.getHistory(req.params.id);
    return res.json({ success: true, history });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function patchHistory(req, res) {
  try {
    const history = await intakeService.editAnswer(req.params.id, req.body ?? {});
    return res.json({ success: true, history });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function completeSession(req, res) {
  try {
    const result = await intakeService.completeSession(req.params.id);
    return res.json({ success: true, ...result });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function exportSession(req, res) {
  try {
    const result = await intakeService.exportSession(req.params.id);
    return res.json({ success: true, ...result });
  } catch (err) {
    return handleError(res, err);
  }
}
