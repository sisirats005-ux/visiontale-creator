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
      console.warn("[VisionTale] Narration skipped — ELEVENLABS_API_KEY is not set.");
      return {
        result: null,
        error:
          "Narration requires ELEVENLABS_API_KEY in your .env.local file. Story and visuals still work without it.",
      };
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
      return { result: null, error: `Narration generation failed: ${msg}` };
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
