import { useMemo, type ReactNode } from "react";
import { VoiceI18nContext } from "./VoiceI18nContext";
import { createTranslator } from "./translator";

export default function VoiceI18nProvider({ language, children }: { language: string; children: ReactNode }) {
  const value = useMemo(() => ({ language, t: createTranslator(language) }), [language]);
  return <VoiceI18nContext.Provider value={value}>{children}</VoiceI18nContext.Provider>;
}
