// src/utils/clinicalAI.js
// MediCare Pro — Clinical AI Inference Engine
//
// Architecture: Pure rule-based inference layer + Anthropic API bridge.
// Rule engine runs instantly (no API call needed) for basic suggestions.
// The `generateAISummary()` function calls the Anthropic API for rich narrative.
// All functions are async-safe. No external dependencies beyond fetch.

import { computeRiskScore, resolveAge, parseBloodPressure } from "./riskEngine";
import { calculateBMI, getBMICategory } from "./patientHelpers";

// ─── Rule-Based Inference ─────────────────────────────────────────────────────

/**
 * Generate a set of clinical observations based solely on patient data.
 * Returns Array<{ type, message, severity }>
 * type: "warning" | "info" | "critical" | "suggestion"
 * severity: 1 (low) – 5 (critical)
 */
export const inferClinicalObservations = (patient) => {
  const obs = [];
  const push = (type, message, severity) => obs.push({ type, message, severity });

  const age      = resolveAge(patient.dob, patient.age);
  const chronic  = (patient.chronicDiseases    || "").toLowerCase();
  const allergies= (patient.allergies           || "").toLowerCase();
  const meds     = (patient.currentMedications  || "").toLowerCase();
  const bp       = parseBloodPressure(patient.bloodPressure);
  const spo2     = parseFloat(patient.oxygenSaturation);
  const pulse    = parseFloat(patient.pulse);
  const temp     = parseFloat(patient.temperature);
  const bmi      = parseFloat(calculateBMI(patient.height, patient.weight));

  // ── Vital sign observations ──────────────────────────────────────────────
  if (!isNaN(spo2)) {
    if (spo2 < 90)      push("critical",   `SpO₂ critically low at ${spo2}%. Immediate oxygen therapy required.`, 5);
    else if (spo2 < 94) push("warning",    `SpO₂ ${spo2}% — below normal. Monitor closely, consider supplemental O₂.`, 4);
    else if (spo2 < 96) push("info",       `SpO₂ ${spo2}% — mildly reduced. Continue monitoring.`, 2);
  }

  if (!isNaN(pulse)) {
    if (pulse > 150)    push("critical",   `Extreme tachycardia (${pulse} bpm). Immediate cardiac evaluation required.`, 5);
    else if (pulse > 120) push("warning",  `Tachycardia (${pulse} bpm). ECG and cardiac workup recommended.`, 4);
    else if (pulse < 40)  push("critical", `Extreme bradycardia (${pulse} bpm). Urgent cardiology consult.`, 5);
    else if (pulse < 55)  push("warning",  `Bradycardia (${pulse} bpm). Monitor for symptoms and hemodynamic stability.`, 3);
  }

  if (!isNaN(temp)) {
    if (temp >= 104)    push("critical",   `Hyperpyrexia (${temp}°F). Aggressive cooling and sepsis workup required.`, 5);
    else if (temp >= 103) push("warning",  `High fever (${temp}°F). Blood cultures and CBC recommended.`, 4);
    else if (temp >= 101) push("info",     `Low-grade fever (${temp}°F). Monitor and investigate source.`, 2);
    else if (temp < 96)   push("warning",  `Hypothermia (${temp}°F). Check thyroid, sepsis, and environmental causes.`, 3);
  }

  if (bp) {
    const { systolic: s, diastolic: d } = bp;
    if (s >= 180 || d >= 120)  push("critical", `Hypertensive crisis (${s}/${d} mmHg). Emergency intervention required.`, 5);
    else if (s >= 160)         push("warning",  `Stage 2 hypertension (${s}/${d} mmHg). Antihypertensive review needed.`, 4);
    else if (s >= 140)         push("info",     `Stage 1 hypertension (${s}/${d} mmHg). Lifestyle and medication review.`, 2);
    else if (s < 90)           push("critical", `Hypotension (${s}/${d} mmHg). IV fluids and shock protocol assessment.`, 5);
    else if (s < 100)          push("warning",  `Low BP (${s}/${d} mmHg). Monitor for orthostatic hypotension.`, 3);
  }

  // ── BMI observations ─────────────────────────────────────────────────────
  if (!isNaN(bmi)) {
    if (bmi >= 40)        push("warning",  `Morbid obesity (BMI ${bmi}). High perioperative and metabolic risk.`, 3);
    else if (bmi >= 30)   push("info",     `Obesity (BMI ${bmi}). Lifestyle intervention recommended.`, 2);
    else if (bmi < 16)    push("warning",  `Severely underweight (BMI ${bmi}). Nutritional assessment required.`, 3);
    else if (bmi < 18.5)  push("info",     `Underweight (BMI ${bmi}). Dietary review recommended.`, 1);
  }

  // ── Drug interactions / allergy-medication conflicts ──────────────────────
  if (allergies.includes("penicillin") && (meds.includes("amoxicillin") || meds.includes("ampicillin")))
    push("critical", "⚠️ ALLERGY CONFLICT: Patient is allergic to penicillin but prescribed a penicillin-class antibiotic.", 5);

  if (allergies.includes("sulfa") && meds.includes("sulfamethoxazole"))
    push("critical", "⚠️ ALLERGY CONFLICT: Sulfa allergy detected with sulfonamide medication.", 5);

  if (allergies.includes("aspirin") && meds.includes("aspirin"))
    push("critical", "⚠️ ALLERGY CONFLICT: Aspirin allergy on record with aspirin in medications.", 5);

  // ── Chronic disease management suggestions ────────────────────────────────
  if (chronic.includes("diabetes")) {
    if (!meds.includes("metformin") && !meds.includes("insulin") && !meds.includes("glipizide") && !meds.includes("glimepiride"))
      push("suggestion", "Diabetic patient has no documented antidiabetic medication. Verify prescription status.", 3);
    push("info", "Diabetic patient: ensure HbA1c monitoring every 3 months and fundus exam annually.", 1);
  }

  if (chronic.includes("hypertension")) {
    if (!meds.includes("amlodipine") && !meds.includes("losartan") && !meds.includes("atenolol") && !meds.includes("ramipril") && !meds.includes("telmisartan"))
      push("suggestion", "Hypertensive patient: no documented antihypertensive medication. Review required.", 3);
  }

  if (chronic.includes("kidney") || chronic.includes("renal")) {
    push("warning", "Renal impairment: check eGFR before prescribing NSAIDs, contrast agents, or aminoglycosides.", 3);
    push("info",    "Monitor electrolytes and creatinine at each visit.", 1);
  }

  if (chronic.includes("heart failure"))
    push("warning", "Heart failure: restrict sodium intake. Monitor daily weight and edema.", 3);

  if (chronic.includes("copd"))
    push("info", "COPD patient: avoid high-flow O₂ (target SpO₂ 88–92%). Ensure inhaler technique reviewed.", 2);

  // ── Age-specific ─────────────────────────────────────────────────────────
  if (age !== null && age >= 65) {
    push("info", "Elderly patient (≥65): screen for fall risk, polypharmacy, and cognitive function.", 1);
    if (meds.includes("benzodiazepine") || meds.includes("diazepam") || meds.includes("alprazolam"))
      push("warning", "Beers Criteria: benzodiazepine use in patient ≥65 — fall and cognitive risk. Consider deprescribing.", 3);
  }

  // ── Pregnancy ─────────────────────────────────────────────────────────────
  if ((patient.pregnancyStatus || "").toLowerCase() === "pregnant") {
    push("warning", "Pregnant patient: avoid NSAIDs, ACE inhibitors, and Category D/X medications.", 4);
    push("info",    "Ensure prenatal vitamins documented. Monitor BP for pre-eclampsia.", 2);
    if (chronic.includes("diabetes"))
      push("warning", "Gestational/pre-existing diabetes: monitor blood glucose every 1–2 hours during labour.", 4);
  }

  // ── Lifestyle ─────────────────────────────────────────────────────────────
  if ((patient.smoking || "").toLowerCase() === "yes")
    push("suggestion", "Active smoker: offer NRT and cessation counselling. Check spirometry if symptomatic.", 2);

  if ((patient.alcohol || "").toLowerCase() === "regular")
    push("suggestion", "Regular alcohol use: screen with CAGE questionnaire. Check LFTs.", 2);

  return obs.sort((a, b) => b.severity - a.severity);
};

