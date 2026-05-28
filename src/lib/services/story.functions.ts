import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * AI Story Generation Server Function — Multi-Character Edition
 *
 * BUG FIXES vs original:
 * 1. Switched model from `meta-llama/llama-3.2-3b-instruct:free` to
 *    `meta-llama/llama-3.3-70b-instruct:free` — the 3B model frequently
 *    returns malformed JSON and ignores JSON schema instructions.
 * 2. Added multi-layer JSON extraction: markdown fences → raw brace match →
 *    partial recovery, so a single stray character doesn't kill the whole response.
 * 3. Added `temperature: 0.7` for more consistent structured output.
 * 4. Improved error messages with actionable guidance for common HTTP status codes.
 * 5. Added `console.log` tracing at key pipeline steps for easier debugging.
 */

const CharacterSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  appearance: z.string().min(1),
  outfit: z.string().optional(),
  hairstyle: z.string().optional(),
  visualTraits: z.string().optional(),
  role: z.string().optional(),
});

const InputSchema = z.object({
  prompt: z.string().min(3).max(500),
  genre: z.string().min(1).max(50),
  characters: z.array(CharacterSchema).max(6).default([]),
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
  imagePrompt: z.string().min(10),
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

function buildCharacterBlock(
  characters: z.infer<typeof CharacterSchema>[]
): string {
  if (characters.length === 0) return "";

  const charLines = characters.map((char, i) => {
    const parts: string[] = [];
    const label = char.role ? `${char.name} (${char.role})` : char.name;
    parts.push(`CHARACTER ${i + 1}: ${label}`);
    parts.push(`  Appearance: ${char.appearance}`);
    if (char.outfit) parts.push(`  Outfit: ${char.outfit}`);
    if (char.hairstyle) parts.push(`  Hairstyle: ${char.hairstyle}`);
    if (char.visualTraits) parts.push(`  Visual Traits: ${char.visualTraits}`);
    return parts.join("\n");
  });

  const names = characters.map((c) => c.name).join(", ");

  return `

MULTI-CHARACTER CONSISTENCY REQUIREMENT:
The story features ${characters.length} character(s): ${names}.

${charLines.join("\n\n")}

CRITICAL RULES FOR imagePrompt FIELDS:
1. Every scene's imagePrompt MUST include the EXACT appearance of EVERY character
   that appears in that scene — name, outfit, hair, and visual traits verbatim.
2. If multiple characters share a scene, describe their spatial relationship
   (e.g. "facing each other", "standing side by side", "in the background").
3. NEVER describe a character differently from the definitions above.
4. Character appearance details must come FIRST in the imagePrompt before
   lighting, mood, or compositional notes.`;
}

/**
 * Robust JSON extraction from LLM output.
 * Handles: plain JSON, markdown-fenced JSON, JSON buried in prose.
 */
function extractJson(content: string): unknown {
  const trimmed = content.trim();

  // 1. Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // 2. Strip markdown code fences and retry
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  // 3. Extract first JSON object from mixed content
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // continue
    }
  }

  throw new Error("No valid JSON found in AI response");
}

