import type { TranscribeResponse } from "@/app/lib/types";

/**
 * Fon ASR transcription — proxies the recorded audio to the hosted model.
 *
 * Accepts the client's multipart/form-data (field "audio") and re-posts it to
 * the ASR service's /transcribe endpoint (fields "file" + "decoding"), which
 * returns { text: string, ... }. Runs on the Node.js runtime (default) since
 * it needs a real fetch to an external host. Requires FON_ASR_API_TOKEN.
 */

const ASR_API_URL =
  process.env.FON_ASR_API_URL ?? "https://51-158-36-210.sslip.io/transcribe";
const ASR_DECODING = process.env.FON_ASR_DECODING ?? "kenlm";

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const audio = form.get("audio");

  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json(
      { error: "Aucun audio reçu." },
      { status: 400 },
    );
  }

  const apiToken = process.env.FON_ASR_API_TOKEN;
  if (!apiToken) {
    return Response.json(
      { error: "FON_ASR_API_TOKEN n'est pas configurée sur le serveur." },
      { status: 500 },
    );
  }

  const upstreamForm = new FormData();
  upstreamForm.append("file", audio, "speech.webm");
  upstreamForm.append("decoding", ASR_DECODING);

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(ASR_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
      body: upstreamForm,
    });
  } catch {
    return Response.json(
      { error: "Le service de transcription est injoignable." },
      { status: 502 },
    );
  }

  if (!upstreamRes.ok) {
    const detail = await upstreamRes.text().catch(() => "");
    return Response.json(
      { error: `Transcription échouée : ${detail || upstreamRes.statusText}` },
      { status: upstreamRes.status },
    );
  }

  const data = (await upstreamRes.json()) as { text?: string };
  const body: TranscribeResponse = { transcript: data.text ?? "" };
  return Response.json(body);
}
