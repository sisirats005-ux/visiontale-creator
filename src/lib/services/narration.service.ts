/**
 * Narration Service
 * Modular Text-to-Speech service supporting multiple TTS providers
 * Compatible with ElevenLabs, OpenAI TTS, and PlayHT
 */

import type { TTSService, NarrationAudio, NarrationGenerationOptions } from "@/lib/types/character.types";

export interface NarrationServiceConfig {
  elevenLabsApiKey?: string;
  openaiApiKey?: string;
  playhtApiKey?: string;
}

export class NarrationService {
  private config: NarrationServiceConfig;

  constructor(config: NarrationServiceConfig = {}) {
    this.config = config;
  }

  /**
   * Generate narration audio for a single text
   */
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

  /**
   * Generate narration for multiple scenes in parallel
   */
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

  /**
   * ElevenLabs TTS implementation
   */
  private async generateWithElevenLabs(
    text: string,
    options: NarrationGenerationOptions
  ): Promise<NarrationAudio> {
    const apiKey = this.config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error("ElevenLabs API key is required");
    }

    const voiceId = options.voiceId || "default";
    const model = options.model || "eleven_multilingual_v2";

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: model,
          output_format: "mp3_44100_128",
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const duration = await this.getAudioDuration(audioUrl);

      return {
        url: audioUrl,
        duration,
        service: "elevenlabs",
      };
    } catch (error) {
      console.error("ElevenLabs TTS error:", error);
      throw error;
    }
  }

  /**
   * OpenAI TTS implementation
   */
  private async generateWithOpenAI(
    text: string,
    options: NarrationGenerationOptions
  ): Promise<NarrationAudio> {
    const apiKey = this.config.openaiApiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }

    const voice = options.voiceId || "alloy";
    const model = options.model || "tts-1";

    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: text,
          voice,
          response_format: "mp3",
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const duration = await this.getAudioDuration(audioUrl);

      return {
        url: audioUrl,
        duration,
        service: "openai",
      };
    } catch (error) {
      console.error("OpenAI TTS error:", error);
      throw error;
    }
  }

  /**
   * PlayHT TTS implementation
   */
  private async generateWithPlayHT(
    text: string,
    options: NarrationGenerationOptions
  ): Promise<NarrationAudio> {
    const apiKey = this.config.playhtApiKey || process.env.PLAYHT_API_KEY;
    
    if (!apiKey) {
      throw new Error("PlayHT API key is required");
    }

    const voiceId = options.voiceId || "default";

    try {
      const response = await fetch("https://api.play.ht/api/v2/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text,
          voice: voiceId,
          output_format: "mp3",
        }),
      });

      if (!response.ok) {
        throw new Error(`PlayHT API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const duration = await this.getAudioDuration(audioUrl);

      return {
        url: audioUrl,
        duration,
        service: "playht",
      };
    } catch (error) {
      console.error("PlayHT TTS error:", error);
      throw error;
    }
  }

  /**
   * Get audio duration from URL
   */
  private async getAudioDuration(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => {
        resolve(audio.duration);
      });
      audio.addEventListener("error", reject);
    });
  }

  /**
   * Check if a service is available
   */
  isServiceAvailable(service: TTSService): boolean {
    switch (service) {
      case "elevenlabs":
        return !!(this.config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY);
      case "openai":
        return !!(this.config.openaiApiKey || process.env.OPENAI_API_KEY);
      case "playht":
        return !!(this.config.playhtApiKey || process.env.PLAYHT_API_KEY);
      default:
        return false;
    }
  }

  /**
   * Get available services
   */
  getAvailableServices(): TTSService[] {
    const services: TTSService[] = [];
    if (this.isServiceAvailable("elevenlabs")) services.push("elevenlabs");
    if (this.isServiceAvailable("openai")) services.push("openai");
    if (this.isServiceAvailable("playht")) services.push("playht");
    return services;
  }
}

// Singleton instance
let narrationServiceInstance: NarrationService | null = null;

export function getNarrationService(config?: NarrationServiceConfig): NarrationService {
  if (!narrationServiceInstance) {
    narrationServiceInstance = new NarrationService(config);
  }
  return narrationServiceInstance;
}
