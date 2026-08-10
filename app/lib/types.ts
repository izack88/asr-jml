/** A single translation of a transcript into one target language. */
export type Translation = {
  /** Target language code, e.g. "fr". */
  code: string;
  /** Translated text, or null while loading. */
  text: string | null;
  status: "idle" | "loading" | "done" | "error";
  /** Why it failed, in French, ready to show. Set only when status is "error". */
  error?: string;
};

/** One spoken turn: the captured audio, its Fon transcript, and translations. */
export type Utterance = {
  id: string;
  /** Local object URL of the recorded audio, for playback. */
  audioUrl: string;
  /** The captured audio itself, kept so a failed transcription can be retried. */
  audioBlob: Blob;
  /** Recording length in seconds. */
  durationSec: number;
  /**
   * Fon transcription. `null` while transcribing or after a failure; an empty
   * string is a real answer — the model heard no speech.
   */
  transcript: string | null;
  status: "transcribing" | "ready" | "error";
  /** Why it failed, in French, ready to show. Set only when status is "error". */
  error?: string;
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
