import { useEffect } from "react";
import { createTranslator } from "../i18n/translator";
import { listLanguages } from "../config/languages";
import VoiceInteractionModule from "../components/VoiceInteractionModule";
import { useVoiceSessionStore } from "../stores/voiceSessionStore";

/**
 * Standalone demonstration page (route: /sih/voice). It needs no login, no
 * other MediCare Pro screen and no other SIH part. Chrome is kept minimal so
 * the microphone stays the primary action, especially on phones.
 */
export default function VoiceInteractionPage() {
  const language = useVoiceSessionStore((state) => state.language);
  const t = createTranslator(language);

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    document.title = `${t("module.title")} - MediCare Pro`;
    document.documentElement.lang = language;
    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
    };
  }, [language, t]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#voice-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-cyan-900"
      >
        Skip to voice interaction
      </a>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6">
          <p className="text-base font-semibold text-cyan-800 dark:text-cyan-300">MediCare Pro</p>
          <h1 className="mt-1 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl" lang={language}>
            {t("module.title")}
          </h1>
          <p className="mt-2 text-base leading-7 text-slate-700 dark:text-slate-300" lang={language}>
            {t("module.subtitle")}
          </p>
        </header>

        <main id="voice-main" tabIndex={-1} className="outline-none">
          <VoiceInteractionModule showContractPreview />
        </main>

        <details className="mt-8 rounded-xl border border-slate-300 bg-white p-4 text-sm leading-7 dark:border-slate-700 dark:bg-slate-900">
          <summary className="min-h-12 cursor-pointer py-3 text-base font-medium">About this demo (for reviewers)</summary>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              SIH26047 Part 2. Runs on its own: no login, no other SIH part, no API keys. Speech recognition, translation
              and read-aloud sit behind interfaces with browser and mock providers.
            </li>
            <li>
              Registered languages:{" "}
              {listLanguages()
                .map((item) => `${item.label} (${item.code})`)
                .join(", ")}
              . More can be added by registering a language and a locale file.
            </li>
            <li>Demo mode uses sample sentences. Its output is demonstration data, not real recognition or translation.</li>
            <li>
              This module records, translates and reads back what a patient says. It does not diagnose or give medical advice.
            </li>
            <li>UI translations for Hindi and Kannada need review by native speakers before clinical use.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
