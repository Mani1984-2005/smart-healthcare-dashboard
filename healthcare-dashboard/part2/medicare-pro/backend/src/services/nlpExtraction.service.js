import { findMedicinesInText } from './medicineLookup.service.js';

// ---------------------------------------------------------------------
// Offline, rule-based NLP extraction for prescription OCR text.
// No external NLP library — purpose-built regex/heuristics tuned for
// the shorthand commonly found on prescriptions.
// ---------------------------------------------------------------------

const DOSAGE_RE = /(\d+(?:\.\d+)?)\s?(mg|mcg|g|ml|iu|units?)\b/i;

const FREQUENCY_PATTERNS = [
  { re: /\bonce\s*a?\s*day\b|\bonce\s*daily\b|\bOD\b/i, label: 'Once daily', code: 'OD' },
  { re: /\btwice\s*a?\s*day\b|\btwice\s*daily\b|\bBID\b|\bBD\b/i, label: 'Twice daily', code: 'BD' },
  { re: /\bthree\s*times\s*a?\s*day\b|\bthrice\s*daily\b|\bTID\b|\bTDS\b/i, label: 'Three times daily', code: 'TDS' },
  { re: /\bfour\s*times\s*a?\s*day\b|\bQID\b/i, label: 'Four times daily', code: 'QID' },
  { re: /\bat\s*bedtime\b|\bHS\b/i, label: 'At bedtime', code: 'HS' },
  { re: /\bas\s*needed\b|\bPRN\b|\bSOS\b/i, label: 'As needed', code: 'PRN' },
  { re: /\bevery\s*(\d+)\s*hours?\b|\bQ(\d+)H\b/i, label: null, code: null }, // handled specially below
  { re: /\b(\d)\s*[-x]\s*(\d)\s*[-x]\s*(\d)\b/, label: null, code: null }, // 1-0-1 style, handled specially
];

const DURATION_RE = /(?:for\s*|x\s*|×\s*)?(\d+)\s*(day|days|week|weeks|month|months)\b/i;

const ROUTE_PATTERNS = [
  { re: /\boral(ly)?\b|\bPO\b/i, label: 'Oral' },
  { re: /\btopical(ly)?\b/i, label: 'Topical' },
  { re: /\bIV\b|\bintravenous\b/i, label: 'IV' },
  { re: /\bIM\b|\bintramuscular\b/i, label: 'IM' },
  { re: /\bsubcutaneous(ly)?\b|\bSC\b|\bSQ\b/i, label: 'Subcutaneous' },
  { re: /\binhale[dr]?\b|\bnebuliz(e|ed|ation)\b/i, label: 'Inhaled' },
];

function parseFrequency(line) {
  for (const pattern of FREQUENCY_PATTERNS) {
    const match = line.match(pattern.re);
    if (!match) continue;

    if (pattern.code === null && pattern.re.source.startsWith('\\bevery')) {
      const hours = match[1] || match[2];
      return { label: `Every ${hours} hours`, code: `Q${hours}H` };
    }
    if (pattern.code === null) {
      // 1-0-1 style morning-afternoon-night dosing
      const [, m, a, n] = match;
      const parts = [];
      if (m !== '0') parts.push('morning');
      if (a !== '0') parts.push('afternoon');
      if (n !== '0') parts.push('night');
      return { label: `${match[0]} (${parts.join(', ') || 'as scheduled'})`, code: match[0] };
    }
    return { label: pattern.label, code: pattern.code };
  }
  return null;
}

function parseDuration(line) {
  const match = line.match(DURATION_RE);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase().startsWith('day')
    ? 'day'
    : match[2].toLowerCase().startsWith('week')
    ? 'week'
    : 'month';
  const days = unit === 'day' ? amount : unit === 'week' ? amount * 7 : amount * 30;
  return { label: `${amount} ${unit}${amount > 1 ? 's' : ''}`, days };
}

function parseRoute(line) {
  for (const pattern of ROUTE_PATTERNS) {
    if (pattern.re.test(line)) return pattern.label;
  }
  return null;
}

function parseDosage(line) {
  const match = line.match(DOSAGE_RE);
  if (!match) return null;
  return { amount: Number(match[1]), unit: match[2].toLowerCase(), label: `${match[1]}${match[2]}` };
}

/**
 * Extracts every distinct medicine mention from the OCR text along with
 * dosage / frequency / duration / route parsed from that same line, plus
 * a per-entry confidence score blending name-match confidence with how
 * much structured detail (dosage/frequency/duration) was recovered.
 */
