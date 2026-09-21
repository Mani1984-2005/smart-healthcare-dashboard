import { useCallback, useEffect, useMemo, useState } from "react";
import { readVoiceConfig, type VoiceModuleConfig } from "../config/voiceConfig";
import VoiceI18nProvider from "../i18n/VoiceI18nProvider";
import type { VoiceMessageKey } from "../locales";
import { createVoiceServices, isBrowserSpeechRecognitionSupported, type VoiceServices } from "../services/createVoiceServices";
import { useVoiceSessionStore } from "../stores/voiceSessionStore";
import type { VoiceInteractionResult, VoiceMode } from "../types/voice";
import VoiceErrorBoundary from "./VoiceErrorBoundary";
import VoiceInteractionView from "./VoiceInteractionView";

export interface VoiceInteractionModuleProps {
  /**
   * Inject your own services (for tests or a host application). When given,
   * the demo/live switch is hidden because the host owns that choice.
   */
  services?: VoiceServices;
  config?: VoiceModuleConfig;
  /** Question shown to the patient. Hosts can pass any localized key. */
  promptKey?: VoiceMessageKey;
  /** Receives the versioned result after the patient confirms and it is saved. */
  onSubmit?: (result: VoiceInteractionResult) => void;
  /** Shows the raw VoiceInteractionResult after submit (reviewer aid). */
  showContractPreview?: boolean;
}

/**
 * Embeddable entry point of the module. It resolves the language and the
 * live/demo mode, builds the services and renders the whole flow. It imports
 * nothing from other SIH parts, so it can be dropped into any screen.
 */
export default function VoiceInteractionModule({
  services: injected,
  config: configProp,
  promptKey = "prompt.problem",
  onSubmit,
  showContractPreview = false,
}: VoiceInteractionModuleProps) {
  const language = useVoiceSessionStore((state) => state.language);
  const storedMode = useVoiceSessionStore((state) => state.mode);
  const sessionId = useVoiceSessionStore((state) => state.sessionId);
  const languageNotice = useVoiceSessionStore((state) => state.languageNotice);
  const setLanguage = useVoiceSessionStore((state) => state.setLanguage);
  const setMode = useVoiceSessionStore((state) => state.setMode);

  const [modeChangedByPerson, setModeChangedByPerson] = useState(false);
  const changeMode = useCallback(
    (next: VoiceMode) => {
      setModeChangedByPerson(true);
      setMode(next);
    },
    [setMode],
  );

  const config = useMemo(() => configProp ?? readVoiceConfig(), [configProp]);
  const browserCanListen = useMemo(() => isBrowserSpeechRecognitionSupported(), []);

  const autoMode: VoiceMode =
    config.defaultMode === "auto" ? (browserCanListen ? "live" : "demo") : config.defaultMode;
  const mode: VoiceMode = injected?.mode ?? storedMode ?? autoMode;
  const autoDemoNotice = !injected && storedMode === null && config.defaultMode === "auto" && mode === "demo";

  const services = useMemo(() => injected ?? createVoiceServices({ mode, config }), [injected, mode, config]);

  // Release the microphone session and any speech when leaving or switching mode.
  // Injected services belong to the host, which disposes them itself.
  useEffect(() => {
    return () => {
      if (!injected) services.dispose();
    };
  }, [injected, services]);

  return (
    <VoiceI18nProvider language={language}>
      <VoiceErrorBoundary language={language}>
        <VoiceInteractionView
          key={`${services.mode}:${services.speech.id}`}
          services={services}
          config={config}
          language={language}
          sessionId={sessionId}
          promptKey={promptKey}
          autoDemoNotice={autoDemoNotice}
          showContractPreview={showContractPreview}
          languageNotice={languageNotice}
          onLanguageChange={setLanguage}
          onModeChange={injected ? undefined : changeMode}
          focusModeSwitch={modeChangedByPerson}
          onSubmit={onSubmit}
        />
      </VoiceErrorBoundary>
    </VoiceI18nProvider>
  );
}
