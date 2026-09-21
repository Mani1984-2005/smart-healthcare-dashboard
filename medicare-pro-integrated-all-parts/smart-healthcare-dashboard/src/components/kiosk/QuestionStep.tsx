import { useState } from "react";
import Button from "../ui/Button.tsx";
import Card from "../ui/Card.tsx";
import type { IntakeQuestion } from "../../stores/intakeStore.ts";
// Part 2 — Voice, Multilingual & Accessible Clinical Interaction. Imported
// only from the module's public door (src/modules/voice/index.ts), per its
// documented integration contract. Rendering it here does not create a
// second intake flow: it only supplies the text for this question's
// existing TEXT/LONG_TEXT input, tagged with provenance so it is preserved
// (never silently upgraded to a confirmed fact) downstream.
import { VoiceInteractionModule, type VoiceInteractionResult } from "../../modules/voice";

type QuestionStepProps = {
  question: IntakeQuestion;
  onAnswer: (rawValue: unknown, inputMode?: "TEXT" | "VOICE") => void;
  loading: boolean;
};

const UNKNOWN_VALUE = "__UNKNOWN__";
const VOICE_ELIGIBLE_TYPES = ["TEXT", "LONG_TEXT"];

export default function QuestionStep({ question, onAnswer, loading }: QuestionStepProps) {
  const [textValue, setTextValue] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [scaleValue, setScaleValue] = useState(5);
  const [multiValues, setMultiValues] = useState<string[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);

  function submit(value: unknown, inputMode?: "TEXT" | "VOICE") {
    if (value === "" || value === undefined) return;
    onAnswer(value, inputMode);
    setTextValue("");
    setNumberValue("");
    setMultiValues([]);
    setVoiceOpen(false);
  }

  function handleVoiceSubmit(result: VoiceInteractionResult) {
    // The patient-confirmed wording only — never the machine translation —
    // matching Part 1's PATIENT_VOICE provenance contract.
    submit(result.originalText, "VOICE");
  }

  function toggleMulti(option: string) {
    setMultiValues((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100" aria-live="polite">
        {question.questionText}
      </h2>

      <div className="mt-6">
        {VOICE_ELIGIBLE_TYPES.includes(question.answerType) && !voiceOpen && (
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            disabled={loading}
            className="mb-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-cyan-300 text-sm font-medium text-cyan-800 transition hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 dark:border-cyan-800 dark:text-cyan-200 dark:hover:bg-cyan-950/50"
          >
            Speak your answer instead
          </button>
        )}

        {VOICE_ELIGIBLE_TYPES.includes(question.answerType) && voiceOpen && (
          <div className="mb-4">
            <VoiceInteractionModule onSubmit={handleVoiceSubmit} />
            <button
              type="button"
              onClick={() => setVoiceOpen(false)}
              className="mt-2 text-sm font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
            >
              Type instead
            </button>
          </div>
        )}

        {(question.answerType === "TEXT" || question.answerType === "DURATION" || question.answerType === "DATE") && !voiceOpen && (
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            className="min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Type your answer"
            onKeyDown={(e) => e.key === "Enter" && submit(textValue)}
          />
        )}

        {question.answerType === "LONG_TEXT" && !voiceOpen && (
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Type your answer"
          />
        )}

        {question.answerType === "NUMBER" && (
          <input
            type="number"
            value={numberValue}
            onChange={(e) => setNumberValue(e.target.value)}
            className="min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        )}

        {question.answerType === "SCALE" && (
          <div>
            <input
              type="range"
              min={1}
              max={10}
              value={scaleValue}
              onChange={(e) => setScaleValue(Number(e.target.value))}
              className="w-full"
              aria-label="Severity from 1 to 10"
            />
            <p className="mt-2 text-center text-2xl font-bold text-cyan-700 dark:text-cyan-400">{scaleValue}</p>
          </div>
        )}

        {question.answerType === "YES_NO" && (
          <div className="flex gap-3">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => submit(opt)}
                disabled={loading}
                className="min-h-14 flex-1 rounded-lg border border-slate-300 bg-white text-lg font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.answerType === "SINGLE_SELECT" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(question.options ?? []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => submit(opt)}
                disabled={loading}
                className="min-h-14 rounded-lg border border-slate-300 bg-white px-4 text-base font-medium text-slate-800 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.answerType === "MULTI_SELECT" && (
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(question.options ?? []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={multiValues.includes(opt)}
                  onClick={() => toggleMulti(opt)}
                  className={`min-h-14 rounded-lg border px-4 text-base font-medium transition ${
                    multiValues.includes(opt)
                      ? "border-cyan-700 bg-cyan-50 text-cyan-800 dark:border-cyan-500 dark:bg-cyan-950 dark:text-cyan-200"
                      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <Button className="mt-4 min-h-14 w-full text-base" disabled={loading || multiValues.length === 0} onClick={() => submit(multiValues)}>
              Continue
            </Button>
          </div>
        )}
      </div>

      {["TEXT", "LONG_TEXT", "NUMBER", "SCALE", "DURATION", "DATE"].includes(question.answerType) && !voiceOpen && (
        <Button
          className="mt-4 min-h-14 w-full text-base"
          disabled={loading}
          onClick={() =>
            submit(
              question.answerType === "NUMBER"
                ? Number(numberValue)
                : question.answerType === "SCALE"
                  ? scaleValue
                  : textValue
            )
          }
        >
          Continue
        </Button>
      )}

      <button
        type="button"
        onClick={() => onAnswer(UNKNOWN_VALUE)}
        disabled={loading}
        className="mt-3 w-full text-center text-sm font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
      >
        I'm not sure / skip this question
      </button>
    </Card>
  );
}
