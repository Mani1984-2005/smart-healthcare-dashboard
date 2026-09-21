import { RotateCcw, Send, Trash2 } from "lucide-react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import type { useVoiceInteractionFlow } from "../hooks/useVoiceInteractionFlow";
import { listLanguages } from "../config/languages";
import ListenButton from "./ListenButton";
import { panel } from "./styles";
import TranscriptViewer from "./TranscriptViewer";
import TranslationPanel from "./TranslationPanel";
import VoiceButton from "./VoiceButton";
import VoiceStatus from "./VoiceStatus";

type Flow = ReturnType<typeof useVoiceInteractionFlow>;

/** Step 2: check and edit the words, optionally translate, then submit. */
export default function ReviewSection({ flow }: { flow: Flow }) {
  const { t } = useVoiceI18n();
  const hasText = flow.draftText.trim().length > 0;

  return (
    <>
      <section className={panel}>
        {flow.inputMethod === "voice" && (
          <div className="mb-4">
            <VoiceStatus status="success" />
          </div>
        )}
        <TranscriptViewer
          value={flow.draftText}
          onChange={flow.setDraftText}
          language={flow.transcriptLanguage}
          inputMethod={flow.inputMethod}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <ListenButton
            id="transcript"
            text={flow.draftText}
            language={flow.transcriptLanguage}
            label={t("listen.readTranscript")}
          >
            {t("listen.readTranscript")}
          </ListenButton>
          {flow.inputMethod === "voice" && (
            <VoiceButton icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />} onClick={() => void flow.recordAgain()}>
              {t("action.recordAgain")}
            </VoiceButton>
          )}
          <VoiceButton icon={<Trash2 className="h-5 w-5" aria-hidden="true" />} onClick={flow.clearAll}>
            {t("action.clear")}
          </VoiceButton>
        </div>
      </section>

      <section className={panel}>
        <TranslationPanel
          originalText={flow.draftText}
          sourceLanguage={flow.transcriptLanguage}
          targetLanguage={flow.targetLanguage}
          targets={listLanguages()}
          onTargetChange={flow.setTargetLanguage}
          status={flow.translation.status}
          result={flow.translation.result}
          error={flow.translation.error}
          stale={flow.translationStale}
          onTranslate={() => void flow.requestTranslation()}
          onDismissError={flow.translation.reset}
        />
      </section>

      <VoiceButton
        variant="primary"
        className="w-full py-4 text-xl sm:w-auto sm:min-w-56"
        icon={<Send className="h-6 w-6" aria-hidden="true" />}
        disabled={!hasText}
        onClick={flow.requestSubmit}
      >
        {t("action.submit")}
      </VoiceButton>
    </>
  );
}
