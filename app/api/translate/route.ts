import { getLanguage, SOURCE_LANGUAGE } from "@/app/lib/languages";
import type { TranslateResponse } from "@/app/lib/types";

/**
 * Translation of a Fon transcript via an OpenAI model.
 *
 * Request: JSON { text, target }. Response: { code, translation }. Requires
 * OPENAI_API_KEY in the environment; OPENAI_MODEL overrides the default model.
 */

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6";

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
          `message into ${targetName}. Reply with only the translation — no quotes, no notes, no explanations.`,
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

  const body: TranslateResponse = { code: target, translation };
  return Response.json(body);
}
