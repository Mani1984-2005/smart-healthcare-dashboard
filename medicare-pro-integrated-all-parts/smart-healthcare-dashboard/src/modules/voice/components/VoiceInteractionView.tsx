import { Info, ShieldCheck } from "lucide-react";
import { listLanguages } from "../config/languages";
import type { VoiceModuleConfig } from "../config/voiceConfig";
import { VoiceSpeechContext } from "../hooks/VoiceSpeechContext";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useVoiceInteractionFlow } from "../hooks/useVoiceInteractionFlow";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import type { VoiceMessageKey } from "../locales";
import type { VoiceServices } from "../services/createVoiceServices";
import type { LanguageCode, VoiceInteractionResult, VoiceMode } from "../types/voice";
import CaptureSection from "./CaptureSection";
import ConfirmSection from "./ConfirmSection";
import DemoModeBar from "./DemoModeBar";
import ErrorNotice from "./ErrorNotice";
import LanguageSelector from "./LanguageSelector";
import ReviewSection from "./ReviewSection";
import { mutedText, panel } from "./styles";
import SubmittedSection from "./SubmittedSection";

export interface VoiceInteractionViewProps {
  services: VoiceServices;
  config: VoiceModuleConfig;
  language: LanguageCode;
  sessionId: string;
  promptKey: VoiceMessageKey;
  autoDemoNotice: boolean;
  showContractPreview: boolean;
  onLanguageChange: (code: LanguageCode) => void;
  /** Omit when the host owns the demo/live choice. */
  onModeChange?: (mode: VoiceMode) => void;
  onSubmit?: (result: VoiceInteractionResult) => void;
  languageNotice: boolean;
  /** True after the person changed the mode, so focus returns to the switch on remount. */
  focusModeSwitch?: boolean;
}

/**
 * The interactive screen for one set of services. The parent remounts it
 * (via `key`) when the services change, which resets every hook cleanly.
 */
export default function VoiceInteractionView({
  services,
  config,
  language,
  sessionId,
  promptKey,
  autoDemoNotice,
  showContractPreview,
  onLanguageChange,
  onModeChange,
  onSubmit,
  languageNotice,
  focusModeSwitch = false,
}: VoiceInteractionViewProps) {
  const { t } = useVoiceI18n();
  const flow = useVoiceInteractionFlow({
    services,
    language,
    sessionId,
    maxRecordingMs: config.maxRecordingMs,
    onSubmit,
  });
  const speech = useSpeechSynthesis(services.tts);

  const recordingBusy = ["starting", "listening", "processing"].includes(flow.recording.status);
  const support = services.speech.getSupport(language);
  const demo = services.mode === "demo";

  return (
    <VoiceSpeechContext.Provider value={speech}>
      <div className="space-y-4 sm:space-y-6">
        <section className={panel}>
          <LanguageSelector
            languages={listLanguages()}
            value={language}
            onChange={onLanguageChange}
            disabled={recordingBusy || flow.submitting}
          />
          {languageNotice && (
            <p role="status" className={`mt-3 ${mutedText}`}>
              {t("language.unsupported")}
            </p>
          )}
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <DemoModeBar
              mode={services.mode}
              autoNotice={autoDemoNotice}
              onModeChange={onModeChange}
              disabled={recordingBusy || flow.submitting}
              focusSwitchOnMount={focusModeSwitch}
            />
          </div>
        </section>

        {flow.phase === "capture" && (
          <CaptureSection
            promptKey={promptKey}
            language={language}
            recording={flow.recording}
            support={support}
            onTypeInstead={flow.startTyping}
            onUseDemo={!demo && onModeChange ? () => onModeChange("demo") : undefined}
          />
        )}
        {flow.phase === "review" && <ReviewSection flow={flow} />}
        {flow.phase === "confirm" && <ConfirmSection flow={flow} />}
        {flow.phase === "submitted" && (
          <SubmittedSection
            language={language}
            result={flow.result}
            onNewResponse={flow.startNewResponse}
            showContractPreview={showContractPreview}
          />
        )}

        {speech.error && (
          <ErrorNotice error={speech.error} onDismiss={speech.clearError} />
        )}
        {demo && services.tts.isDemo && speech.activeText && (
          <p role="status" className={mutedText}>
            {t("listen.demoCaption", { text: speech.activeText })}
          </p>
        )}

        <footer className="space-y-2 px-1">
          <p className={`flex items-start gap-2 ${mutedText}`}>
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{demo ? t("privacy.demo") : t("privacy.live")}</span>
          </p>
          <p className={`flex items-start gap-2 ${mutedText}`}>
            <Info className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{t("disclaimer")}</span>
          </p>
        </footer>
      </div>
    </VoiceSpeechContext.Provider>
  );
}
