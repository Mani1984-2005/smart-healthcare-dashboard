import { useState } from "react";
import Button from "../ui/Button.tsx";
import Card from "../ui/Card.tsx";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
];

const MODES = [
  { code: "TOUCH", label: "Touch / Tap" },
  { code: "TEXT", label: "Type" },
];

type LanguageModeStepProps = {
  onSubmit: (language: string, interactionMode: string) => void;
  loading: boolean;
};

export default function LanguageModeStep({ onSubmit, loading }: LanguageModeStepProps) {
  const [language, setLanguage] = useState("en");
  const [interactionMode, setInteractionMode] = useState("TOUCH");

  return (
    <Card title="Let's set things up" subtitle="Choose your preferred language and how you'd like to answer.">
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Language</p>
          <div className="flex flex-wrap gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                aria-pressed={language === lang.code}
                className={`min-h-14 min-w-28 rounded-lg border px-5 text-base font-medium transition ${
                  language === lang.code
                    ? "border-cyan-700 bg-cyan-50 text-cyan-800 dark:border-cyan-500 dark:bg-cyan-950 dark:text-cyan-200"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">How would you like to answer?</p>
          <div className="flex flex-wrap gap-3">
            {MODES.map((mode) => (
              <button
                key={mode.code}
                type="button"
                onClick={() => setInteractionMode(mode.code)}
                aria-pressed={interactionMode === mode.code}
                className={`min-h-14 min-w-28 rounded-lg border px-5 text-base font-medium transition ${
                  interactionMode === mode.code
                    ? "border-cyan-700 bg-cyan-50 text-cyan-800 dark:border-cyan-500 dark:bg-cyan-950 dark:text-cyan-200"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <Button className="min-h-14 w-full text-base" disabled={loading} onClick={() => onSubmit(language, interactionMode)}>
          Continue
        </Button>
      </div>
    </Card>
  );
}
