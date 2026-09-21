import { Check } from "lucide-react";
import { useId } from "react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import type { LanguageCode, VoiceLanguage } from "../types/voice";

interface LanguageSelectorProps {
  languages: VoiceLanguage[];
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
  disabled?: boolean;
}

/**
 * Native radio group (arrow keys, screen-reader semantics for free). The
 * selected option shows a check mark and a heavier border, not just a colour.
 */
export default function LanguageSelector({ languages, value, onChange, disabled = false }: LanguageSelectorProps) {
  const { t } = useVoiceI18n();
  const name = useId();

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-3 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100">
        {t("language.legend")}
      </legend>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {languages.map((language) => {
          const selected = language.code === value;
          return (
            <label key={language.code} className="relative block cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
              <input
                type="radio"
                name={name}
                value={language.code}
                checked={selected}
                onChange={() => onChange(language.code)}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition peer-focus-visible:ring-4 peer-focus-visible:ring-cyan-600/70 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-950 ${
                  selected
                    ? "border-cyan-700 bg-cyan-50 text-cyan-900 dark:border-cyan-400 dark:bg-cyan-950/50 dark:text-cyan-100"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                }`}
              >
                <span lang={language.code} className="text-xl font-semibold leading-8">
                  {language.nativeLabel}
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                  {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                  {language.label !== language.nativeLabel && language.label}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
