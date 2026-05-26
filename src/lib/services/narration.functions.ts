import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getNarrationService } from "./narration.service";
import type { NarrationAudio, NarrationGenerationOptions } from "@/lib/types/character.types";

/**
 * AI Narration Generation Server Function
 * 
 * Generates audio narration for story scenes using TTS services
 * Supports ElevenLabs, OpenAI TTS, and PlayHT
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
      
      // Check if service is available
      if (!narrationService.isServiceAvailable(data.options.service)) {
        return { 
          result: null, 
          error: `${data.options.service} API key is not configured. Please add the API key in environment variables.` 
        };
      }

      const narrationAudio = await narrationService.generateNarration(data.text, data.options);
      
      return { result: narrationAudio, error: null };
    } catch (err) {
      console.error("generateNarration failed:", err);
      return { result: null, error: "Failed to generate narration audio." };
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
      
      // Check if service is available
      if (!narrationService.isServiceAvailable(data.options.service)) {
        return { 
          result: null, 
          error: `${data.options.service} API key is not configured. Please add the API key in environment variables.` 
        };
      }

      const narrations = await narrationService.generateNarrations(data.texts, data.options);
      
      return { result: narrations, error: null };
    } catch (err) {
      console.error("generateBatchNarration failed:", err);
      return { result: null, error: "Failed to generate batch narration audio." };
    }
  });
