import type { TranscribeResponse, TranslateResponse } from "./types";

/**
 * Thin client over our route handlers. Today these hit local stubs; once the
 * Fon ASR + translation models are live, only the server routes change — this
 * client and the UI stay identical.
 */

export async function transcribeAudio(
  audio: Blob,
  durationSec: number,
): Promise<TranscribeResponse> {
  const form = new FormData();
  form.append("audio", audio, "speech.webm");
  form.append("durationSec", String(durationSec));

  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  if (!res.ok) throw new Error(`Transcription échouée (${res.status})`);
  return (await res.json()) as TranscribeResponse;
}

/**
 * `known` passes translations of this sentence the user has already seen, so a
 * new target language stays consistent with them instead of re-guessing the
 * meaning on its own.
 */
export async function translateText(
  transcript: string,
  targetCode: string,
  known?: Record<string, string>,
): Promise<TranslateResponse> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: transcript, target: targetCode, known }),
  });
  if (!res.ok) throw new Error(`Traduction échouée (${res.status})`);
  return (await res.json()) as TranslateResponse;
}
