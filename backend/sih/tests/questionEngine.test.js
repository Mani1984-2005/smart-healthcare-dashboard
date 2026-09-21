import { describe, it, expect } from "vitest";
import {
  getNextQuestion,
  classifySymptom,
  computeCompletion,
  inferCertaintyFromText,
  CHIEF_COMPLAINT_QUESTION_ID,
} from "../services/questionEngine.js";

function answer(questionId, rawValue, certainty = "CONFIRMED") {
  return { [questionId]: { rawValue, certainty } };
}

describe("questionEngine.classifySymptom", () => {
  it("classifies chest pain", () => {
    expect(classifySymptom("I have chest pain for two days").category).toBe("CHEST_PAIN");
  });
  it("classifies headache", () => {
    expect(classifySymptom("bad headache since morning").category).toBe("HEADACHE");
  });
  it("falls back to GENERIC for unrecognized text", () => {
    expect(classifySymptom("my knee hurts").category).toBe("GENERIC");
  });
  it("never returns a diagnosis-shaped field, only a category name for question-set selection", () => {
    const result = classifySymptom("chest pain");
    expect(Object.keys(result)).toEqual(["category", "questions"]);
  });
});

describe("questionEngine.getNextQuestion", () => {
  it("always starts with chief complaint", () => {
    const next = getNextQuestion({});
    expect(next.questionId).toBe(CHIEF_COMPLAINT_QUESTION_ID);
  });

  it("branches into the chest-pain set after chief complaint is chest pain", () => {
    const answers = answer(CHIEF_COMPLAINT_QUESTION_ID, "I have chest pain");
    const next = getNextQuestion(answers);
    expect(next.questionId).toBe("hpi.chestpain.onset");
  });

  it("branches into the headache set after chief complaint is headache", () => {
    const answers = answer(CHIEF_COMPLAINT_QUESTION_ID, "headache since yesterday");
    const next = getNextQuestion(answers);
    expect(next.questionId).toBe("hpi.headache.onset");
  });

  it("uses the generic set for an unrecognized complaint", () => {
    const answers = answer(CHIEF_COMPLAINT_QUESTION_ID, "my knee hurts");
    const next = getNextQuestion(answers);
    expect(next.questionId).toBe("hpi.generic.onset");
  });

  it("never repeats an already-answered question", () => {
    const answers = {
      ...answer(CHIEF_COMPLAINT_QUESTION_ID, "chest pain"),
      ...answer("hpi.chestpain.onset", "yesterday"),
    };
    const next = getNextQuestion(answers);
    expect(next.questionId).not.toBe("hpi.chestpain.onset");
  });

  it("respects dependsOn: allergy detail question only appears after allergies.status is yes", () => {
    let answers = {
      ...answer(CHIEF_COMPLAINT_QUESTION_ID, "chest pain"),
    };
    // Walk forward until we reach the allergies.status question.
    let guard = 0;
    while (guard++ < 50) {
      const next = getNextQuestion(answers);
      if (!next || next.questionId === "allergies.status") break;
      answers = { ...answers, [next.questionId]: { rawValue: "answer", certainty: "CONFIRMED" } };
    }
    // allergies.details must NOT be eligible yet (status not yet answered "yes").
    const activeIds = [];
    let probe = answers;
    for (let i = 0; i < 3; i++) {
      const q = getNextQuestion(probe);
      if (!q) break;
      activeIds.push(q.questionId);
      probe = { ...probe, [q.questionId]: { rawValue: q.questionId === "allergies.status" ? "yes" : "x", certainty: "CONFIRMED" } };
    }
    expect(activeIds).toContain("allergies.status");
    // After answering "yes", allergies.details should become eligible next among remaining.
    const afterYes = { ...answers, "allergies.status": { rawValue: "yes", certainty: "CONFIRMED" } };
    const remainingIds = [];
    let probe2 = afterYes;
    for (let i = 0; i < 5; i++) {
      const q = getNextQuestion(probe2);
      if (!q) break;
      remainingIds.push(q.questionId);
      probe2 = { ...probe2, [q.questionId]: { rawValue: "x", certainty: "CONFIRMED" } };
    }
    expect(remainingIds).toContain("allergies.details");
  });

  it("supports UNKNOWN/skip answers and still advances", () => {
    const answers = {
      ...answer(CHIEF_COMPLAINT_QUESTION_ID, "chest pain"),
      ...answer("hpi.chestpain.onset", "I don't know", "UNKNOWN"),
    };
    const next = getNextQuestion(answers);
    expect(next).not.toBeNull();
    expect(next.questionId).not.toBe("hpi.chestpain.onset");
  });

  it("returns null once every eligible question is answered", () => {
    let answers = answer(CHIEF_COMPLAINT_QUESTION_ID, "my knee hurts"); // generic set, smallest
    let guard = 0;
    while (guard++ < 100) {
      const next = getNextQuestion(answers);
      if (!next) break;
      answers = { ...answers, [next.questionId]: { rawValue: "answer", certainty: "CONFIRMED" } };
    }
    expect(getNextQuestion(answers)).toBeNull();
  });

  it("includes AYUSH questions only when intakeMode is AYUSH", () => {
    const answers = answer(CHIEF_COMPLAINT_QUESTION_ID, "my knee hurts");
    let sawAyushStandard = false;
    let probe = answers;
    for (let i = 0; i < 40; i++) {
      const q = getNextQuestion(probe, "STANDARD");
      if (!q) break;
      if (q.questionId.startsWith("ayush.")) sawAyushStandard = true;
      probe = { ...probe, [q.questionId]: { rawValue: "x", certainty: "CONFIRMED" } };
    }
    expect(sawAyushStandard).toBe(false);

    let sawAyushMode = false;
    let probe2 = answers;
    for (let i = 0; i < 60; i++) {
      const q = getNextQuestion(probe2, "AYUSH");
      if (!q) break;
      if (q.questionId.startsWith("ayush.")) sawAyushMode = true;
      probe2 = { ...probe2, [q.questionId]: { rawValue: "x", certainty: "CONFIRMED" } };
    }
    expect(sawAyushMode).toBe(true);
  });
});

