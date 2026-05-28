/**
 * Narration service — ElevenLabs only.
 * Returns base64 audio; client creates blob URLs for playback/export.
 */

import type { NarrationAudio, NarrationGenerationOptions } from "@/lib/types/character.types";
import {
  generateElevenLabsNarration,
  isElevenLabsConfigured,
} from "@/lib/services/elevenlabsNarration.service";

export class NarrationService {
  async generateNarration(
    text: string,
    options: NarrationGenerationOptions,
    requestId?: string,
  ): Promise<NarrationAudio> {
    const id =
      requestId ??
      `nar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    return generateElevenLabsNarration(
      {
        text,
        voiceId: options.voiceId,
        model: options.model,
      },
      id,
    );
  }

  async generateNarrations(
    texts: string[],
    options: NarrationGenerationOptions,
    onProgress?: (current: number, total: number) => void,
  ): Promise<NarrationAudio[]> {
    const results: NarrationAudio[] = [];
    for (let i = 0; i < texts.length; i++) {
      const audio = await this.generateNarration(texts[i], options);
      results.push(audio);
      onProgress?.(i + 1, texts.length);
    }
    return results;
  }

  isServiceAvailable(): boolean {
    return isElevenLabsConfigured();
  }
}

let narrationServiceInstance: NarrationService | null = null;

export function getNarrationService(): NarrationService {
  if (!narrationServiceInstance) {
    narrationServiceInstance = new NarrationService();
  }
  return narrationServiceInstance;
}
