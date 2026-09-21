// backend/services/questionRegistry/ayushQuestions.js
//
// Extensible AYUSH patient-history question set.
//
// IMPORTANT (Phase 2 Final Design, item 4): Team 1 only COLLECTS
// patient-reported AYUSH information. Team 1 does NOT interpret any of
// these dimensions — no Prakriti "type" is computed, no Vikriti
// conclusion is drawn, no Samprapti chain is reasoned about here.
// Each entry is stored as a plain patient-reported fact with the same
// provenance/certainty rules as every other section. Team 4 owns all
// clinical interpretation of this data.
//
// The list is data, not schema — Team 4 (or a later Team 1 update) can
// extend it without changing the ClinicalHistory contract, because
// ayushHistory is stored as an array of {key,label,value,...} entries,
// not a fixed set of named object properties.

export const AYUSH_QUESTIONS = [
  { questionId: "ayush.prakriti", key: "prakriti", label: "Prakriti (constitution)", section: "ayushHistory", questionText: "How would you describe your general body constitution or nature (e.g. build, temperature preference, appetite)?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Prakriti information (collection only, no interpretation).", priority: 200 },
  { questionId: "ayush.vikriti", key: "vikriti", label: "Vikriti (current imbalance)", section: "ayushHistory", questionText: "Have you noticed any recent change in your usual state of health or balance?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Vikriti information.", priority: 201 },
  { questionId: "ayush.sara", key: "sara", label: "Sara (tissue quality)", section: "ayushHistory", questionText: "How would you describe your skin, hair, and nail quality?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Sara information.", priority: 202 },
  { questionId: "ayush.samhanana", key: "samhanana", label: "Samhanana (body compactness)", section: "ayushHistory", questionText: "How would you describe your body build and muscle tone?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Samhanana information.", priority: 203 },
  { questionId: "ayush.pramana", key: "pramana", label: "Pramana (body measurements)", section: "ayushHistory", questionText: "Any relevant details about your height, weight, or build you'd like to share?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Pramana information.", priority: 204 },
  { questionId: "ayush.satmya", key: "satmya", label: "Satmya (suitability)", section: "ayushHistory", questionText: "Are there any foods, climates, or habits that particularly suit or disagree with you?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Satmya information.", priority: 205 },
  { questionId: "ayush.sattva", key: "sattva", label: "Sattva (mental disposition)", section: "ayushHistory", questionText: "How would you describe your general mental disposition or how you handle stress?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Sattva information.", priority: 206 },
  { questionId: "ayush.aharaShakti", key: "aharaShakti", label: "Ahara Shakti (digestive capacity)", section: "ayushHistory", questionText: "How would you describe your digestion and appetite?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Ahara Shakti information.", priority: 207 },
  { questionId: "ayush.vyayamaShakti", key: "vyayamaShakti", label: "Vyayama Shakti (exercise capacity)", section: "ayushHistory", questionText: "How much physical activity or exercise can you comfortably do?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Vyayama Shakti information.", priority: 208 },
  { questionId: "ayush.vaya", key: "vaya", label: "Vaya (age-related factors)", section: "ayushHistory", questionText: "Any age-related health concerns you'd like to mention?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Vaya information.", priority: 209 },
  { questionId: "ayush.ahara", key: "ahara", label: "Ahara (dietary habits)", section: "ayushHistory", questionText: "Can you describe your typical daily diet?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Ahara information.", priority: 210 },
  { questionId: "ayush.vihara", key: "vihara", label: "Vihara (lifestyle/routine)", section: "ayushHistory", questionText: "Can you describe your typical daily routine and lifestyle?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Vihara information.", priority: 211 },
  { questionId: "ayush.nidana", key: "nidana", label: "Nidana (perceived cause)", section: "ayushHistory", questionText: "What do you think may have caused or triggered this problem?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Nidana information.", priority: 212 },
  { questionId: "ayush.samprapti", key: "samprapti", label: "Samprapti (course of the problem)", section: "ayushHistory", questionText: "How has this problem changed or progressed over time?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Patient-reported Samprapti information.", priority: 213 },
];
