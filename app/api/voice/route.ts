import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isMostlyKyrgyz, kyrgyzSystemPrompt } from "@/lib/kyrgyz";
import { resolveProviderKey } from "@/lib/provider";

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

async function openAiTranscribe({
  apiKey,
  audio
}: {
  apiKey: string;
  audio: File;
}) {
  const formData = new FormData();
  formData.append("file", audio);
  formData.append("model", "whisper-1");
  formData.append("language", "ky");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${errorText}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text.trim();
}

async function openAiAnswer({
  apiKey,
  text
}: {
  apiKey: string;
  text: string;
}) {
  const systemPrompt = kyrgyzSystemPrompt();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      temperature: 0.4
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM failed: ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return payload.choices[0]?.message?.content?.trim() ?? "";
}

async function openAiAnswerWithGuard({
  apiKey,
  text
}: {
  apiKey: string;
  text: string;
}) {
  let answer = await openAiAnswer({ apiKey, text });
  if (isMostlyKyrgyz(answer)) {
    return answer;
  }

  answer = await openAiAnswer({
    apiKey,
    text: `Кыргызча гана жооп бер. Суроо: ${text}`
  });

  if (!isMostlyKyrgyz(answer)) {
    return "Кечиресиз, азыр жооп бере албай жатам. Суранычы, кайра суроо бериңиз.";
  }

  return answer;
}

async function openAiTts({
  apiKey,
  text
}: {
  apiKey: string;
  text: string;
}) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "alloy",
      input: text,
      format: "mp3"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS failed: ${errorText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString("base64");
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  const formData = await request.formData();
  const audio = formData.get("audio");
  const providerMode = (formData.get("providerMode") as string) ?? "server";

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Audio file missing" }, { status: 400 });
  }

  if (audio.size > MAX_AUDIO_SIZE_BYTES) {
    return NextResponse.json({ error: "Audio file too large" }, { status: 413 });
  }

  try {
    const apiKey = await resolveProviderKey({
      userId: session?.user?.id ?? null,
      mode: providerMode === "user" ? "user" : "server"
    });

    const transcript = await openAiTranscribe({ apiKey, audio });
    const answerText = await openAiAnswerWithGuard({ apiKey, text: transcript });
    const audioBase64 = await openAiTts({ apiKey, text: answerText });

    return NextResponse.json({
      transcript,
      answerText,
      audioBase64,
      format: "mp3"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Voice pipeline error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
