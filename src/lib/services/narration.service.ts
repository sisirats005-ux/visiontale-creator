/**
 * Narration Service — Server-safe TTS
 *
 * BUG FIXES vs original:
 * 1. Removed URL.createObjectURL() — browser-only API that crashes in server functions.
 *    Instead we return base64-encoded audio data and a duration estimate.
 *    The client converts base64 → blob URL after receiving the server response.
 * 2. Removed `new Audio()` for duration detection — also browser-only.
 *    We now estimate duration from text length (roughly 3 chars/s for narration).
 * 3. Added proper error messages for each TTS provider.
 */

import type { TTSService, NarrationAudio, NarrationGenerationOptions } from "@/lib/types/character.types";

export interface NarrationServiceConfig {
  elevenLabsApiKey?: string;
  openaiApiKey?: string;
  playhtApiKey?: string;
}

/** Rough TTS duration estimate: ~150 words/min, ~5 chars/word */
function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2, Math.round((words / 150) * 60));
}

/** Convert ArrayBuffer to base64 string — works in both Node and browser */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class NarrationService {
  private config: NarrationServiceConfig;

  constructor(config: NarrationServiceConfig = {}) {
    this.config = config;
  }

  async generateNarration(
    text: string,
    options: NarrationGenerationOptions
  ): Promise<NarrationAudio> {
    switch (options.service) {
      case "elevenlabs":
        return this.generateWithElevenLabs(text, options);
      case "openai":
        return this.generateWithOpenAI(text, options);
      case "playht":
        return this.generateWithPlayHT(text, options);
      default:
        throw new Error(`Unsupported TTS service: ${options.service}`);
    }
  }

  async generateNarrations(
    texts: string[],
    options: NarrationGenerationOptions,
    onProgress?: (current: number, total: number) => void
  ): Promise<NarrationAudio[]> {
    const results: NarrationAudio[] = [];
    for (let i = 0; i < texts.length; i++) {
      const audio = await this.generateNarration(texts[i], options);
      results.push(audio);
      onProgress?.(i + 1, texts.length);
    }
    return results;
  }

  private async generateWithElevenLabs(
    text: string,
    options: NarrationGenerationOptions
  ): Promise<NarrationAudio> {
    const apiKey = this.config.elevenLabsApiKey ?? process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ElevenLabs API key is not configured.");

    const voiceId = options.voiceId ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel — default free voice
    const model = options.model ?? "eleven_multilingual_v2";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
        body: JSON.stringify({ text, model_id: model, output_format: "mp3_44100_128" }),
      }
    );

    if (!response.ok) {
      const err = await response.text().catch(() => response.status.toString());
      throw new Error(`ElevenLabs API error ${response.status}: ${err}`);
    }

    const buffer = await response.arrayBuffer();
    const base64Data = arrayBufferToBase64(buffer);
    const duration = estimateDuration(text);

    // url is intentionally empty here — the client will create a blob URL from base64Data
    return { url: "", base64Data, duration, service: "elevenlabs" };
  }

  private async generateWithOpenAI(
    text: string,
    options: NarrationGenerationOptions
  ): Promise<NarrationAudio> {
    const apiKey = this.config.openaiApiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI API key is not configured.");

    const voice = options.voiceId ?? "alloy";
    const model = options.model ?? "tts-1";

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: text, voice, response_format: "mp3" }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => response.status.toString());
      throw new Error(`OpenAI TTS API error ${response.status}: ${err}`);
    }

    const buffer = await response.arrayBuffer();
    const base64Data = arrayBufferToBase64(buffer);
    const duration = estimateDuration(text);

    return { url: "", base64Data, duration, service: "openai" };
  }

  private async generateWithPlayHT(
    text: string,
    options: NarrationGenerationOptions
  ): Promise<NarrationAudio> {
    const apiKey = this.config.playhtApiKey ?? process.env.PLAYHT_API_KEY;
    if (!apiKey) throw new Error("PlayHT API key is not configured.");

    const voiceId = options.voiceId ?? "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json";

    const response = await fetch("https://api.play.ht/api/v2/tts/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-User-Id": process.env.PLAYHT_USER_ID ?? "",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, voice: voiceId, output_format: "mp3" }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => response.status.toString());
      throw new Error(`PlayHT API error ${response.status}: ${err}`);
    }

    const buffer = await response.arrayBuffer();
    const base64Data = arrayBufferToBase64(buffer);
    const duration = estimateDuration(text);

    return { url: "", base64Data, duration, service: "playht" };
  }

  isServiceAvailable(service: TTSService): boolean {
    switch (service) {
      case "elevenlabs":
        return !!(this.config.elevenLabsApiKey ?? process.env.ELEVENLABS_API_KEY);
      case "openai":
        return !!(this.config.openaiApiKey ?? process.env.OPENAI_API_KEY);
      case "playht":
        return !!(this.config.playhtApiKey ?? process.env.PLAYHT_API_KEY);
      default:
        return false;
    }
  }

  getAvailableServices(): TTSService[] {
    const services: TTSService[] = [];
    if (this.isServiceAvailable("elevenlabs")) services.push("elevenlabs");
    if (this.isServiceAvailable("openai")) services.push("openai");
    if (this.isServiceAvailable("playht")) services.push("playht");
    return services;
  }
}

let narrationServiceInstance: NarrationService | null = null;

export function getNarrationService(config?: NarrationServiceConfig): NarrationService {
  if (!narrationServiceInstance) {
    narrationServiceInstance = new NarrationService(config);
  }
  return narrationServiceInstance;
}
