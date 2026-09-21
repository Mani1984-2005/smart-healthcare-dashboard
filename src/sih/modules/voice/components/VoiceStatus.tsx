import { Check, LoaderCircle, Mic, Square } from "lucide-react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import type { RecordingStatus } from "../hooks/useVoiceRecording";

/**
 * One line of state text with an icon. It is a polite live region, so screen
 * readers hear each change ("Listening...", "Understanding your voice...").
 */
export default function VoiceStatus({ status }: { status: RecordingStatus }) {
  const { t } = useVoiceI18n();

  const view = {
    idle: { icon: <Mic className="h-6 w-6" aria-hidden="true" />, text: t("voice.idle") },
    error: { icon: <Mic className="h-6 w-6" aria-hidden="true" />, text: t("voice.idle") },
    starting: {
      icon: <LoaderCircle className="h-6 w-6 motion-safe:animate-spin" aria-hidden="true" />,
      text: t("voice.starting"),
    },
    listening: { icon: <Square className="h-5 w-5 fill-current" aria-hidden="true" />, text: t("voice.listening") },
    processing: {
      icon: <LoaderCircle className="h-6 w-6 motion-safe:animate-spin" aria-hidden="true" />,
      text: t("voice.processing"),
    },
    success: { icon: <Check className="h-6 w-6" aria-hidden="true" />, text: t("voice.success") },
  }[status];

  const tone =
    status === "listening"
      ? "text-rose-800 dark:text-rose-200"
      : status === "success"
        ? "text-emerald-800 dark:text-emerald-200"
        : "text-slate-900 dark:text-slate-100";

  return (
    <p role="status" aria-live="polite" className={`flex items-center justify-center gap-2 text-xl font-semibold leading-8 ${tone}`}>
      {view.icon}
      <span>{view.text}</span>
    </p>
  );
}
