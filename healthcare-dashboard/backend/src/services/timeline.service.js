import { AppError } from '../utils/AppError.js';
import * as patientsRepo from '../repositories/patients.repository.js';
import * as timelineRepo from '../repositories/timeline.repository.js';

/**
 * Builds a unified, chronologically sorted timeline for a patient by
 * fanning out to every integrated module in parallel and merging the
 * normalized results. Adding a new event source later means adding one
 * more repository function here — no changes to callers.
 */
export async function getPatientTimeline(patientId, { types } = {}) {
  const patient = await patientsRepo.findPatientById(patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  const sources = [
    timelineRepo.prescriptionEvents,
    timelineRepo.analysisEvents,
    timelineRepo.dispensationEvents,
    timelineRepo.labReportEvents,
    timelineRepo.invoiceEvents,
  ];

  const results = await Promise.all(sources.map((fn) => fn(patientId)));
  let events = results.flat();

  if (types && types.length) {
    const allow = new Set(types);
    events = events.filter((e) => allow.has(e.type));
  }

  events.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));

  return {
    patientId,
    patientName: patient.full_name,
    mrn: patient.mrn,
    eventCount: events.length,
    events,
  };
}