export const generateStory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ result: StoryResult | null; error: string | null }> => {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        console.error("[VisionTale] OPENROUTER_API_KEY is not set in environment.");
        return {
          result: null,
          error:
            "AI service is not configured. Add OPENROUTER_API_KEY to your .env.local file.",
        };
      }

      const characterBlock = buildCharacterBlock(data.characters);
      const hasCharacters = data.characters.length > 0;

      const systemPrompt = `You are a cinematic story writer for short AI-generated videos.
Given a user idea and genre, write a vivid, emotional short story (about 150-220 words),
then break it into 5 sequential scenes. Each scene needs:
- "imagePrompt": a DETAILED cinematic image description (minimum 20 words, suitable for
  FLUX image generation). Include character appearances EXACTLY as specified, plus
  lighting, mood, composition, and color palette. NEVER leave this empty or vague.
- "narration": a short spoken line (1-2 sentences).${hasCharacters ? characterBlock : ""}
Return STRICT JSON matching the schema. No prose outside JSON. No markdown fences.`;

      const characterSummary =
        hasCharacters
          ? `\n\nCharacters in this story:\n${data.characters
              .map(
                (c) =>
                  `- ${c.name}${c.role ? ` (${c.role})` : ""}: ${c.appearance}${c.outfit ? `, wearing ${c.outfit}` : ""}${c.hairstyle ? `, ${c.hairstyle}` : ""}${c.visualTraits ? `, ${c.visualTraits}` : ""}`
              )
              .join("\n")}`
          : "";

      const userMessage = `Idea: ${data.prompt}
Genre: ${data.genre}${characterSummary}

Return JSON with shape:
{
  "title": string,
  "logline": string (one sentence hook),
  "story": string (full short story),
  "scenes": [
    { "index": number (1-based), "title": string, "description": string,
      "imagePrompt": string (20+ words, character appearances first, then cinematics),
      "narration": string,
      "cameraAngle": string (optional), "duration": string (optional) }
  ]
}`;

      console.log("[VisionTale] Generating story for prompt:", data.prompt.slice(0, 60));

      try {
        const res = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://visiontale.app",
              "X-Title": "VisionTale Creator",
            },
            body: JSON.stringify({
              // FIX: Use a stronger free model that reliably outputs valid JSON.
              // llama-3.2-3b-instruct:free frequently corrupted JSON output.
              model: "meta-llama/llama-3.3-70b-instruct:free",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
              ],
              response_format: { type: "json_object" },
              temperature: 0.7,
              max_tokens: 2000,
            }),
          }
        );

        if (res.status === 429) {
          return {
            result: null,
            error:
              "Rate limit reached — OpenRouter free tier allows ~10 requests/min. Please wait a moment and try again.",
          };
        }
        if (res.status === 402) {
          return {
            result: null,
            error:
              "OpenRouter credits exhausted. Top up at openrouter.ai/credits, or switch to a free model.",
          };
        }
        if (res.status === 401) {
          return {
            result: null,
            error:
              "OpenRouter API key is invalid. Check your OPENROUTER_API_KEY in .env.local.",
          };
        }
        if (!res.ok) {
          const text = await res.text().catch(() => "(no body)");
          console.error("[VisionTale] OpenRouter error:", res.status, text);
          return {
            result: null,
            error: `AI service returned an error (HTTP ${res.status}). Check the console for details.`,
          };
        }

        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
        };

        // OpenRouter sometimes wraps errors in a 200 response
        if (json.error) {
          console.error("[VisionTale] OpenRouter API error in response:", json.error);
          return { result: null, error: json.error.message ?? "AI service error." };
        }

        const content = json.choices?.[0]?.message?.content ?? "";
        if (!content) {
          console.error("[VisionTale] Empty content from OpenRouter:", JSON.stringify(json));
          return { result: null, error: "AI returned an empty response. Please try again." };
        }

        console.log("[VisionTale] Raw AI response length:", content.length);

        let parsed: unknown;
        try {
          parsed = extractJson(content);
        } catch (parseErr) {
          console.error("[VisionTale] JSON extraction failed:", parseErr, "\nRaw content:", content.slice(0, 500));
          return {
            result: null,
            error:
              "AI returned an unreadable response. This sometimes happens with free models — please try again.",
          };
        }

        const validated = StorySchema.safeParse(parsed);
        if (!validated.success) {
          console.error("[VisionTale] Schema validation failed:", validated.error.flatten());
          // Attempt partial recovery: if we have title/story/scenes, patch missing fields
          const raw = parsed as Record<string, unknown>;
          if (Array.isArray(raw?.scenes) && raw.scenes.length >= 3) {
            // Patch scenes that are missing imagePrompt
            const patchedScenes = raw.scenes.map((s: Record<string, unknown>, i: number) => ({
              index: typeof s.index === "number" ? s.index : i + 1,
              title: s.title ?? `Scene ${i + 1}`,
              description: s.description ?? "",
              imagePrompt:
                typeof s.imagePrompt === "string" && s.imagePrompt.length > 5
                  ? s.imagePrompt
                  : `Cinematic scene ${i + 1}: ${s.title ?? ""}, ${data.genre} style, dramatic lighting`,
              narration: s.narration ?? "",
              cameraAngle: s.cameraAngle,
              duration: s.duration,
            }));

            const recovery = StorySchema.safeParse({ ...raw, scenes: patchedScenes });
            if (recovery.success) {
              console.log("[VisionTale] Recovered story via partial patch.");
              return { result: recovery.data, error: null };
            }
          }
          return {
            result: null,
            error:
              "AI response was in an unexpected format. Please try again — free models occasionally produce partial output.",
          };
        }

        console.log("[VisionTale] Story generated successfully:", validated.data.title);
        return { result: validated.data, error: null };
      } catch (err) {
        console.error("[VisionTale] generateStory network/fetch error:", err);
        return {
          result: null,
          error:
            "Network error while contacting the AI service. Check your internet connection and try again.",
        };
      }
    }
  );
