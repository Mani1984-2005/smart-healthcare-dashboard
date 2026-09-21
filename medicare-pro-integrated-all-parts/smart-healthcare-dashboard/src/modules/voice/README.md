# Voice, Multilingual & Accessible Clinical Interaction (SIH26047 - Part 2)

Self-contained module inside MediCare Pro. It lets a patient speak (or type) in
English, Hindi or Kannada, review and edit what was heard, optionally translate
it, hear text read aloud, and confirm before anything is submitted.

**Try it:** run `npm run dev`, open `/sih/voice` (no login needed).

## Use from another SIH part

```tsx
import { VoiceInteractionModule, type VoiceInteractionResult } from "../modules/voice"; // path relative to your file

<VoiceInteractionModule onSubmit={(result: VoiceInteractionResult) => { /* ... */ }} />
```

Import only from `src/modules/voice/index.ts`. The only data contract is
`VoiceInteractionResult` (`contractVersion: "1.0"`): original text and language,
raw recognizer text, `wasEdited`, optional translation (kept in separate
fields, never replacing the original), input method, confidence, timing and
`isDemoData`.

## Providers (all behind interfaces)

| Concern | Interface | Real adapter | Demo/mock |
| --- | --- | --- | --- |
| Speech to text | `SpeechRecognitionService` | Browser Web Speech API | `MockSpeechRecognitionService` |
| Translation | `TranslationService` | `HttpTranslationService` (your backend proxy) | `MockTranslationService` (sample sentences only) |
| Read aloud | `TextToSpeechService` | Browser `speechSynthesis` | `MockTextToSpeechService` |
| Storage | `VoiceInteractionRepository` | (none yet) | `MockVoiceInteractionRepository` (memory only) |

Add a provider with `registerSpeechProvider` / `registerTranslationProvider` /
`registerTtsProvider`; add a language with `registerLanguage` + `registerLocale`.

## Modes and configuration

`auto` (default) uses real browser speech when supported, otherwise demo mode
with an on-screen explanation. See `.env.example` at the repo root for the
`VITE_VOICE_*` settings. No secrets belong in the frontend.

## Commands

```
npm run test:voice        # module tests
npm run typecheck:voice   # module-only type check
npx eslint src/modules
```

## Privacy

Audio is never recorded or stored by this module. Transcripts live in memory
only; browser storage holds just the chosen language and mode. Transcripts are
never logged. In live mode the browser's speech service may process audio.

## Known limitations

- Hindi and Kannada UI strings were machine-written and need native-speaker
  review before clinical use.
- Demo translation covers only built-in sample sentences.
- Real translation needs a backend proxy (not part of this module).
- Browser speech recognition support varies (best in Chrome/Edge); other
  browsers get a clear fallback to typing or demo mode.
- The module does not diagnose or give medical advice.
