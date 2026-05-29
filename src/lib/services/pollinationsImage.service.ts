/**
 * Centralized Pollinations image generation (server-side only).
 * FREE — no API key. One fetch per call; no retries.
 */

import { optimizeImagePrompt } from "@/lib/utils/imagePromptOptimizer";

export const POLLINATIONS_IMAGE_MODEL = "turbo";
export const POLLINATIONS_BASE = "https://image.pollinations.ai";

/** Default server fetch timeout (ms). */
export const IMAGE_FETCH_TIMEOUT_MS = 45_000;

export type PollinationsGenerateInput = {
  prompt: string;
  seed: number;
  width: number;
  height: number;
};

export type PollinationsGenerateResult = {
  /** Always a browser-loadable data URL (image or SVG placeholder). */
  url: string;
  base64Data: string;
  contentType: string;
  model: string;
  isPlaceholder: boolean;
  optimizedPrompt: string;
  requestUrl?: string;
};

function buildPollinationsUrl(
  optimizedPrompt: string,
  seed: number,
  width: number,
  height: number,
): string {
  const encoded = encodeURIComponent(optimizedPrompt);
  return `${POLLINATIONS_BASE}/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${POLLINATIONS_IMAGE_MODEL}`;
}

function buildPlaceholderDataUrl(width: number, height: number, label: string): string {
  const safeLabel = label.slice(0, 48).replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1f3a"/>
      <stop offset="100%" style="stop-color:#0d1020"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#7eb8ff" font-family="system-ui,sans-serif" font-size="22" opacity="0.9">Scene unavailable</text>
  <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="#9aa4c7" font-family="ui-monospace,monospace" font-size="12" opacity="0.7">${safeLabel}</text>
</svg>`;
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(svg, "utf-8").toString("base64")
      : btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<{ buffer: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "image/*",
        "User-Agent": "VisionTale-Creator/1.0 (demo)",
        Connection: "close",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Pollinations HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      const body = await res.text().catch(() => "");
      throw new Error(`Unexpected content-type ${contentType}: ${body.slice(0, 120)}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), contentType };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Single Pollinations image generation attempt (no retries).
 */
export async function generatePollinationsImage(
  input: PollinationsGenerateInput,
  requestId: string,
): Promise<PollinationsGenerateResult> {
  const { prompt, seed, width, height } = input;
  const optimized = optimizeImagePrompt(prompt);
  const requestUrl = buildPollinationsUrl(optimized.prompt, seed, width, height);

  console.log(
    "[VisionTale] Pollinations image request",
    JSON.stringify({
      requestId,
      model: POLLINATIONS_IMAGE_MODEL,
      requestUrl,
      seed,
      width,
      height,
      originalPromptLength: optimized.originalLength,
      optimizedPromptLength: optimized.optimizedLength,
      optimizedPrompt: optimized.prompt,
      truncated: optimized.truncated,
      timeoutMs: IMAGE_FETCH_TIMEOUT_MS,
    }),
  );

  try {
    const { buffer, contentType } = await fetchWithTimeout(requestUrl, IMAGE_FETCH_TIMEOUT_MS);
    const base64Data = buffer.toString("base64");
    const url = `data:${contentType};base64,${base64Data}`;

    console.log(
      "[VisionTale] Pollinations image success",
      JSON.stringify({
        requestId,
        model: POLLINATIONS_IMAGE_MODEL,
        contentType,
        bytes: buffer.length,
        optimizedPromptLength: optimized.optimizedLength,
      }),
    );

    return {
      url,
      base64Data,
      contentType,
      model: POLLINATIONS_IMAGE_MODEL,
      isPlaceholder: false,
      optimizedPrompt: optimized.prompt,
      requestUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[VisionTale] Pollinations image failed — using placeholder",
      JSON.stringify({
        requestId,
        model: POLLINATIONS_IMAGE_MODEL,
        requestUrl,
        error: message,
      }),
    );

    const placeholderUrl = buildPlaceholderDataUrl(width, height, `Scene ${seed}`);
    const base64Part = placeholderUrl.split(",")[1] ?? "";

    return {
      url: placeholderUrl,
      base64Data: base64Part,
      contentType: "image/svg+xml",
      model: POLLINATIONS_IMAGE_MODEL,
      isPlaceholder: true,
      optimizedPrompt: optimized.prompt,
      requestUrl,
    };
  }
}
