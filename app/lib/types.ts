/** A single translation of a transcript into one target language. */
export type Translation = {
  /** Target language code, e.g. "fr". */
  code: string;
  /** Translated text, or null while loading. */
  text: string | null;
  status: "idle" | "loading" | "done" | "error";
};

/** One spoken turn: the captured audio, its Fon transcript, and translations. */
export type Utterance = {
  id: string;
  /** Local object URL of the recorded audio, for playback. */
  audioUrl: string;
  /** Recording length in seconds. */
  durationSec: number;
  /** Fon transcription, or null while transcribing. */
  transcript: string | null;
  status: "transcribing" | "ready" | "error";
  /** Keyed by target language code. */
  translations: Record<string, Translation>;
  createdAt: number;
};

/** Shape returned by POST /api/transcribe. */
export type TranscribeResponse = {
  transcript: string;
  /** Model confidence 0–1, when available. */
  confidence?: number;
};

/** Shape returned by POST /api/translate. */
export type TranslateResponse = {
  code: string;
  translation: string;
};