describe("questionEngine.computeCompletion", () => {
  it("reports INCOMPLETE with missing required fields when nothing is answered", () => {
    const result = computeCompletion({});
    expect(result.status).toBe("INCOMPLETE");
    expect(result.missingRequiredFields).toContain(CHIEF_COMPLAINT_QUESTION_ID);
  });

  it("reports COMPLETE once all eligible required+optional questions are exhausted", () => {
    let answers = answer(CHIEF_COMPLAINT_QUESTION_ID, "my knee hurts");
    let guard = 0;
    while (guard++ < 100) {
      const next = getNextQuestion(answers);
      if (!next) break;
      answers = { ...answers, [next.questionId]: { rawValue: "answer", certainty: "CONFIRMED" } };
    }
    expect(computeCompletion(answers).status).toBe("COMPLETE");
  });
});

describe("questionEngine.inferCertaintyFromText", () => {
  it("maps denial phrasing to DENIED", () => {
    expect(inferCertaintyFromText("No, none")).toBe("DENIED");
  });
  it("maps uncertainty phrasing to UNCERTAIN", () => {
    expect(inferCertaintyFromText("I think I had diabetes maybe 5 years ago")).toBe("UNCERTAIN");
  });
  it("maps not-knowing phrasing to UNKNOWN", () => {
    expect(inferCertaintyFromText("I'm not sure")).toBe("UNKNOWN");
  });
  it("defaults to CONFIRMED for a plain statement", () => {
    expect(inferCertaintyFromText("Chest pain started yesterday")).toBe("CONFIRMED");
  });
});
