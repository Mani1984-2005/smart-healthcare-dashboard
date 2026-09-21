import { create } from "zustand";
import { DEFAULT_LANGUAGE, isSupportedLanguage, resolveLanguage } from "../config/languages";
import type { LanguageCode, VoiceMode } from "../types/voice";
import { createId } from "../utils/id";

const LANGUAGE_KEY = "medicare.voice.language";
const MODE_KEY = "medicare.voice.mode";

/**
 * Only the language and the demo/live choice are remembered, in
 * sessionStorage (cleared when the tab closes). Transcripts are never put in
 * browser storage.
 */
function readSession(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode); the in-memory value still works.
  }
}

function loadMode(): VoiceMode | null {
  const stored = readSession(MODE_KEY);
  return stored === "live" || stored === "demo" ? stored : null;
}

interface VoiceSessionState {
  sessionId: string;
  language: LanguageCode;
  /** null until the person picks one; the module then applies its configured default. */
  mode: VoiceMode | null;
  /** True after someone tried to select a language the module does not have. */
  languageNotice: boolean;
  /** Returns false (and keeps the current language) for an unsupported code. */
  setLanguage: (code: string) => boolean;
  setMode: (mode: VoiceMode) => void;
  clearLanguageNotice: () => void;
  startNewSession: () => void;
}

function initialState() {
  return {
    sessionId: createId("session"),
    language: resolveLanguage(readSession(LANGUAGE_KEY)),
    mode: loadMode(),
    languageNotice: false,
  };
}

export const useVoiceSessionStore = create<VoiceSessionState>((set) => ({
  ...initialState(),
  setLanguage(code) {
    if (!isSupportedLanguage(code)) {
      set({ languageNotice: true });
      return false;
    }
    const language = resolveLanguage(code);
    writeSession(LANGUAGE_KEY, language);
    set({ language, languageNotice: false });
    return true;
  },
  setMode(mode) {
    writeSession(MODE_KEY, mode);
    set({ mode });
  },
  clearLanguageNotice() {
    set({ languageNotice: false });
  },
  startNewSession() {
    set({ sessionId: createId("session") });
  },
}));

/** Test helper: forget stored choices and return to defaults. */
export function resetVoiceSessionStore(): void {
  writeSession(LANGUAGE_KEY, null);
  writeSession(MODE_KEY, null);
  useVoiceSessionStore.setState({
    sessionId: createId("session"),
    language: DEFAULT_LANGUAGE,
    mode: null,
    languageNotice: false,
  });
}