// ─── Differential Suggestions ─────────────────────────────────────────────────

/**
 * Very basic rule-based differentials based on chief complaint keywords.
 * NOT a substitute for physician judgment — presented as "Consider" list only.
 */
export const suggestDifferentials = (disease = "") => {
  const d = disease.toLowerCase();
  const map = [
    { trigger: ["fever", "temperature"],         differentials: ["Viral URTI", "Malaria", "Typhoid", "Dengue", "UTI", "Pneumonia"] },
    { trigger: ["chest pain", "chest"],          differentials: ["ACS / STEMI", "NSTEMI", "Unstable Angina", "Pericarditis", "Aortic Dissection", "GERD", "Musculoskeletal"] },
    { trigger: ["shortness of breath", "dyspnea","breathlessness"], differentials: ["Pneumonia", "COPD Exacerbation", "Pulmonary Embolism", "Heart Failure", "Asthma", "Pleural Effusion"] },
    { trigger: ["headache"],                     differentials: ["Migraine", "Tension-type HA", "Hypertensive HA", "Meningitis", "Subarachnoid Haemorrhage", "Sinusitis"] },
    { trigger: ["abdominal pain", "stomach"],    differentials: ["Appendicitis", "Peptic Ulcer", "Cholecystitis", "Pancreatitis", "Renal Colic", "IBS", "Ectopic Pregnancy"] },
    { trigger: ["vomiting", "nausea"],           differentials: ["Gastroenteritis", "Food Poisoning", "Appendicitis", "Raised ICP", "Drug Side Effect"] },
    { trigger: ["dizziness", "vertigo"],         differentials: ["BPPV", "Vestibular Neuritis", "Meniere's Disease", "Orthostatic Hypotension", "TIA"] },
    { trigger: ["weakness", "fatigue"],          differentials: ["Anaemia", "Hypothyroidism", "Diabetes", "Depression", "Heart Failure", "Malignancy"] },
    { trigger: ["joint pain", "arthritis"],      differentials: ["Osteoarthritis", "Rheumatoid Arthritis", "Gout", "Septic Arthritis", "Reactive Arthritis"] },
    { trigger: ["rash", "skin"],                 differentials: ["Urticaria", "Contact Dermatitis", "Drug Eruption", "Chickenpox", "Dengue", "Psoriasis"] },
  ];

  const matched = map.find((entry) => entry.trigger.some((t) => d.includes(t)));
  return matched ? matched.differentials : [];
};

