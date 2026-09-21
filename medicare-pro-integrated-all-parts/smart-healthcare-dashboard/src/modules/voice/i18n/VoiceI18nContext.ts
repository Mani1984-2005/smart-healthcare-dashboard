import { createContext } from "react";
import { createTranslator, type Translator } from "./translator";

export interface VoiceI18nValue {
  language: string;
  t: Translator;
}

export const VoiceI18nContext = createContext<VoiceI18nValue>({
  language: "en-IN",
  t: createTranslator("en-IN"),
});
