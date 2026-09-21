import { Keyboard } from "lucide-react";
import { VoiceError } from "../errors/VoiceError";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import type { UseVoiceRecording } from "../hooks/useVoiceRecording";
import type { SupportStatus } from "../types/voice";
import type { VoiceMessageKey } from "../locales";
import ErrorNotice from "./ErrorNotice";
import ListenButton from "./ListenButton";
import { mutedText, panel } from "./styles";
import VoiceButton from "./VoiceButton";
import VoiceRecorder from "./VoiceRecorder";

interface CaptureSectionProps {
  promptKey: VoiceMessageKey;
  language: string;
  recording: UseVoiceRecording;
  support: SupportStatus;
  onTypeInstead: () => void;
  /** Present only in live mode, where demo mode is a way out of a failure. */
  onUseDemo?: () => void;
}

/** Step 1: the question, the read-aloud button and the big microphone. */
export default function CaptureSection({
  promptKey,
  language,
  recording,
  support,
  onTypeInstead,
  onUseDemo,
}: CaptureSectionProps) {
  const { t } = useVoiceI18n();
  const promptText = t(promptKey);
  const canRecord = support.supported;

  return (
    <section className={panel} aria-labelledby="voice-prompt">
      <p id="voice-prompt" className="text-xl font-semibold leading-relaxed text-slate-900 sm:text-2xl dark:text-slate-100">
        {promptText}
      </p>
      <div className="mt-3">
        <ListenButton id="prompt" text={promptText} language={language} label={t("listen.forPrompt")}>
          {t("listen.button")}
        </ListenButton>
      </div>
      <p className={`mt-3 ${mutedText}`}>{t("language.hint")}</p>

      {canRecord ? (
        <VoiceRecorder
          status={recording.status}
          startedAt={recording.startedAt}
          levelSource={recording.levelSource}
          speechActive={recording.speechActive}
          interimText={recording.interimText}
          language={language}
          onStart={() => void recording.start()}
          onStop={() => void recording.stop()}
          onCancel={recording.cancel}
        />
      ) : (
        <div className="mt-4">
          <ErrorNotice error={new VoiceError(support.reason)} onType={onTypeInstead} onDemo={onUseDemo} />
        </div>
      )}

      {canRecord && recording.error && (
        <div className="mt-4">
          <ErrorNotice
            error={recording.error}
            onRetry={() => void recording.start()}
            onType={onTypeInstead}
            onDemo={onUseDemo}
          />
        </div>
      )}

      {canRecord && (
        <div className="mt-4 flex justify-center">
          <VoiceButton
            variant="ghost"
            icon={<Keyboard className="h-5 w-5" aria-hidden="true" />}
            disabled={recording.status === "listening" || recording.status === "processing"}
            onClick={onTypeInstead}
          >
            {t("action.typeInstead")}
          </VoiceButton>
        </div>
      )}
    </section>
  );
}
