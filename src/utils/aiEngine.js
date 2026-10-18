// src/utils/aiEngine.js

const SYMPTOM_RULES = [
  {
    keywords: ["fever", "temperature", "chills", "body ache"],
    disease: "Viral Fever / Infection",
    specialty: "General Medicine",
    baseRisk: 2,
  },
  {
    keywords: ["chest pain", "breathlessness", "shortness of breath", "palpitation"],
    disease: "Cardiac / Respiratory Concern",
    specialty: "Cardiology",
    baseRisk: 5,
  },
  {
    keywords: ["headache", "vomiting", "blurred vision", "seizure"],
    disease: "Neurological Concern",
    specialty: "Neurology",
    baseRisk: 4,
  },
  {
    keywords: ["abdominal pain", "vomiting", "diarrhea", "acidity"],
    disease: "Gastrointestinal Disorder",
    specialty: "Gastroenterology",
    baseRisk: 3,
  },
  {
    keywords: ["injury", "fracture", "sprain", "fall", "bleeding"],
    disease: "Trauma / Orthopedic Concern",
    specialty: "Orthopedics",
    baseRisk: 4,
  },
  {
    keywords: ["cough", "sputum", "asthma", "wheezing"],
    disease: "Respiratory Infection / Asthma",
    specialty: "Pulmonology",
    baseRisk: 3,
  },
  {
    keywords: ["rash", "itching", "allergy", "hives"],
    disease: "Allergic / Dermatologic Condition",
    specialty: "Dermatology",
    baseRisk: 1,
  },
  {
    keywords: ["pregnancy", "bleeding", "labor", "delivery"],
    disease: "Obstetric Concern",
    specialty: "Gynecology",
    baseRisk: 4,
  },
];

const HIGH_RISK_FLAGS = [
  "chest pain",
  "shortness of breath",
  "breathlessness",
  "unconscious",
  "seizure",
  "bleeding",
  "severe",
  "critical",
  "oxygen low",
  "spo2 low",
];

const VITAL_RISK = {
  bpHigh: 2,
  bpLow: 2,
  pulseHigh: 1,
  pulseLow: 1,
  tempHigh: 1,
  spo2Low: 3,
};

function normalize(text = "") {
  return String(text).toLowerCase().trim();
}

export function mapSymptomsToDisease(input = "") {
  const text = normalize(input);

  for (const rule of SYMPTOM_RULES) {
    const matched = rule.keywords.filter((k) => text.includes(k));
    if (matched.length > 0) {
      return {
        disease: rule.disease,
        specialty: rule.specialty,
        confidence: Math.min(95, 60 + matched.length * 10),
        baseRisk: rule.baseRisk,
        matchedKeywords: matched,
      };
    }
  }

  return {
    disease: "General Consultation Required",
    specialty: "General Medicine",
    confidence: 35,
    baseRisk: 1,
    matchedKeywords: [],
  };
}

export function calculateRiskScore(patient = {}) {
  const symptoms = normalize([patient.disease, patient.visitNotes, patient.chronicDiseases, patient.allergies].filter(Boolean).join(" "));
  let score = 0;

  const mapped = mapSymptomsToDisease(symptoms);
  score += mapped.baseRisk * 2;

  HIGH_RISK_FLAGS.forEach((flag) => {
    if (symptoms.includes(flag)) score += 3;
  });

  if (String(patient.priority || "").toLowerCase() === "critical") score += 5;
  if (String(patient.status || "").toLowerCase() === "critical") score += 4;

  const bp = normalize(patient.bloodPressure || "");
  const pulse = Number(patient.pulse || 0);
  const temp = Number(patient.temperature || 0);
  const spo2 = Number(patient.oxygenSaturation || 0);

  if (bp.includes("180") || bp.includes("200") || bp.includes("90/60")) score += VITAL_RISK.bpHigh;
  if (pulse >= 120 || pulse <= 45) score += VITAL_RISK.pulseHigh;
  if (temp >= 102) score += VITAL_RISK.tempHigh;
  if (spo2 > 0 && spo2 < 94) score += VITAL_RISK.spo2Low;

  if (Array.isArray(patient.family) && patient.family.some((m) => m.isEmergency)) score += 1;
  if (normalize(patient.smoking) === "yes" || normalize(patient.smoking) === "former") score += 1;
  if (normalize(patient.alcohol) === "regular") score += 1;

  return Math.min(10, score);
}

export function getRiskBand(score = 0) {
  if (score >= 8) return "Critical";
  if (score >= 5) return "High";
  if (score >= 2) return "Moderate";
  return "Low";
}

export function recommendDoctor(patient = {}, staffList = []) {
  const text = [patient.disease, patient.visitNotes, patient.chronicDiseases].filter(Boolean).join(" ");
  const mapped = mapSymptomsToDisease(text);
  const specialty = mapped.specialty;

  const candidates = staffList.filter(
    (s) =>
      s &&
      String(s.role || "").toLowerCase() === "doctor" &&
      (String(s.department?.name || "").toLowerCase().includes(String(specialty).toLowerCase()) ||
        String(s.specialization || "").toLowerCase().includes(String(specialty).toLowerCase()))
  );

  if (candidates.length > 0) {
    return {
      specialty,
      doctor: candidates[0],
      reason: `Matches ${specialty} based on symptom pattern.`,
    };
  }

  const fallback = staffList.find((s) => String(s.role || "").toLowerCase() === "doctor");
  return {
    specialty,
    doctor: fallback || null,
    reason: fallback
      ? `No exact specialty match found. Routed to available doctor.`
      : `No doctor available in staff list.`,
  };
}

export function aiClinicalInsight(patient = {}, staffList = []) {
  const mapped = mapSymptomsToDisease(
    [patient.disease, patient.visitNotes, patient.chronicDiseases, patient.allergies].filter(Boolean).join(" ")
  );
  const riskScore = calculateRiskScore(patient);
  const riskBand = getRiskBand(riskScore);
  const doctorRec = recommendDoctor(patient, staffList);

  return {
    mappedDisease: mapped.disease,
    specialty: mapped.specialty,
    confidence: mapped.confidence,
    riskScore,
    riskBand,
    doctorRec,
    alerts: buildAlerts(patient, riskBand),
  };
}

function buildAlerts(patient, riskBand) {
  const alerts = [];
  if (riskBand === "Critical") alerts.push("Immediate escalation recommended.");
  if (normalize(patient.oxygenSaturation || "") && Number(patient.oxygenSaturation) < 94) alerts.push("Low oxygen saturation.");
  if (String(patient.status || "").toLowerCase() === "critical") alerts.push("Marked critical by staff.");
  return alerts;
}