export function extractMedicines(rawText) {
  if (!rawText) return [];
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const results = [];
  const seenIds = new Set();

  for (const line of lines) {
    const matches = findMedicinesInText(line);
    for (const match of matches) {
      // Keep the highest-confidence line for each medicine (avoid duplicate
      // noise from headers/footers mentioning the same drug twice); true
      // clinical duplicates — e.g. same drug prescribed twice — are still
      // detected separately by drugSafety.service using position + line count.
      const dosage = parseDosage(line);
      const frequency = parseFrequency(line);
      const duration = parseDuration(line);
      const route = parseRoute(line);

      let structureScore = 0;
      if (dosage) structureScore += 0.15;
      if (frequency) structureScore += 0.1;
      if (duration) structureScore += 0.05;

      const confidence = Math.min(1, Number((match.confidence * 0.7 + structureScore).toFixed(2)));

      results.push({
        rawText: line,
        medicineId: match.medicine.id,
        genericName: match.medicine.genericName,
        brandNames: match.medicine.brandNames,
        matchedAs: match.matchedName,
        matchKind: match.matchKind,
        category: match.medicine.category,
        dosage: dosage?.label || null,
        dosageAmount: dosage?.amount ?? null,
        dosageUnit: dosage?.unit ?? null,
        frequency: frequency?.label || null,
        frequencyCode: frequency?.code || null,
        duration: duration?.label || null,
        durationDays: duration?.days ?? null,
        route,
        isHighRisk: match.medicine.highRisk,
        isControlled: match.medicine.controlledSubstance,
        allergyClass: match.medicine.allergyClass,
        confidence,
      });
      seenIds.add(match.medicine.id);
    }
  }

  return results;
}

// ---------------------------------------------------------------------
// Patient / doctor / diagnosis extraction — label-based line scanning.
// Handles common prescription header formats.
// ---------------------------------------------------------------------

const FIELD_PATTERNS = {
  patientName: [
    /patient\s*name\s*[:\-]\s*(.+)/i,
    /patient\s*[:\-]\s*(.+)/i,
    /\bpt\.?\s*name\s*[:\-]\s*(.+)/i,
    /\bname\s*[:\-]\s*(.+)/i,
  ],
  doctorName: [
    /(?:prescribed|treating|consulting)\s*by\s*[:\-]\s*(.+)/i,
    /physician\s*[:\-]\s*(.+)/i,
    /doctor\s*[:\-]\s*(.+)/i,
    /\bdr\.?\s*[:\-]\s*(.+)/i,
    /^(dr\.?\s+[a-z][a-z.\s]{2,40})$/i,
  ],
  diagnosis: [
    /diagnosis\s*[:\-]\s*(.+)/i,
    /\bdx\.?\s*[:\-]\s*(.+)/i,
    /impression\s*[:\-]\s*(.+)/i,
    /complaint\s*[:\-]\s*(.+)/i,
    /\bc\/o\s*[:\-]\s*(.+)/i,
  ],
};

function extractField(lines, patterns) {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim().replace(/[.,;]+$/, '');
        if (value.length >= 2 && value.length <= 120) {
          return { value, confidence: 0.85, sourceLine: line };
        }
      }
    }
  }
  return null;
}

export function extractPatientName(rawText) {
  if (!rawText) return null;
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return extractField(lines, FIELD_PATTERNS.patientName);
}

export function extractDoctorName(rawText) {
  if (!rawText) return null;
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return extractField(lines, FIELD_PATTERNS.doctorName);
}

export function extractDiagnosis(rawText) {
  if (!rawText) return null;
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return extractField(lines, FIELD_PATTERNS.diagnosis);
}

/**
 * Top-level orchestrator: runs every extractor over the raw OCR text and
 * returns a single structured payload, plus an overall confidence score
 * that blends field-level and medicine-level confidence.
 */
export function extractStructuredData(rawText) {
  const patientName = extractPatientName(rawText);
  const doctorName = extractDoctorName(rawText);
  const diagnosis = extractDiagnosis(rawText);
  const medicines = extractMedicines(rawText);

  const confidenceInputs = [
    patientName?.confidence,
    doctorName?.confidence,
    diagnosis?.confidence,
    ...medicines.map((m) => m.confidence),
  ].filter((v) => typeof v === 'number');

  const overallConfidence = confidenceInputs.length
    ? Number((confidenceInputs.reduce((a, b) => a + b, 0) / confidenceInputs.length).toFixed(2))
    : 0;

  return {
    patientName: patientName?.value || null,
    patientNameConfidence: patientName?.confidence || null,
    doctorName: doctorName?.value || null,
    doctorNameConfidence: doctorName?.confidence || null,
    diagnosis: diagnosis?.value || null,
    diagnosisConfidence: diagnosis?.confidence || null,
    medicines,
    overallConfidence,
  };
}
