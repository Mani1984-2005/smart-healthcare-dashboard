import { Check, FlaskConical, Info } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import type { VoiceMode } from "../types/voice";
import { focusRing } from "./styles";

interface DemoModeBarProps {
  mode: VoiceMode;
  /** True when demo mode was switched on automatically because the browser cannot listen. */
  autoNotice: boolean;
  /** Omit to hide the switch (services injected by a host that owns the mode). */
  onModeChange?: (mode: VoiceMode) => void;
  disabled?: boolean;
  /** The screen remounts when the mode changes; this puts keyboard focus back on the switch. */
  focusSwitchOnMount?: boolean;
}

/** Demo mode switch and, while it is on, an unmissable explanation. */
export default function DemoModeBar({ mode, autoNotice, onModeChange, disabled, focusSwitchOnMount = false }: DemoModeBarProps) {
  const { t } = useVoiceI18n();
  const labelId = useId();
  const switchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusSwitchOnMount) switchRef.current?.focus();
  }, [focusSwitchOnMount]);
  const demo = mode === "demo";

  return (
    <div className="space-y-3">
      {onModeChange && (
        <div className="flex items-center justify-between gap-3">
          <span id={labelId} className="flex items-center gap-2 text-base font-medium text-slate-800 dark:text-slate-100">
            <FlaskConical className="h-5 w-5" aria-hidden="true" />
            {t("demo.toggle")}
          </span>
          <button
            ref={switchRef}
            type="button"
            role="switch"
            aria-checked={demo}
            aria-labelledby={labelId}
            disabled={disabled}
            onClick={() => onModeChange(demo ? "live" : "demo")}
            className={`relative inline-flex h-12 w-20 shrink-0 items-center rounded-full border-2 px-1 transition disabled:opacity-50 ${focusRing} ${
              demo ? "border-cyan-700 bg-cyan-700" : "border-slate-400 bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-full bg-white text-cyan-800 shadow transition-transform ${
                demo ? "translate-x-8" : "translate-x-0"
              }`}
            >
              {demo && <Check className="h-5 w-5" aria-hidden="true" />}
            </span>
          </button>
        </div>
      )}

      {demo && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border-2 border-amber-500 bg-amber-50 p-3 text-base leading-7 text-amber-950 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-50"
        >
          <FlaskConical className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">{t("demo.badge")}</p>
            <p>{t("demo.banner")}</p>
            {autoNotice && (
              <p className="mt-1 flex items-start gap-2">
                <Info className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("demo.autoNotice")}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
