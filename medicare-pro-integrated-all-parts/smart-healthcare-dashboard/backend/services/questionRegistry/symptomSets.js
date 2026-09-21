// backend/services/questionRegistry/symptomSets.js
//
// Symptom-specific History of Present Illness (HPI) question sets.
// Selection between these sets is done by questionEngine.classifySymptom(),
// which is a deterministic keyword match — never a diagnosis, only a
// question-set selector (Phase 2 Final Design, section 5).

export const CHEST_PAIN_SET = {
  category: "CHEST_PAIN",
  matchKeywords: ["chest pain", "chest tightness", "chest pressure", "chest discomfort"],
  questions: [
    { questionId: "hpi.chestpain.onset", section: "historyOfPresentIllness", questionText: "When did the chest pain start?", answerType: "TEXT", required: true, clinicalPurpose: "Onset.", priority: 10 },
    { questionId: "hpi.chestpain.duration", section: "historyOfPresentIllness", questionText: "How long does each episode of pain last?", answerType: "DURATION", required: true, clinicalPurpose: "Duration.", priority: 11 },
    { questionId: "hpi.chestpain.location", section: "historyOfPresentIllness", questionText: "Where exactly do you feel the pain?", answerType: "TEXT", required: true, clinicalPurpose: "Location.", priority: 12 },
    { questionId: "hpi.chestpain.character", section: "historyOfPresentIllness", questionText: "How would you describe the pain (sharp, dull, burning, pressure)?", answerType: "SINGLE_SELECT", options: ["Sharp", "Dull", "Burning", "Pressure/Squeezing", "Other"], required: true, clinicalPurpose: "Character.", priority: 13 },
    { questionId: "hpi.chestpain.severity", section: "historyOfPresentIllness", questionText: "On a scale of 1 to 10, how severe is the pain?", answerType: "SCALE", required: true, clinicalPurpose: "Severity.", priority: 14 },
    { questionId: "hpi.chestpain.radiation", section: "historyOfPresentIllness", questionText: "Does the pain spread anywhere else, like your arm, jaw, or back?", answerType: "TEXT", required: true, clinicalPurpose: "Radiation.", priority: 15 },
    { questionId: "hpi.chestpain.aggravating", section: "historyOfPresentIllness", questionText: "Does anything make the pain worse (activity, breathing, lying down)?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Aggravating factors.", priority: 16 },
    { questionId: "hpi.chestpain.relieving", section: "historyOfPresentIllness", questionText: "Does anything make the pain better (rest, medication)?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Relieving factors.", priority: 17 },
    { questionId: "hpi.chestpain.associated", section: "historyOfPresentIllness", questionText: "Are you also experiencing shortness of breath, sweating, nausea, or dizziness?", answerType: "MULTI_SELECT", options: ["Shortness of breath", "Sweating", "Nausea", "Dizziness", "None of these"], required: true, clinicalPurpose: "Associated symptoms.", priority: 18 },
  ],
};

export const HEADACHE_SET = {
  category: "HEADACHE",
  matchKeywords: ["headache", "head pain", "migraine"],
  questions: [
    { questionId: "hpi.headache.onset", section: "historyOfPresentIllness", questionText: "When did the headache start?", answerType: "TEXT", required: true, clinicalPurpose: "Onset.", priority: 10 },
    { questionId: "hpi.headache.location", section: "historyOfPresentIllness", questionText: "Where is the pain located (one side, both sides, front, back)?", answerType: "TEXT", required: true, clinicalPurpose: "Location.", priority: 11 },
    { questionId: "hpi.headache.severity", section: "historyOfPresentIllness", questionText: "On a scale of 1 to 10, how severe is the headache?", answerType: "SCALE", required: true, clinicalPurpose: "Severity.", priority: 12 },
    { questionId: "hpi.headache.duration", section: "historyOfPresentIllness", questionText: "How long has the headache lasted, or how long do episodes last?", answerType: "DURATION", required: true, clinicalPurpose: "Duration.", priority: 13 },
    { questionId: "hpi.headache.pattern", section: "historyOfPresentIllness", questionText: "Is it constant, or does it come and go?", answerType: "SINGLE_SELECT", options: ["Constant", "Comes and goes", "Not sure"], required: true, clinicalPurpose: "Pattern.", priority: 14 },
    { questionId: "hpi.headache.associated", section: "historyOfPresentIllness", questionText: "Do you also have nausea, visual changes, or sensitivity to light?", answerType: "MULTI_SELECT", options: ["Nausea", "Visual changes", "Light sensitivity", "None of these"], required: true, clinicalPurpose: "Associated symptoms.", priority: 15 },
  ],
};

/** Fallback set used when the chief complaint doesn't match a known keyword set. */
export const GENERIC_HPI_SET = {
  category: "GENERIC",
  matchKeywords: [],
  questions: [
    { questionId: "hpi.generic.onset", section: "historyOfPresentIllness", questionText: "When did this problem start?", answerType: "TEXT", required: true, clinicalPurpose: "Onset.", priority: 10 },
    { questionId: "hpi.generic.duration", section: "historyOfPresentIllness", questionText: "How long has it been going on?", answerType: "DURATION", required: true, clinicalPurpose: "Duration.", priority: 11 },
    { questionId: "hpi.generic.severity", section: "historyOfPresentIllness", questionText: "On a scale of 1 to 10, how severe would you say it is?", answerType: "SCALE", required: true, clinicalPurpose: "Severity.", priority: 12 },
    { questionId: "hpi.generic.associated", section: "historyOfPresentIllness", questionText: "Are there any other symptoms along with this?", answerType: "LONG_TEXT", required: false, clinicalPurpose: "Associated symptoms.", priority: 13 },
  ],
};

export const SYMPTOM_SETS = [CHEST_PAIN_SET, HEADACHE_SET];
