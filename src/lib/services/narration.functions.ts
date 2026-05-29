import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getNarrationService } from "./narration.service";
import { ELEVENLABS_MODEL } from "./elevenlabsNarration.service";
import type { NarrationAudio } from "@/lib/types/character.types";

const NarrationOptionsSchema = z.object({
  voiceId: z.string().optional(),
  model: z.string().optional(),
});

const NarrationInputSchema = z.object({
  text: z.string().min(1).max(500),
  options: NarrationOptionsSchema.optional(),
});

async function generateGoogleTTS(text: string): Promise<string> {
  const chunks: string[] = [];
  let currentChunk = "";
  const words = text.split(" ");
  for (const word of words) {
    if ((currentChunk + " " + word).length > 200) {
      chunks.push(currentChunk.trim());
      currentChunk = word;
    } else {
      currentChunk = currentChunk ? `${currentChunk} ${word}` : word;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      throw new Error(`Google TTS HTTP error ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    buffers.push(Buffer.from(arrayBuffer));
  }

  const combinedBuffer = Buffer.concat(buffers);
  return combinedBuffer.toString("base64");
}

/**
 * ElevenLabs narration — one server request per invocation.
 * Client converts base64 → blob URL for playback/export.
 */
export const generateNarration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => NarrationInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ result: NarrationAudio | null; error: string | null }> => {
    const requestId = `nar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const narrationService = getNarrationService();

    if (!narrationService.isServiceAvailable()) {
      console.log("[VisionTale] ElevenLabs is unavailable. Using Google Translate TTS fallback.");
      try {
        const base64Data = await generateGoogleTTS(data.text);
        const duration = Math.max(2, Math.round((data.text.split(" ").length / 150) * 60));
        return {
          result: {
            url: "",
            base64Data,
            duration,
            service: "google-tts",
            isFallback: true,
          },
          error: null,
        };
      } catch (err) {
        console.error("[VisionTale] Google Translate TTS fallback failed:", err);
        return {
          result: null,
          error: "Failed to generate fallback narration audio.",
        };
      }
    }

    console.log(
      "[VisionTale] generateNarration start",
      JSON.stringify({
        requestId,
        provider: "elevenlabs",
        model: data.options?.model ?? ELEVENLABS_MODEL,
        voice: data.options?.voiceId ?? "Rachel (default)",
        textPreview: data.text.slice(0, 80),
      }),
    );

    try {
      const narrationAudio = await narrationService.generateNarration(
        data.text,
        {
          voiceId: data.options?.voiceId,
          model: data.options?.model ?? ELEVENLABS_MODEL,
        },
        requestId,
      );

      return { result: narrationAudio, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[VisionTale] generateNarration failed:", err);
      console.log("[VisionTale] ElevenLabs request failed. Using Google Translate TTS fallback.");
      try {
        const base64Data = await generateGoogleTTS(data.text);
        const duration = Math.max(2, Math.round((data.text.split(" ").length / 150) * 60));
        return {
          result: {
            url: "",
            base64Data,
            duration,
            service: "google-tts",
            isFallback: true,
          },
          error: null,
        };
      } catch (fallbackErr) {
        console.error("[VisionTale] Google Translate TTS fallback also failed:", fallbackErr);
        return { result: null, error: `Narration generation failed: ${msg}` };
      }
    }
  });

const BatchNarrationInputSchema = z.object({
  texts: z.array(z.string().min(1).max(500)),
  options: NarrationOptionsSchema.optional(),
});

export const generateBatchNarration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BatchNarrationInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ result: NarrationAudio[] | null; error: string | null }> => {
    const narrationService = getNarrationService();

    if (!narrationService.isServiceAvailable()) {
      return {
        result: null,
        error: "ELEVENLABS_API_KEY is not configured.",
      };
    }

    console.log(
      "[VisionTale] generateBatchNarration",
      JSON.stringify({ sceneCount: data.texts.length, model: data.options?.model ?? ELEVENLABS_MODEL }),
    );

    try {
      const narrations = await narrationService.generateNarrations(data.texts, {
        voiceId: data.options?.voiceId,
        model: data.options?.model ?? ELEVENLABS_MODEL,
      });
      return { result: narrations, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[VisionTale] generateBatchNarration failed:", err);
      return { result: null, error: `Batch narration failed: ${msg}` };
    }
  });

export { ELEVENLABS_MODEL } from "./elevenlabsNarration.service";
export { ELEVENLABS_VOICES } from "./elevenlabsNarration.service";
