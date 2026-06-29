// backend/utils/mlEngineStub.js
class MLEngineStub {
  predictDiagnosis(input = {}) {
    const text = String(
      [input.symptoms, input.notes, input.disease, input.chronicDiseases]
        .filter(Boolean)
        .join(" ")
    ).toLowerCase();

    const rules = [
      { keys: ["fever", "chills", "body ache"], diagnosis: "Viral Fever", confidence: 0.72 },
      { keys: ["chest pain", "breathlessness"], diagnosis: "Cardiac Concern", confidence: 0.81 },
      { keys: ["headache", "vomiting"], diagnosis: "Neurological Concern", confidence: 0.66 },
      { keys: ["abdominal pain", "diarrhea"], diagnosis: "GI Disorder", confidence: 0.63 },
      { keys: ["injury", "fracture", "bleeding"], diagnosis: "Trauma / Orthopedic", confidence: 0.78 },
    ];

    for (const rule of rules) {
      if (rule.keys.some((k) => text.includes(k))) {
        return {
          model: "rule-based-stub",
          diagnosis: rule.diagnosis,
          confidence: rule.confidence,
          explainability: "Matched symptom keywords against rule set.",
        };
      }
    }

    return {
      model: "rule-based-stub",
      diagnosis: "General Consultation Required",
      confidence: 0.35,
      explainability: "No rule matched, fallback response returned.",
    };
  }

  predictPriority(input = {}) {
    const text = String([input.symptoms, input.notes].filter(Boolean).join(" ")).toLowerCase();
    let score = 1;

    if (text.includes("chest pain")) score += 4;
    if (text.includes("breathlessness") || text.includes("shortness of breath")) score += 4;
    if (text.includes("unconscious") || text.includes("seizure")) score += 5;
    if (text.includes("bleeding")) score += 3;
    if (text.includes("fever")) score += 1;

    return {
      model: "rule-based-stub",
      score: Math.min(score, 10),
      band: score >= 8 ? "Critical" : score >= 5 ? "High" : "Normal",
    };
  }

  recommendDepartment(input = {}) {
    const diagnosis = this.predictDiagnosis(input).diagnosis;

    const mapping = {
      "Cardiac Concern": "Cardiology",
      "Trauma / Orthopedic": "Orthopedics",
      "Neurological Concern": "Neurology",
      "GI Disorder": "Gastroenterology",
      "Viral Fever": "General Medicine",
    };

    return {
      model: "rule-based-stub",
      department: mapping[diagnosis] || "General Medicine",
      diagnosis,
    };
  }
}

module.exports = new MLEngineStub();