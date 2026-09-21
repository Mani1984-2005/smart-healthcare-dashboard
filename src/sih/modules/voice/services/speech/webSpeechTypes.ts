/**
 * Minimal typings for the Web Speech API. TypeScript's DOM lib does not ship
 * these, and the constructor is vendor-prefixed in Chromium and Safari.
 */
export interface WebSpeechAlternative {
  transcript: string;
  confidence: number;
}

export interface WebSpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: WebSpeechAlternative;
}

export interface WebSpeechResultEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: WebSpeechResult };
}

export interface WebSpeechErrorEvent {
  readonly error: string;
}

export interface WebSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: WebSpeechErrorEvent) => void) | null;
  onresult: ((event: WebSpeechResultEvent) => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type WebSpeechRecognitionConstructor = new () => WebSpeechRecognition;

export function getWebSpeechConstructor(): WebSpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: WebSpeechRecognitionConstructor;
    webkitSpeechRecognition?: WebSpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
