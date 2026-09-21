import { useEffect, useId, useRef } from "react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import { getLanguage } from "../config/languages";
import type { InputMethod } from "../types/voice";
import { sectionHeading } from "./styles";

interface TranscriptViewerProps {
  value: string;
  onChange: (value: string) => void;
  /** Language the text was captured in; sets lang/dir so screen readers pronounce it correctly. */
  language: string;
  inputMethod: InputMethod;
  disabled?: boolean;
}

const MAX_LENGTH = 2000;

/**
 * "You said:" plus an always-editable text area. Editing is the default so the
 * person stays in control of the wording before anything is sent. The heading
 * receives focus when it appears so keyboard and screen-reader users land on
 * the result.
 */
export default function TranscriptViewer({ value, onChange, language, inputMethod, disabled }: TranscriptViewerProps) {
  const { t } = useVoiceI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const textareaId = useId();
  const hintId = useId();
  const languageInfo = getLanguage(language);

  useEffect(() => {
    if (inputMethod === "typed") return;
    headingRef.current?.focus();
  }, [inputMethod]);

  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className={`${sectionHeading} outline-none`}>
        {inputMethod === "typed" ? t("transcript.typedHeading") : t("transcript.heading")}
      </h2>
      <label htmlFor={textareaId} className="sr-only">
        {t("transcript.editLabel")}
      </label>
      <textarea
        id={textareaId}
        aria-describedby={hintId}
        value={value}
        disabled={disabled}
        maxLength={MAX_LENGTH}
        rows={4}
        lang={language}
        dir={languageInfo?.direction ?? "ltr"}
        placeholder={t("transcript.placeholder")}
        // Typed input starts empty, so the person can begin typing straight away.
        autoFocus={inputMethod === "typed"}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 block min-h-36 w-full resize-y rounded-xl border-2 border-slate-300 bg-white p-4 text-xl leading-9 text-slate-900 placeholder:text-slate-500 focus-visible:border-cyan-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-600/40 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <p id={hintId} className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
        {t("transcript.editHint")}
        {languageInfo && <> {t("transcript.language", { language: languageInfo.nativeLabel })}</>}
      </p>
    </div>
  );
}
