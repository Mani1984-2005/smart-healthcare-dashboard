import { useContext } from "react";
import { VoiceI18nContext } from "./VoiceI18nContext";

/** `const { t } = useVoiceI18n(); t("voice.startLabel")` */
export function useVoiceI18n() {
  return useContext(VoiceI18nContext);
}
