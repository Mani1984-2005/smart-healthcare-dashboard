/**
 * Sample patient sentences used ONLY by the demo/mock providers. They are
 * demonstration data, not clinical output, and are always labelled as such
 * in the UI.
 */
export interface DemoPhrase {
  en: string;
  hi: string;
  kn: string;
}

export const DEMO_PHRASES: DemoPhrase[] = [
  {
    en: "I have had fever for two days.",
    hi: "मुझे दो दिन से बुखार है।",
    kn: "ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ಜ್ವರ ಇದೆ",
  },
  {
    en: "I have had fever for two days and body pain.",
    hi: "मुझे दो दिन से बुखार है और बदन दर्द हो रहा है।",
    kn: "ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ಮೈ ಕೈ ನೋವು ಇದೆ.",
  },
  {
    // Code-switched sentence (Kannada + English "fever"); kept verbatim as the Kannada form.
    en: "Doctor, I have fever.",
    hi: "डॉक्टर, मुझे बुखार है।",
    kn: "Doctor, ನನಗೆ fever ಇದೆ.",
  },
];

/** What the mock recognizer "hears", per primary language, in rotation. */
export const DEMO_SPOKEN_SAMPLES: Record<string, string[]> = {
  en: ["I have had fever for two days and body pain.", "Doctor, I have fever."],
  hi: ["मुझे दो दिन से बुखार है और बदन दर्द हो रहा है।"],
  kn: ["ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ಜ್ವರ ಇದೆ", "Doctor, ನನಗೆ fever ಇದೆ."],
};
