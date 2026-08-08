/**
 * Target languages offered for translation of a Fon transcript.
 * `code` is the value sent to the (future) translation endpoint.
 * `endonym` is the language's name in its own writing — a premium touch and
 * a nod to the West-African languages we serve.
 */
export type Language = {
  code: string;
  /** Display name in French (the app's UI language). */
  label: string;
  /** The language's name in its own script. */
  endonym: string;
  /** Two-letter token shown in the language badge. */
  short: string;
};

/** The source language — what the ASR model returns. */
export const SOURCE_LANGUAGE: Language = {
  code: "fon",
  label: "Fon",
  endonym: "Fɔngbè",
  short: "Fɔ",
};

export const TARGET_LANGUAGES: Language[] = [
  { code: "fr", label: "Français", endonym: "Français", short: "Fr" },
  { code: "en", label: "Anglais", endonym: "English", short: "En" },
  { code: "ee", label: "Éwé", endonym: "Eʋegbe", short: "Eʋ" },
  { code: "yo", label: "Yoruba", endonym: "Yorùbá", short: "Yo" },
  { code: "gun", label: "Goun", endonym: "Gungbe", short: "Gu" },
  { code: "gen", label: "Mina", endonym: "Gɛngbe", short: "Gɛ" },
];

export function getLanguage(code: string): Language | undefined {
  if (code === SOURCE_LANGUAGE.code) return SOURCE_LANGUAGE;
  return TARGET_LANGUAGES.find((l) => l.code === code);
}
