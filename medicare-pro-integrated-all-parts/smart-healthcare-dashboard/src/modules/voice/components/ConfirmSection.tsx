import { ArrowLeft, Send } from "lucide-react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import type { useVoiceInteractionFlow } from "../hooks/useVoiceInteractionFlow";
import ErrorNotice from "./ErrorNotice";
import ListenButton from "./ListenButton";
import { bodyText, mutedText, panel, sectionHeading } from "./styles";
import VoiceButton from "./VoiceButton";

type Flow = ReturnType<typeof useVoiceInteractionFlow>;

/** Step 3: nothing is sent until the person confirms what will be sent. */
export default function ConfirmSection({ flow }: { flow: Flow }) {
  const { t } = useVoiceI18n();
  const translated = flow.translation.result;

  return (
    <section className={panel} aria-labelledby="voice-confirm-title">
      <h2 id="voice-confirm-title" className={sectionHeading}>
        {t("review.heading")}
      </h2>
      <p className={mutedText}>{t("review.hint")}</p>

      <blockquote
        lang={flow.transcriptLanguage}
        data-testid="confirm-text"
        className="my-4 rounded-xl border-l-8 border-cyan-700 bg-cyan-50 p-4 text-xl leading-9 text-slate-900 dark:bg-cyan-950/40 dark:text-slate-100"
      >
        {flow.draftText.trim()}
      </blockquote>

      {translated && (
        <div className="mb-4 rounded-xl border border-slate-300 p-4 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("translation.resultLabel")}</h3>
          <p lang={translated.targetLanguage} className={bodyText}>
            {translated.translatedText}
          </p>
        </div>
      )}

      <ListenButton
        id="confirm"
        text={flow.draftText}
        language={flow.transcriptLanguage}
        label={t("listen.forConfirm")}
      >
        {t("listen.button")}
      </ListenButton>

      {flow.submitError && (
        <div className="mt-4">
          <ErrorNotice error={flow.submitError} onRetry={() => void flow.confirmSubmit()} onDismiss={flow.dismissSubmitError} />
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
        <VoiceButton icon={<ArrowLeft className="h-5 w-5" aria-hidden="true" />} onClick={flow.backToReview} disabled={flow.submitting}>
          {t("action.goBack")}
        </VoiceButton>
        <VoiceButton
          variant="primary"
          className="py-4 text-xl sm:min-w-56"
          icon={<Send className="h-6 w-6" aria-hidden="true" />}
          loading={flow.submitting}
          onClick={() => void flow.confirmSubmit()}
        >
          {flow.submitting ? t("submit.saving") : t("action.confirmSend")}
        </VoiceButton>
      </div>
    </section>
  );
}
