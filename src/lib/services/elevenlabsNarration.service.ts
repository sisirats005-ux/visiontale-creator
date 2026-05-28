/**
 * ElevenLabs text-to-speech — server-side only (FREE tier with API key).
 * One fetch per call; no retries.
 */

import type { NarrationAudio } from "@/lib/types/character.types";

export const ELEVENLABS_MODEL = "eleven_multilingual_v2";
export const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";
export const NARRATION_FETCH_TIMEOUT_MS = 60_000;

/** Known voice IDs (Rachel default, Adam alternate). */
export const ELEVENLABS_VOICES: Record<string, string> = {
  Rachel: "21m00Tcm4TlvDq8ikWAM",
  Adam: "pNInz6obpgDQGcFmaJgB",
};

function resolveVoiceId(override?: string): string {
  const envVoice = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (envVoice) return envVoice;

  const envName = process.env.ELEVENLABS_VOICE_NAME?.trim();
  if (envName && ELEVENLABS_VOICES[envName]) {
    return ELEVENLABS_VOICES[envName];
  }

  if (override && ELEVENLABS_VOICES[override]) {
    return ELEVENLABS_VOICES[override];
  }
  if (override && override.length > 10) return override;

  return ELEVENLABS_VOICES.Rachel;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** ~150 words/min speaking rate */
function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2, Math.round((words / 150) * 60));
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

export type ElevenLabsNarrationInput = {
  text: string;
  voiceId?: string;
  model?: string;
};

export async function generateElevenLabsNarration(
  input: ElevenLabsNarrationInput,
  requestId: string,
): Promise<NarrationAudio> {
  const rawKey = process.env.ELEVENLABS_API_KEY;
  const apiKey = rawKey?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }

  const voiceId = resolveVoiceId(input.voiceId);
  const model = input.model ?? ELEVENLABS_MODEL;
  const url = `${ELEVENLABS_TTS_URL}/${voiceId}?output_format=mp3_44100_128`;

  const body = {
    text: input.text,
    model_id: model,
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.35,
      use_speaker_boost: true,
    },
  };

  console.log(
    "[VisionTale] ElevenLabs TTS request",
    JSON.stringify({
      requestId,
      url: `${ELEVENLABS_TTS_URL}/${voiceId}`,
      model,
      voiceId,
      textLength: input.text.length,
      textPreview: input.text.slice(0, 80),
      timeoutMs: NARRATION_FETCH_TIMEOUT_MS,
      apiKeyLoaded: true,
      apiKeyLength: apiKey.length,
      apiKeyHadWhitespace: rawKey !== apiKey,
    }),
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NARRATION_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "(no body)");
      console.error(
        "[VisionTale] ElevenLabs TTS error",
        JSON.stringify({
          requestId,
          status: res.status,
          body: errBody,
        }),
      );
      throw new Error(`ElevenLabs API error (HTTP ${res.status}). Check server logs.`);
    }

    const contentType = res.headers.get("content-type") ?? "audio/mpeg";
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 100) {
      throw new Error("ElevenLabs returned empty or invalid audio.");
    }

    const base64Data = arrayBufferToBase64(buffer);
    const duration = estimateDuration(input.text);

    console.log(
      "[VisionTale] ElevenLabs TTS success",
      JSON.stringify({
        requestId,
        voiceId,
        model,
        bytes: buffer.byteLength,
        estimatedDurationSec: duration,
        contentType,
      }),
    );

    return {
      url: "",
      base64Data,
      duration,
      service: "elevenlabs",
    };
  } finally {
    clearTimeout(timer);
  }
}
