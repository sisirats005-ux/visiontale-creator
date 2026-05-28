import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getNarrationService } from "./narration.service";
import type { NarrationAudio, NarrationGenerationOptions } from "@/lib/types/character.types";

/**
 * AI Narration Generation Server Function
 *
 * BUG FIXES vs original:
 * 1. Server now returns base64-encoded audio data instead of a blob URL.
 *    blob URLs are browser-only and crash when created inside server functions.
 * 2. The client (index.tsx) is responsible for converting base64 → blob URL
 *    via base64ToAudioBlobUrl() before storing in state.
 * 3. Improved error messages — tells the user exactly which env var is missing.
 * 4. Added console logging for server-side tracing.
 */

const NarrationInputSchema = z.object({
  text: z.string().min(1).max(500),
  options: z.object({
    service: z.enum(["elevenlabs", "openai", "playht"]),
    voiceId: z.string().optional(),
    model: z.string().optional(),
  }),
});

export const generateNarration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => NarrationInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ result: NarrationAudio | null; error: string | null }> => {
    try {
      const narrationService = getNarrationService();

      if (!narrationService.isServiceAvailable(data.options.service)) {
        const envVarMap: Record<string, string> = {
          elevenlabs: "ELEVENLABS_API_KEY",
          openai: "OPENAI_API_KEY",
          playht: "PLAYHT_API_KEY",
        };
        const envVar = envVarMap[data.options.service] ?? `${data.options.service.toUpperCase()}_API_KEY`;
        console.warn(`[VisionTale] Narration skipped — ${envVar} is not set.`);
        return {
          result: null,
          error: `Narration requires ${envVar} in your .env.local file. Story generation and playback still work without it.`,
        };
      }

      console.log(`[VisionTale] Generating narration via ${data.options.service} for: "${data.text.slice(0, 60)}"`);
      const narrationAudio = await narrationService.generateNarration(data.text, data.options);
      console.log(`[VisionTale] Narration generated — estimated duration: ${narrationAudio.duration}s`);

      return { result: narrationAudio, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[VisionTale] generateNarration failed:", err);
      return { result: null, error: `Narration generation failed: ${msg}` };
    }
  });

/**
 * Batch narration generation for multiple scenes
 */
const BatchNarrationInputSchema = z.object({
  texts: z.array(z.string().min(1).max(500)),
  options: z.object({
    service: z.enum(["elevenlabs", "openai", "playht"]),
    voiceId: z.string().optional(),
    model: z.string().optional(),
  }),
});

export const generateBatchNarration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BatchNarrationInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ result: NarrationAudio[] | null; error: string | null }> => {
    try {
      const narrationService = getNarrationService();

      if (!narrationService.isServiceAvailable(data.options.service)) {
        return {
          result: null,
          error: `${data.options.service} API key is not configured.`,
        };
      }

      console.log(`[VisionTale] Generating batch narration (${data.texts.length} scenes) via ${data.options.service}`);
      const narrations = await narrationService.generateNarrations(data.texts, data.options);
      return { result: narrations, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[VisionTale] generateBatchNarration failed:", err);
      return { result: null, error: `Batch narration failed: ${msg}` };
    }
  });
