import { Pause, Play, Square, Volume2 } from "lucide-react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import { useVoiceSpeech } from "../hooks/VoiceSpeechContext";
import VoiceButton from "./VoiceButton";

interface ListenButtonProps {
  /** Unique per piece of text, so only the matching button shows playback controls. */
  id: string;
  text: string;
  /** Language the text is written in (used to pick the voice). */
  language: string;
  /** Full accessible name, e.g. "Listen to this instruction". Should start with the visible word. */
  label?: string;
  /** Visible text; defaults to the localized "Listen". */
  children?: string;
  className?: string;
}

/**
 * "Listen" control. While its text is playing it turns into Pause/Resume and
 * Stop, so playback can always be stopped.
 */
export default function ListenButton({ id, text, language, label, children, className = "" }: ListenButtonProps) {
  const { t } = useVoiceI18n();
  const speech = useVoiceSpeech();
  const active = speech.activeKey === id;
  const visible = children ?? t("listen.button");

  if (!active) {
    return (
      <VoiceButton
        variant="secondary"
        icon={<Volume2 className="h-5 w-5" aria-hidden="true" />}
        aria-label={label ?? visible}
        disabled={!text.trim()}
        onClick={() => void speech.speak(id, text, language)}
        className={className}
      >
        {visible}
      </VoiceButton>
    );
  }

  const paused = speech.playback === "paused";
  return (
    <div role="group" aria-label={t("listen.speaking")} className={`flex flex-wrap items-center gap-2 ${className}`}>
      <VoiceButton
        variant="secondary"
        icon={paused ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
        onClick={paused ? speech.resume : speech.pause}
      >
        {paused ? t("listen.resume") : t("listen.pause")}
      </VoiceButton>
      <VoiceButton
        variant="danger"
        icon={<Square className="h-5 w-5" aria-hidden="true" />}
        onClick={speech.stop}
      >
        {t("listen.stop")}
      </VoiceButton>
    </div>
  );
}
