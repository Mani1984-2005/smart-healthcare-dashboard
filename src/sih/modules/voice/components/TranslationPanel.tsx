import { Languages } from "lucide-react";
import { useId } from "react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import type { TranslationStatus } from "../hooks/useTextTranslation";
import type { VoiceError } from "../errors/VoiceError";
import type { LanguageCode, TranslationResult, VoiceLanguage } from "../types/voice";
import ErrorNotice from "./ErrorNotice";
import ListenButton from "./ListenButton";
import { bodyText, focusRing, mutedText, sectionHeading } from "./styles";
import VoiceButton from "./VoiceButton";

interface TranslationPanelProps {
  originalText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  targets: VoiceLanguage[];
  onTargetChange: (code: LanguageCode) => void;
  status: TranslationStatus;
  result: TranslationResult | null;
  error: VoiceError | null;
  stale: boolean;
  onTranslate: () => void;
  onDismissError: () => void;
}

/**
 * Translation is always shown next to, never instead of, the original words.
 */
export default function TranslationPanel({
  originalText,
  sourceLanguage,
  targetLanguage,
  targets,
  onTargetChange,
  status,
  result,
  error,
  stale,
  onTranslate,
  onDismissError,
}: TranslationPanelProps) {
  const { t } = useVoiceI18n();
  const selectId = useId();
  const translating = status === "translating";

  return (
    <section aria-labelledby={`${selectId}-title`} className="space-y-4">
      <h3 id={`${selectId}-title`} className={sectionHeading}>
        {t("translation.heading")}
      </h3>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor={selectId} className="block text-base font-medium leading-7 text-slate-800 dark:text-slate-100">
            {t("translation.targetLabel")}
          </label>
          <select
            id={selectId}
            value={targetLanguage}
            onChange={(event) => onTargetChange(event.target.value)}
            disabled={translating}
            className={`mt-1 block min-h-12 w-full rounded-lg border-2 border-slate-300 bg-white px-3 text-lg text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${focusRing}`}
          >
            {targets
              .filter((language) => language.code !== sourceLanguage)
              .map((language) => (
                <option key={language.code} value={language.code} lang={language.code}>
                  {language.nativeLabel === language.label ? language.label : `${language.nativeLabel} (${language.label})`}
                </option>
              ))}
          </select>
        </div>
        <VoiceButton
          variant="secondary"
          icon={<Languages className="h-5 w-5" aria-hidden="true" />}
          loading={translating}
          disabled={!originalText.trim()}
          onClick={onTranslate}
        >
          {translating ? t("translation.working") : t("action.translate")}
        </VoiceButton>
      </div>

      <p className={mutedText}>{t("translation.notice")}</p>

      {stale && (
        <p role="status" className={mutedText}>
          {t("translation.stale")}
        </p>
      )}

      {error && <ErrorNotice error={error} onRetry={onTranslate} onDismiss={onDismissError} />}

      {result && (
        <div className="grid gap-3 sm:grid-cols-2" data-testid="translation-result">
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("translation.originalLabel")}</h4>
            <p lang={sourceLanguage} data-testid="translation-original" className={`mt-1 ${bodyText}`}>
              {originalText}
            </p>
          </div>
          <div className="rounded-xl border-2 border-cyan-700 bg-cyan-50 p-4 dark:border-cyan-400 dark:bg-cyan-950/40">
            <h4 className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">{t("translation.resultLabel")}</h4>
            <p lang={result.targetLanguage} data-testid="translation-translated" className={`mt-1 ${bodyText}`}>
              {result.translatedText}
            </p>
            <div className="mt-3">
              <ListenButton
                id="translation"
                text={result.translatedText}
                language={result.targetLanguage}
                label={t("listen.readTranslation")}
              >
                {t("listen.readTranslation")}
              </ListenButton>
            </div>
          </div>
          {result.isDemo && (
            <p className={`sm:col-span-2 ${mutedText}`} role="note">
              {t("translation.demoNotice")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
