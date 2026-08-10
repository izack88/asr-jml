import type { TranscribeResponse, TranslateResponse } from "./types";

/**
 * Thin client over our route handlers.
 *
 * Both routes answer failures with `{ error }` in French, already written for
 * the reader. These helpers surface that message instead of a bare status code,
 * so the UI has something worth showing.
 */

/** The server's own message, falling back to the status when there isn't one. */
async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    // Not JSON — a proxy error page, or a body that never arrived.
  }
  return `${fallback} (erreur ${res.status})`;
}

/** Network-level failure: the request never reached the server. */
function offlineError(): Error {
  return new Error(
    "Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.",
  );
}

export async function transcribeAudio(
  audio: Blob,
  durationSec: number,
): Promise<TranscribeResponse> {
  const form = new FormData();
  form.append("audio", audio, "speech.webm");
  form.append("durationSec", String(durationSec));

  let res: Response;
  try {
    res = await fetch("/api/transcribe", { method: "POST", body: form });
  } catch {
    throw offlineError();
  }

  if (!res.ok) throw new Error(await readError(res, "Transcription échouée"));
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
  let res: Response;
  try {
    res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: transcript, target: targetCode, known }),
    });
  } catch {
    throw offlineError();
  }

  if (!res.ok) throw new Error(await readError(res, "Traduction échouée"));
  return (await res.json()) as TranslateResponse;
}
