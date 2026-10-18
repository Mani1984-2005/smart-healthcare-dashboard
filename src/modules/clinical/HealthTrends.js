// src/utils/healthTrends.js
// MediCare Pro — Health Trends & Analytics Engine
//
// Processes timeline, vitals snapshots, and lab results into
// chart-ready data series and trend summaries.
// All functions are pure and synchronous. No API calls.

import { parseBloodPressure, resolveAge } from "./riskEngine";

// ─── Types (JSDoc for IDE support) ───────────────────────────────────────────
/**
 * @typedef {Object} TrendPoint
 * @property {string} date    - ISO date string
 * @property {number} value   - numeric value
 * @property {string} [label] - optional display label
 */

/**
 * @typedef {Object} TrendSeries
 * @property {string}       name    - series label
 * @property {TrendPoint[]} data    - sorted ascending by date
 * @property {string}       unit    - display unit (e.g. "bpm", "mmHg", "%")
 * @property {{ min, max }} range   - normal reference range
 * @property {string}       trend   - "up" | "down" | "stable" | "insufficient"
 * @property {number|null}  latest  - most recent value
 * @property {number|null}  change  - latest - previous (null if only one point)
 */

// ─── Reference Ranges ────────────────────────────────────────────────────────

export const VITAL_RANGES = {
  pulse:            { min: 60,  max: 100,  unit: "bpm",  label: "Heart Rate"       },
  oxygenSaturation: { min: 95,  max: 100,  unit: "%",    label: "SpO₂"             },
  temperature:      { min: 97,  max: 99,   unit: "°F",   label: "Temperature"      },
  respiratoryRate:  { min: 12,  max: 20,   unit: "/min", label: "Respiratory Rate" },
  bpSystolic:       { min: 90,  max: 140,  unit: "mmHg", label: "Systolic BP"      },
  bpDiastolic:      { min: 60,  max: 90,   unit: "mmHg", label: "Diastolic BP"     },
};

// ─── Vitals Snapshot Extraction ───────────────────────────────────────────────

/**
 * Extract a single vitals snapshot object from a patient record.
 * Returns an object with numeric values or null for each vital.
 */
export const extractVitalsSnapshot = (patient, date = null) => {
  const bp = parseBloodPressure(patient.bloodPressure);
  return {
    date:             date || patient.registeredDate || new Date().toISOString().split("T")[0],
    pulse:            parseFloatOrNull(patient.pulse),
    oxygenSaturation: parseFloatOrNull(patient.oxygenSaturation),
    temperature:      parseFloatOrNull(patient.temperature),
    respiratoryRate:  parseFloatOrNull(patient.respiratoryRate),
    bpSystolic:       bp ? bp.systolic  : null,
    bpDiastolic:      bp ? bp.diastolic : null,
    weight:           parseFloatOrNull(patient.weight),
    height:           parseFloatOrNull(patient.height),
  };
};

// ─── Timeline-based Vitals History ───────────────────────────────────────────

/**
 * Build trend series from `patient.vitalsHistory` — an optional array of
 * historical snapshots saved over time. If not present, returns a single-point
 * series from the current vitals fields.
 *
 * Future: PatientsPage should push a snapshot to vitalsHistory whenever a
 * patient's vitals are updated (Phase 6 integration point).
 *
 * @param {Object} patient
 * @returns {Object.<string, TrendSeries>}  keyed by vital field name
 */
export const buildVitalsTrends = (patient) => {
  const history = Array.isArray(patient.vitalsHistory) && patient.vitalsHistory.length > 0
    ? patient.vitalsHistory
    : [extractVitalsSnapshot(patient)];  // fallback: current vitals as sole point

  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

  const fields = ["pulse", "oxygenSaturation", "temperature", "respiratoryRate", "bpSystolic", "bpDiastolic"];
  const result = {};

  for (const field of fields) {
    const points = sorted
      .filter((s) => s[field] !== null && s[field] !== undefined)
      .map((s) => ({ date: s.date, value: s[field] }));

    if (points.length === 0) continue;

    const latest   = points[points.length - 1].value;
    const previous = points.length > 1 ? points[points.length - 2].value : null;
    const change   = previous !== null ? +(latest - previous).toFixed(2) : null;
    const range    = VITAL_RANGES[field];

    result[field] = {
      name:    range?.label || field,
      data:    points,
      unit:    range?.unit  || "",
      range:   range ? { min: range.min, max: range.max } : null,
      trend:   deriveTrend(points),
      latest,
      change,
      isOutOfRange: range ? (latest < range.min || latest > range.max) : false,
    };
  }

  return result;
};

// ─── Lab Result Trends ────────────────────────────────────────────────────────

/**
 * Group lab reports by test name and build a trend series for each.
 * Expects localStorage `lab_tests` array format used by the LIS module.
 *
 * @param {string} patientId
 * @param {string} patientName
 * @returns {Object.<string, TrendSeries>}
 */
