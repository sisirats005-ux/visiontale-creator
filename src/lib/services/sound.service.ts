/**
 * Sound Management Service
 * Architecture for ambient background music, scene mood sounds, and cinematic audio
 * Designed for future integration with audio libraries
 */

export type SoundType = "ambient" | "mood" | "transition" | "sfx";
export type MoodType = "suspense" | "fantasy" | "scifi" | "horror" | "dramatic" | "peaceful";

export interface SoundTrack {
  id: string;
  type: SoundType;
  mood?: MoodType;
  url: string;
  volume: number;
  loop: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

export interface SoundConfig {
  masterVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  musicVolume: number;
}

export class SoundService {
  private audioContext: AudioContext | null = null;
  private activeSounds: Map<string, HTMLAudioElement> = new Map();
  private config: SoundConfig = {
    masterVolume: 0.7,
    ambientVolume: 0.5,
    sfxVolume: 0.8,
    musicVolume: 0.6,
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /**
   * Play a sound track
   */
  async playSound(track: SoundTrack): Promise<void> {
    try {
      const audio = new Audio(track.url);
      audio.volume = this.calculateVolume(track);
      audio.loop = track.loop;

      if (track.fadeIn) {
        audio.volume = 0;
        this.fadeIn(audio, track.fadeIn, this.calculateVolume(track));
      }

      await audio.play();
      this.activeSounds.set(track.id, audio);
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  }

  /**
   * Stop a sound track
   */
  stopSound(trackId: string, fadeOutDuration?: number): void {
    const audio = this.activeSounds.get(trackId);
    if (audio) {
      if (fadeOutDuration) {
        this.fadeOut(audio, fadeOutDuration, () => {
          audio.pause();
          this.activeSounds.delete(trackId);
        });
      } else {
        audio.pause();
        this.activeSounds.delete(trackId);
      }
    }
  }

  /**
   * Stop all sounds
   */
  stopAllSounds(fadeOutDuration?: number): void {
    this.activeSounds.forEach((audio, trackId) => {
      this.stopSound(trackId, fadeOutDuration);
    });
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Set category volume
   */
  setCategoryVolume(category: keyof SoundConfig, volume: number): void {
    if (category in this.config) {
      this.config[category] = Math.max(0, Math.min(1, volume));
      this.updateAllVolumes();
    }
  }

  /**
   * Get current config
   */
  getConfig(): SoundConfig {
    return { ...this.config };
  }

  /**
   * Calculate volume for a track based on type and config
   */
  private calculateVolume(track: SoundTrack): number {
    const baseVolume = track.volume;
    const categoryVolume = this.getCategoryVolume(track.type);
    return baseVolume * categoryVolume * this.config.masterVolume;
  }

  /**
   * Get category volume from config
   */
  private getCategoryVolume(type: SoundType): number {
    switch (type) {
      case "ambient":
        return this.config.ambientVolume;
      case "sfx":
        return this.config.sfxVolume;
      case "mood":
      case "transition":
        return this.config.musicVolume;
      default:
        return 1;
    }
  }

  /**
   * Update all active sound volumes
   */
  private updateAllVolumes(): void {
    this.activeSounds.forEach((audio, trackId) => {
      const track = this.getTrackById(trackId);
      if (track) {
        audio.volume = this.calculateVolume(track);
      }
    });
  }

  /**
   * Fade in audio
   */
  private fadeIn(audio: HTMLAudioElement, duration: number, targetVolume: number): void {
    const startTime = performance.now();
    const startVolume = audio.volume;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      audio.volume = startVolume + (targetVolume - startVolume) * progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Fade out audio
   */
  private fadeOut(audio: HTMLAudioElement, duration: number, callback?: () => void): void {
    const startTime = performance.now();
    const startVolume = audio.volume;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      audio.volume = startVolume * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        callback?.();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Get track by ID (placeholder for track storage)
   */
  private getTrackById(trackId: string): SoundTrack | undefined {
    // In production, this would retrieve from a track store
    return undefined;
  }

  /**
   * Crossfade between two tracks
   */
  async crossfade(
    fromTrackId: string,
    toTrack: SoundTrack,
    duration: number = 2000
  ): Promise<void> {
    const fromAudio = this.activeSounds.get(fromTrackId);
    
    if (fromAudio) {
      this.fadeOut(fromAudio, duration, () => {
        fromAudio.pause();
        this.activeSounds.delete(fromTrackId);
      });
    }

    await this.playSound({ ...toTrack, fadeIn: duration });
  }

  /**
   * Check if audio context is ready
   */
  isReady(): boolean {
    return this.audioContext?.state === "running";
  }
}

// Singleton instance
let soundServiceInstance: SoundService | null = null;

export function getSoundService(): SoundService {
  if (!soundServiceInstance) {
    soundServiceInstance = new SoundService();
  }
  return soundServiceInstance;
}
