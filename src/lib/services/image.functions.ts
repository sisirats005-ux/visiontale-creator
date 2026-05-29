import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  generatePollinationsImage,
  POLLINATIONS_IMAGE_MODEL,
} from "@/lib/services/pollinationsImage.service";

const InputSchema = z.object({
  prompt: z.string().min(3).max(4000),
  seed: z.number().int().min(0).max(1_000_000).default(0),
  width: z.number().int().min(64).max(2048).default(1024),
  height: z.number().int().min(64).max(2048).default(576),
});

export type GeneratedImageResult = {
  /** Browser-loadable data URL (real image or SVG placeholder). */
  url: string;
  base64Data: string;
  contentType: string;
  model: string;
  provider: "pollinations";
  isPlaceholder: boolean;
  optimizedPrompt: string;
  errorDetails?: string;
};

/**
 * Server-side scene image generation via Pollinations (FREE).
 * Exactly one upstream fetch per invocation — no retries.
 */
export const generateSceneImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ result: GeneratedImageResult | null; error: string | null }> => {
    const requestId = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    console.log(
      "[VisionTale] generateSceneImage start",
      JSON.stringify({
        requestId,
        provider: "pollinations",
        model: POLLINATIONS_IMAGE_MODEL,
        seed: data.seed,
        width: data.width,
        height: data.height,
        rawPromptLength: data.prompt.length,
      }),
    );

    try {
      const generated = await generatePollinationsImage(
        {
          prompt: data.prompt,
          seed: data.seed,
          width: data.width,
          height: data.height,
        },
        requestId,
      );

      return {
        result: {
          url: generated.url,
          base64Data: generated.base64Data,
          contentType: generated.contentType,
          model: generated.model,
          provider: "pollinations",
          isPlaceholder: generated.isPlaceholder,
          optimizedPrompt: generated.optimizedPrompt,
          errorDetails: generated.errorDetails,
        },
        error: generated.isPlaceholder
          ? generated.errorDetails || "Image provider unavailable — placeholder used."
          : null,
      };
    } catch (err) {
      console.error("[VisionTale] generateSceneImage fatal error:", err);
      return {
        result: null,
        error: "Image generation failed unexpectedly. Please try again.",
      };
    }
  });
