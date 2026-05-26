import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Character } from "@/lib/types/character.types";

/**
 * AI Story Generation Server Function
 *
 * Calls Lovable AI Gateway to generate a story with scene-by-scene
 * breakdown from a user prompt + genre. Returns structured JSON.
 * Now supports character consistency by injecting character details into prompts.
 */

const InputSchema = z.object({
  prompt: z.string().min(3).max(500),
  genre: z.string().min(1).max(50),
  character: z.object({
    name: z.string().optional(),
    appearance: z.string().optional(),
    outfit: z.string().optional(),
    hairstyle: z.string().optional(),
    visualTraits: z.string().optional(),
  }).optional(),
});

export type Scene = {
  index: number;
  title: string;
  description: string;
  imagePrompt: string;
  narration: string;
  cameraAngle?: string;
  duration?: string;
};

export type StoryResult = {
  title: string;
  logline: string;
  story: string;
  scenes: Scene[];
};

const SceneSchema = z.object({
  index: z.number(),
  title: z.string(),
  description: z.string(),
  imagePrompt: z.string(),
  narration: z.string(),
  cameraAngle: z.string().optional(),
  duration: z.string().optional(),
});

const StorySchema = z.object({
  title: z.string(),
  logline: z.string(),
  story: z.string(),
  scenes: z.array(SceneSchema).min(3).max(8),
});

export const generateStory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ result: StoryResult | null; error: string | null }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { result: null, error: "AI service is not configured." };
    }

    // Build character description for prompt injection
    let characterDescription = "";
    if (data.character) {
      const char = data.character;
      const parts = [];
      if (char.name) parts.push(`Name: ${char.name}`);
      if (char.appearance) parts.push(`Appearance: ${char.appearance}`);
      if (char.outfit) parts.push(`Outfit: ${char.outfit}`);
      if (char.hairstyle) parts.push(`Hairstyle: ${char.hairstyle}`);
      if (char.visualTraits) parts.push(`Visual Traits: ${char.visualTraits}`);
      if (parts.length > 0) {
        characterDescription = `\n\nCHARACTER CONSISTENCY REQUIREMENT:\n${parts.join('\n')}\n\nIMPORTANT: This character MUST appear consistently in ALL scenes with the EXACT SAME appearance, outfit, hairstyle, and visual traits. The character description above must be integrated into EVERY scene's image prompt to ensure visual consistency across the entire story.`;
      }
    }

    const systemPrompt = `You are a cinematic story writer for short AI-generated videos.
Given a user idea and genre, write a vivid, emotional short story (about 150-220 words),
then break it into 5 sequential scenes. Each scene needs a visual image prompt
(detailed, cinematic, suitable for an AI image generator) and a short narration line
(1-2 sentences, spoken aloud).${characterDescription ? ' ' + characterDescription : ''}
Return STRICT JSON matching the schema. No prose outside JSON.`;

    const userMessage = `Idea: ${data.prompt}\nGenre: ${data.genre}${characterDescription}\n\nReturn JSON with shape:
{
  "title": string,
  "logline": string (one sentence hook),
  "story": string (full short story),
  "scenes": [
    { "index": number (1-based), "title": string, "description": string,
      "imagePrompt": string, "narration": string, "cameraAngle": string (optional), "duration": string (optional) }
  ]
}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (res.status === 429) {
        return { result: null, error: "Rate limit reached. Please wait a moment and try again." };
      }
      if (res.status === 402) {
        return {
          result: null,
          error: "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
        };
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("AI gateway error:", res.status, text);
        return { result: null, error: `AI service error (${res.status}).` };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content ?? "";

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        // Fallback: try to extract JSON block
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) {
          return { result: null, error: "AI returned an invalid response." };
        }
        parsed = JSON.parse(match[0]);
      }

      const validated = StorySchema.safeParse(parsed);
      if (!validated.success) {
        console.error("Schema validation failed:", validated.error);
        return { result: null, error: "AI response did not match expected format." };
      }

      return { result: validated.data, error: null };
    } catch (err) {
      console.error("generateStory failed:", err);
      return { result: null, error: "Something went wrong generating your story." };
    }
  });
