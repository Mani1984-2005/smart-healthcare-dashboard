// Part 4 — in-memory persistence behind small interfaces. Swap for a database adapter later without touching the service.
// Analyses are immutable snapshots. Reviews are an append-only event log; the analysis itself is never edited.
import { randomUUID } from "node:crypto";

export class AnalysisStore {
  constructor(max = 200) { this.max = max; this.analyses = new Map(); this.reviews = new Map(); }
  save(analysis) {
    this.analyses.set(analysis.analysisId, Object.freeze(analysis));
    this.reviews.set(analysis.analysisId, []);
    while (this.analyses.size > this.max) {
      const oldest = this.analyses.keys().next().value;
      this.analyses.delete(oldest);
      this.reviews.delete(oldest);
    }
  }
  get(id) { return this.analyses.get(id) ?? null; }
  /** Most-recent-first analyses for a patient (used by this module's own callers to build a per-patient view). */
  listByPatient(patientId) {
    return [...this.analyses.values()].filter((a) => a.patient.id === patientId).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }
  addReview(id, event) { const list = this.reviews.get(id); list.push(Object.freeze({ eventId: randomUUID(), ...event })); return list; }
  reviewEvents(id) { return [...(this.reviews.get(id) ?? [])]; }
}

export function createAuditSink({ external } = {}) {
  const events = [];
  return {
    // Metadata only: ids, roles, counts, status. Never clinical values or free text.
    record(event) {
      const entry = Object.freeze({ eventId: randomUUID(), at: new Date().toISOString(), ...event });
      events.push(entry);
      if (events.length > 2000) events.shift();
      try { external?.(entry); } catch { /* audit forwarding must never break a clinical request */ }
      return entry;
    },
    forAnalysis(analysisId) { return events.filter((e) => e.analysisId === analysisId); },
    all() { return [...events]; },
  };
}

export function createRateLimiter({ windowMs = 60000, max = 30, now = () => Date.now() } = {}) {
  const hits = new Map();
  return function allow(key) {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    if (recent.length >= max) { hits.set(key, recent); return false; }
    recent.push(t);
    hits.set(key, recent);
    return true;
  };
}
