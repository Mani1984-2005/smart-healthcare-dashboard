import { asyncHandler } from '../utils/asyncHandler.js';
import { recordAudit, auditContextFromRequest } from '../services/audit.service.js';
import * as timelineService from '../services/timeline.service.js';

export const getPatientTimeline = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const types = req.query.types ? String(req.query.types).split(',').map((t) => t.trim()) : undefined;

  const timeline = await timelineService.getPatientTimeline(patientId, { types });

  await recordAudit({
    action: 'TIMELINE_VIEWED',
    details: { patientId, eventCount: timeline.eventCount },
    ...auditContextFromRequest(req),
  });

  res.json({ success: true, data: timeline });
});
