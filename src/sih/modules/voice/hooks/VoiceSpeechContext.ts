import { createContext, useContext } from "react";
import type { UseSpeechSynthesis } from "./useSpeechSynthesis";

/** Lets every Listen button share one speech engine, so only one thing is read at a time. */
export const VoiceSpeechContext = createContext<UseSpeechSynthesis | null>(null);

export function useVoiceSpeech(): UseSpeechSynthesis {
  const value = useContext(VoiceSpeechContext);
  if (!value) throw new Error("useVoiceSpeech must be used inside a VoiceSpeechContext provider");
  return value;
}
