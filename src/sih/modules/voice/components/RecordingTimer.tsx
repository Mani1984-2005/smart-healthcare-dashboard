import { useEffect, useState } from "react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import { formatDuration } from "../utils/format";

/** Ticks on its own so the rest of the screen does not re-render every second. */
export default function RecordingTimer({ startedAt }: { startedAt: number | null }) {
  const { t } = useVoiceI18n();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [startedAt]);

  const elapsed = startedAt === null ? 0 : Math.max(0, now - startedAt);
  return (
    <p className="flex items-center justify-center gap-2 text-base text-slate-700 dark:text-slate-200">
      <span>{t("voice.timerLabel")}</span>
      <time className="font-mono text-lg font-semibold tabular-nums" dateTime={`PT${Math.floor(elapsed / 1000)}S`}>
        {formatDuration(elapsed)}
      </time>
    </p>
  );
}