// ─── Anthropic API Bridge ─────────────────────────────────────────────────────

/**
 * Build the structured prompt payload sent to Claude for AI narrative.
 * Kept separate so it can be unit-tested without an API call.
 */
export const buildAIPrompt = (patient) => {
  const age       = resolveAge(patient.dob, patient.age);
  const risk      = computeRiskScore(patient);
  const bmi       = calculateBMI(patient.height, patient.weight);
  const bmiCat    = getBMICategory(bmi);
  const obs       = inferClinicalObservations(patient);
  const diffs     = suggestDifferentials(patient.disease);

  return `You are a clinical decision support AI within MediCare Pro, an enterprise EMR system.
Provide a concise structured clinical summary for the following patient. Be factual, objective, and medically precise.
Do NOT diagnose. Present findings as "noted", "observed", or "warrants consideration".

PATIENT DATA:
- Name: ${patient.name} | ID: ${patient.id}
- Age: ${age ?? "Not recorded"} | Gender: ${patient.gender} | DOB: ${patient.dob || "Not recorded"}
- Blood Group: ${patient.bloodGroup || "Unknown"}
- Chief Complaint: ${patient.disease || "Not recorded"}
- Status: ${patient.status || "Unknown"} | Priority: ${patient.priority || "Normal"}
- Risk Score: ${risk.score} (${risk.level})

VITALS:
- BP: ${patient.bloodPressure || "NR"} | Pulse: ${patient.pulse || "NR"} bpm | Temp: ${patient.temperature || "NR"}°F
- SpO₂: ${patient.oxygenSaturation || "NR"}% | RR: ${patient.respiratoryRate || "NR"}/min
- Height: ${patient.height || "NR"} cm | Weight: ${patient.weight || "NR"} kg | BMI: ${bmi || "NR"} (${bmiCat})

MEDICAL HISTORY:
- Chronic Diseases: ${patient.chronicDiseases || "None"}
- Allergies: ${patient.allergies || "None"}
- Current Medications: ${patient.currentMedications || "None"}
- Medical History: ${patient.medicalHistory || "None"}
- Smoking: ${patient.smoking} | Alcohol: ${patient.alcohol} | Pregnancy: ${patient.pregnancyStatus}

RULE-BASED FLAGS (${obs.length} observations):
${obs.map((o) => `[${o.type.toUpperCase()}] ${o.message}`).join("\n") || "None"}

DIFFERENTIAL CONSIDERATIONS: ${diffs.length > 0 ? diffs.join(", ") : "None auto-suggested"}

Respond ONLY in this JSON format (no markdown, no code fences):
{
  "summary": "<2–3 sentence clinical overview>",
  "keyFindings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "riskNarrative": "<1–2 sentence explanation of the risk score>",
  "recommendedActions": ["<action 1>", "<action 2>", "<action 3>"],
  "differentialsNote": "<brief note on differential considerations>",
  "urgencyLevel": "Routine | Urgent | Emergency",
  "followUpInterval": "<e.g. 24 hours, 1 week, 1 month>"
}`;
};

