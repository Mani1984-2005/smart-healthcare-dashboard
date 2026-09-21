import { Check, LoaderCircle, Mic, Square } from "lucide-react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import type { LevelSource, RecordingStatus } from "../hooks/useVoiceRecording";
import AudioVisualizer from "./AudioVisualizer";
import RecordingTimer from "./RecordingTimer";
import { focusRing } from "./styles";
import VoiceButton from "./VoiceButton";
import VoiceStatus from "./VoiceStatus";

interface VoiceRecorderProps {
  status: RecordingStatus;
  startedAt: number | null;
  levelSource: LevelSource;
  speechActive: boolean;
  interimText: string;
  language: string;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}

/**
 * The single obvious action on the screen: one large microphone button whose
 * icon, label and colour change together (Mic > Stop > spinner), plus text
 * status, timer and level bars while recording.
 */
export default function VoiceRecorder({
  status,
  startedAt,
  levelSource,
  speechActive,
  interimText,
  language,
  onStart,
  onStop,
  onCancel,
}: VoiceRecorderProps) {
  const { t } = useVoiceI18n();
  const listening = status === "listening";
  const busy = status === "starting" || status === "processing";

  const button = (() => {
    if (listening) {
      return {
        label: t("voice.stopLabel"),
        icon: <Square className="h-12 w-12 fill-current" aria-hidden="true" />,
        tone: "bg-rose-700 hover:bg-rose-800",
        onClick: onStop,
      };
    }
    if (status === "starting") {
      return {
        label: t("voice.startingLabel"),
        icon: <LoaderCircle className="h-12 w-12 motion-safe:animate-spin" aria-hidden="true" />,
        tone: "bg-slate-600",
        onClick: undefined,
      };
    }
    if (status === "processing") {
      return {
        label: t("voice.processingLabel"),
        icon: <LoaderCircle className="h-12 w-12 motion-safe:animate-spin" aria-hidden="true" />,
        tone: "bg-slate-600",
        onClick: undefined,
      };
    }
    if (status === "success") {
      return {
        label: t("voice.startLabel"),
        icon: <Check className="h-14 w-14" aria-hidden="true" />,
        tone: "bg-emerald-700 hover:bg-emerald-800",
        onClick: onStart,
      };
    }
    return {
      label: t("voice.startLabel"),
      icon: <Mic className="h-14 w-14" aria-hidden="true" />,
      tone: "bg-cyan-700 hover:bg-cyan-800",
      onClick: onStart,
    };
  })();

  return (
    <div className="flex flex-col items-center gap-4 py-6" data-recording-status={status}>
      <div className="relative grid place-items-center">
        {listening && (
          <span
            aria-hidden="true"
            className="absolute -inset-4 rounded-full bg-rose-400/40 motion-safe:animate-pulse"
          />
        )}
        <button
          type="button"
          aria-label={button.label}
          aria-disabled={busy || undefined}
          aria-busy={busy || undefined}
          disabled={busy}
          onClick={button.onClick}
          className={`relative grid h-36 w-36 place-items-center rounded-full text-white shadow-overlay transition disabled:cursor-wait sm:h-40 sm:w-40 ${button.tone} ${focusRing}`}
        >
          {button.icon}
        </button>
      </div>

      <VoiceStatus status={status} />

      {status === "starting" && (
        <VoiceButton variant="ghost" onClick={onCancel}>
          {t("voice.cancel")}
        </VoiceButton>
      )}

      {listening && (
        <>
          <p className="max-w-md text-center text-base leading-7 text-slate-700 dark:text-slate-200">{t("voice.speakNow")}</p>
          <RecordingTimer startedAt={startedAt} />
          <AudioVisualizer active={listening} levelSource={levelSource} speechActive={speechActive} />
          {speechActive && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("voice.hearing")}</p>
          )}
          {interimText && (
            <p lang={language} className="max-w-md text-center text-lg italic leading-8 text-slate-700 dark:text-slate-200">
              <span className="sr-only">{t("voice.hearingLabel")} </span>
              {interimText}
            </p>
          )}
          <VoiceButton variant="ghost" onClick={onCancel}>
            {t("voice.cancel")}
          </VoiceButton>
        </>
      )}
    </div>
  );
}