export const buildLabTrends = (patientId, patientName) => {
  let reports = [];
  try {
    const all = JSON.parse(localStorage.getItem("lab_tests") || "[]");
    reports = all.filter((l) => l.patientId === patientId || l.patientName === patientName);
  } catch { return {}; }

  // Group by test name
  const grouped = {};
  for (const report of reports) {
    const name = report.testName || report.profileName || "Unknown";
    if (!grouped[name]) grouped[name] = [];
    // Only include reports with a numeric result value
    const val = parseFloatOrNull(report.resultValue ?? report.value);
    if (val !== null && report.requestDate) {
      grouped[name].push({ date: report.requestDate, value: val, unit: report.unit || "" });
    }
  }

  const result = {};
  for (const [name, points] of Object.entries(grouped)) {
    if (points.length === 0) continue;
    const sorted   = points.sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest   = sorted[sorted.length - 1].value;
    const previous = sorted.length > 1 ? sorted[sorted.length - 2].value : null;
    result[name] = {
      name,
      data:    sorted,
      unit:    sorted[0].unit,
      range:   null,   // lab-specific ranges come from LIS module
      trend:   deriveTrend(sorted),
      latest,
      change:  previous !== null ? +(latest - previous).toFixed(2) : null,
    };
  }
  return result;
};

// ─── Visit Frequency ──────────────────────────────────────────────────────────

/**
 * Build a monthly visit frequency series from the patient's timeline.
 * Returns Array<{ month: "YYYY-MM", count: number }>
 */
export const buildVisitFrequency = (timeline = []) => {
  const consultations = timeline.filter((t) => t.type === "Consultation");
  const freq = {};
  for (const t of consultations) {
    const month = (t.date || "").slice(0, 7);
    if (month) freq[month] = (freq[month] || 0) + 1;
  }
  return Object.entries(freq)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
};

// ─── Health Score ─────────────────────────────────────────────────────────────

/**
 * Compute a 0–100 health score (higher = better health).
 * Inverse of risk score, normalized and clamped.
 *
 * @param {Object} riskResult - output of computeRiskScore()
 * @returns {number} 0–100
 */
export const computeHealthScore = (riskResult) => {
  const rawScore = riskResult?.score ?? 0;
  // Risk 0 → Health 100; Risk 80+ → Health ≤ 0
  const health = Math.max(0, Math.min(100, Math.round(100 - rawScore * 1.25)));
  return health;
};

/**
 * Map health score to a display category.
 */
export const healthScoreCategory = (score) => {
  if (score >= 80) return { label: "Excellent",   color: "text-green-600",  bg: "bg-green-100"  };
  if (score >= 60) return { label: "Good",         color: "text-teal-600",   bg: "bg-teal-100"   };
  if (score >= 40) return { label: "Fair",         color: "text-yellow-600", bg: "bg-yellow-100" };
  if (score >= 20) return { label: "Poor",         color: "text-orange-500", bg: "bg-orange-100" };
  return              { label: "Critical",         color: "text-red-600",    bg: "bg-red-100"    };
};

// ─── Trend Prediction (simple linear extrapolation) ──────────────────────────

/**
 * Given a trend series, extrapolate the next expected value N steps ahead.
 * Uses simple linear regression. Returns null if fewer than 2 points.
 *
 * @param {TrendPoint[]} points
 * @param {number} stepsAhead
 * @returns {number|null}
 */
export const extrapolateNextValue = (points, stepsAhead = 1) => {
  if (points.length < 2) return null;
  const n = points.length;
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.value);

  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);

  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return +( slope * (n - 1 + stepsAhead) + intercept ).toFixed(2);
};

// ─── Summary for dashboard cards ─────────────────────────────────────────────

/**
 * Returns a compact trends summary object suitable for a dashboard card.
 * @param {Object} patient
 * @param {Object} riskResult - from computeRiskScore
 */
export const buildTrendsSummary = (patient, riskResult) => {
  const vitalTrends = buildVitalsTrends(patient);
  const visitFreq   = buildVisitFrequency(patient.timeline);
  const healthScore = computeHealthScore(riskResult);
  const category    = healthScoreCategory(healthScore);

  const outOfRange = Object.values(vitalTrends).filter((s) => s.isOutOfRange).map((s) => s.name);

  const totalVisits  = (patient.timeline || []).filter((t) => t.type === "Consultation").length;
  const lastVisitDate = visitFreq.length > 0 ? visitFreq[visitFreq.length - 1].month : null;

  return {
    healthScore,
    category,
    outOfRangeVitals: outOfRange,
    vitalTrends,
    visitFrequency:   visitFreq,
    totalVisits,
    lastVisitDate,
    riskLevel: riskResult?.level || "Low",
    riskScore: riskResult?.score || 0,
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseFloatOrNull = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

/**
 * Derive a trend direction from a series of points.
 * "up" if last 2 values increasing, "down" if decreasing, else "stable".
 */
const deriveTrend = (points) => {
  if (points.length < 2) return "insufficient";
  const last     = points[points.length - 1].value;
  const previous = points[points.length - 2].value;
  const delta    = last - previous;
  if (delta > previous * 0.03)  return "up";
  if (delta < -previous * 0.03) return "down";
  return "stable";
};

export default buildVitalsTrends;