/**
 * Call the Anthropic API and return a parsed clinical summary.
 * Falls back to a rule-based summary if the API call fails.
 *
 * @param {Object} patient
 * @returns {Promise<Object>} parsed JSON summary
 */
export const generateAISummary = async (patient) => {
  const prompt = buildAIPrompt(patient);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const raw  = data.content?.find((c) => c.type === "text")?.text || "";

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/gi, "").trim();
    return JSON.parse(clean);

  } catch (err) {
    console.warn("clinicalAI: API call failed, using rule-based fallback.", err);
    return buildFallbackSummary(patient);
  }
};

// ─── Rule-Based Fallback Summary ──────────────────────────────────────────────

const buildFallbackSummary = (patient) => {
  const risk = computeRiskScore(patient);
  const obs  = inferClinicalObservations(patient);
  const age  = resolveAge(patient.dob, patient.age);

  const urgencyMap = { Critical: "Emergency", High: "Urgent", Medium: "Urgent", Low: "Routine" };

  return {
    summary: `${patient.name}, ${age ?? "age unknown"}-year-old ${patient.gender}, presenting with ${patient.disease || "unspecified complaint"}. Risk score: ${risk.score} (${risk.level}).`,
    keyFindings: obs.slice(0, 3).map((o) => o.message) || ["No critical findings detected."],
    riskNarrative: `Patient has a risk score of ${risk.score}, classified as ${risk.level}. Top contributing factor: ${risk.factors[0]?.label || "none"}.`,
    recommendedActions: risk.recommendations.slice(0, 3).map((r) => r.text) || ["Routine monitoring."],
    differentialsNote: `Consider: ${suggestDifferentials(patient.disease).slice(0, 4).join(", ") || "No auto-suggestions for this complaint."}`,
    urgencyLevel: urgencyMap[risk.level] || "Routine",
    followUpInterval: risk.level === "Critical" ? "Immediate" : risk.level === "High" ? "24–48 hours" : "1 week",
    _source: "rule-based-fallback",
  };
};

export default generateAISummary;