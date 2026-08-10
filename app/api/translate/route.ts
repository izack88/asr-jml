import { getLanguage, SOURCE_LANGUAGE } from "@/app/lib/languages";
import type { TranslateResponse } from "@/app/lib/types";

/**
 * Translation of a Fon transcript via an OpenAI model.
 *
 * Request: JSON { text, target, known? }. Response: { code, translation }.
 * Requires OPENAI_API_KEY; OPENAI_MODEL overrides the default model.
 *
 * `known` carries translations of this same sentence already shown to the user
 * (code → text). Each target is a separate request, so without that anchor the
 * model re-guesses the meaning every time and the languages contradict each
 * other — measurably so on ambiguous Fon input. Passing it keeps them aligned.
 *
 * Model choice matters more than usual here: Fon is low-resource, and the
 * cheaper tiers produce confident nonsense on it. Default to the flagship.
 */

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-sol";

type OpenAIResponsesResult = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function extractOutputText(data: OpenAIResponsesResult): string {
  if (typeof data.output_text === "string") return data.output_text;

  const chunks: string[] = [];
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join("");
}

/** Render already-known translations as prompt context, newest-language last. */
function buildAnchor(
  known: Record<string, string> | undefined,
  target: string,
): string {
  if (!known) return "";

  const lines: string[] = [];
  for (const [code, text] of Object.entries(known)) {
    if (code === target || typeof text !== "string" || !text.trim()) continue;
    const language = getLanguage(code);
    lines.push(`- ${language ? language.label : code}: ${text.trim()}`);
  }
  if (lines.length === 0) return "";

  return (
    "\n\nThis same Fon sentence has already been translated as:\n" +
    lines.join("\n") +
    "\nYour translation must convey exactly that same meaning."
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: {
    text?: string;
    target?: string;
    known?: Record<string, string>;
  };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "JSON invalide." }, { status: 400 });
  }

  const { text, target, known } = payload;
  if (!text || !target) {
    return Response.json(
      { error: "Champs « text » et « target » requis." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY n'est pas configurée sur le serveur." },
      { status: 500 },
    );
  }

  const targetLanguage = getLanguage(target);
  const targetName = targetLanguage
    ? `${targetLanguage.label} (${targetLanguage.endonym})`
    : target;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        reasoning: { effort: "low" },
        instructions:
          `You are an expert translator of ${SOURCE_LANGUAGE.label} (${SOURCE_LANGUAGE.endonym}), ` +
          "a Gbe language of West Africa, into other regional languages. Translate the user's " +
          `message into ${targetName}. Reply with only the translation — no quotes, no notes, no explanations.` +
          buildAnchor(known, target),
        input: text,
      }),
    });
  } catch {
    return Response.json(
      { error: "Le service de traduction est injoignable." },
      { status: 502 },
    );
  }

  if (!upstreamRes.ok) {
    const detail = await upstreamRes.text().catch(() => "");
    return Response.json(
      { error: `Traduction échouée : ${detail || upstreamRes.statusText}` },
      { status: upstreamRes.status },
    );
  }

  const data = (await upstreamRes.json()) as OpenAIResponsesResult;
  const translation = extractOutputText(data).trim();

  // A blank answer is a failure, not a translation — say so rather than
  // handing the UI an empty row it would render as nothing.
  if (!translation) {
    return Response.json(
      { error: "Le modèle n'a renvoyé aucune traduction. Réessayez." },
      { status: 502 },
    );
  }

  const body: TranslateResponse = { code: target, translation };
  return Response.json(body);
}
