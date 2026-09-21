import { CircleCheck, Mic } from "lucide-react";
import { useVoiceI18n } from "../i18n/useVoiceI18n";
import type { VoiceInteractionResult } from "../types/voice";
import ListenButton from "./ListenButton";
import { bodyText, mutedText, panel } from "./styles";
import VoiceButton from "./VoiceButton";

interface SubmittedSectionProps {
  language: string;
  result: VoiceInteractionResult | null;
  onNewResponse: () => void;
  /** Reviewer aid: show the exact object other SIH parts would receive. */
  showContractPreview: boolean;
}

/** Step 4: confirmation, read-aloud of the confirmation, and a way to start again. */
export default function SubmittedSection({ language, result, onNewResponse, showContractPreview }: SubmittedSectionProps) {
  const { t } = useVoiceI18n();
  const recorded = t("prompt.recorded");

  return (
    <section className={panel}>
      <p role="status" className="flex items-center gap-3 text-2xl font-semibold text-emerald-800 dark:text-emerald-200">
        <CircleCheck className="h-8 w-8" aria-hidden="true" />
        {t("submit.done")}
      </p>
      <p className={`mt-3 ${bodyText}`}>{recorded}</p>
      <div className="mt-3">
        <ListenButton id="recorded" text={recorded} language={language} label={t("listen.forPrompt")}>
          {t("listen.button")}
        </ListenButton>
      </div>
      <p className={`mt-3 ${mutedText}`}>{t("submit.doneHint")}</p>

      {showContractPreview && result && (
        <details className="mt-4 rounded-xl border border-slate-300 p-3 dark:border-slate-700">
          <summary className="min-h-12 cursor-pointer py-3 text-base font-medium text-slate-800 dark:text-slate-100">
            Integration contract output (VoiceInteractionResult)
          </summary>
          <pre data-testid="contract-preview" className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-900">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      )}

      <div className="mt-6">
        <VoiceButton variant="primary" icon={<Mic className="h-5 w-5" aria-hidden="true" />} onClick={onNewResponse}>
          {t("action.newResponse")}
        </VoiceButton>
      </div>
    </section>
  );
}
