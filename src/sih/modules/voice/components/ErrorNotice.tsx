import { RotateCcw, Keyboard, FlaskConical, TriangleAlert } from "lucide-react";
import { describeError } from "../errors/errorCatalog";
import type { VoiceError } from "../errors/VoiceError";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import VoiceButton from "./VoiceButton";

interface ErrorNoticeProps {
  error: VoiceError;
  /** Only actions with a handler are offered, so a notice never shows a dead button. */
  onRetry?: () => void;
  onType?: () => void;
  onDemo?: () => void;
  onDismiss?: () => void;
}

/**
 * Friendly failure message plus recovery buttons. The raw error is never
 * rendered; `data-error-code` exists only for tests and support tooling.
 */
export default function ErrorNotice({ error, onRetry, onType, onDemo, onDismiss }: ErrorNoticeProps) {
  const { t } = useVoiceI18n();
  const { messageKey, recovery } = describeError(error.code);

  return (
    <div
      role="alert"
      data-error-code={error.code}
      className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-950 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-50"
    >
      <p className="flex items-start gap-3 text-base font-medium leading-7 sm:text-lg">
        <TriangleAlert className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
        <span>{t(messageKey)}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {recovery.includes("retry") && onRetry && (
          <VoiceButton variant="primary" icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />} onClick={onRetry}>
            {t("action.tryAgain")}
          </VoiceButton>
        )}
        {recovery.includes("type") && onType && (
          <VoiceButton variant="secondary" icon={<Keyboard className="h-5 w-5" aria-hidden="true" />} onClick={onType}>
            {t("action.typeInstead")}
          </VoiceButton>
        )}
        {recovery.includes("demo") && onDemo && (
          <VoiceButton variant="secondary" icon={<FlaskConical className="h-5 w-5" aria-hidden="true" />} onClick={onDemo}>
            {t("action.useDemo")}
          </VoiceButton>
        )}
        {recovery.includes("dismiss") && onDismiss && (
          <VoiceButton variant="ghost" onClick={onDismiss}>
            {t("action.dismiss")}
          </VoiceButton>
        )}
      </div>
    </div>
  );
}
