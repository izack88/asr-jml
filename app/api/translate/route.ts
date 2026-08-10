import { getLanguage, SOURCE_LANGUAGE } from "@/app/lib/languages";
import type { TranslateResponse } from "@/app/lib/types";

/**
 * Translation of a Fon transcript via the RapidAPI "multi-traduction" service
 * (a Google Translate front end).
 *
 * Request: JSON { text, target }. Response: { code, translation }.
 * Requires RAPIDAPI_KEY in the environment.
 *
 * The upstream answers `["translated text"]` on success. Two of its behaviours
 * shape the code below:
 *
 *  - An unknown target code does NOT fail. It silently returns *English* with
 *    HTTP 200 — verified with "zzz", "mina" and "goun", all of which came back
 *    byte-identical to `to: "en"`. Handing that to the UI would label English
 *    text as Mina, so only codes known to be genuinely supported are sent.
 *  - Rejected codes answer with a Google HTML error page, not JSON.
 */

const RAPIDAPI_HOST = "rapid-translate-multi-traduction.p.rapidapi.com";
const TRANSLATE_URL = `https://${RAPIDAPI_HOST}/t`;

/**
 * Target codes the provider actually translates into, each verified by checking
 * its output differs from English on two different sentences.
 *
 * This mirrors TARGET_LANGUAGES today, and stays as the safety net: adding a
 * language to the UI without confirming it here means users would be shown
 * English labelled as that language. Codes checked and rejected upstream:
 * `gun`/`guw` (Goun), `gen`/`gej` (Mina), `mos`, `bba`, `kbp`, `dje`, `nqo`.
 */
const SUPPORTED_TARGETS = new Set(["fr", "en", "ee", "yo", "ff", "ha"]);

/** Pull the translated string out of `["text"]`, or `"text"`. */
function extractTranslation(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) {
    const first = payload.find((v) => typeof v === "string" && v.trim());
    if (typeof first === "string") return first;
  }
  return "";
}

export async function POST(request: Request): Promise<Response> {
  let payload: { text?: string; target?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "JSON invalide." }, { status: 400 });
  }

  const { text, target } = payload;
  if (!text || !target) {
    return Response.json(
      { error: "Champs « text » et « target » requis." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "RAPIDAPI_KEY n'est pas configurée sur le serveur." },
      { status: 500 },
    );
  }

  // Refuse rather than let the provider answer in English under this label.
  if (!SUPPORTED_TARGETS.has(target)) {
    const language = getLanguage(target);
    return Response.json(
      {
        error: `Le service de traduction ne prend pas encore en charge ${
          language ? language.label : target
        }.`,
      },
      { status: 501 },
    );
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
      body: JSON.stringify({
        from: SOURCE_LANGUAGE.code,
        to: target,
        q: [text],
      }),
    });
  } catch {
    return Response.json(
      { error: "Le service de traduction est injoignable." },
      { status: 502 },
    );
  }

  if (!upstreamRes.ok) {
    return Response.json(
      { error: `Traduction échouée (erreur ${upstreamRes.status}).` },
      { status: upstreamRes.status === 400 ? 502 : upstreamRes.status },
    );
  }

  // A rejected code answers with an HTML error page, so don't assume JSON.
  let data: unknown;
  try {
    data = await upstreamRes.json();
  } catch {
    return Response.json(
      { error: "Réponse inattendue du service de traduction." },
      { status: 502 },
    );
  }

  const translation = extractTranslation(data).trim();
  if (!translation) {
    return Response.json(
      { error: "Le service n'a renvoyé aucune traduction. Réessayez." },
      { status: 502 },
    );
  }

  const body: TranslateResponse = { code: target, translation };
  return Response.json(body);
}
