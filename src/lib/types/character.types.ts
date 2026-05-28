/**
 * Character Consistency System Types
 * Multi-character support: CharacterInput[] replaces CharacterInput | null
 */

export interface Character {
  id: string; // unique stable ID for React keys / edit/delete
  name: string;
  appearance: string;
  outfit?: string;
  hairstyle?: string;
  visualTraits?: string;
  role?: string; // e.g. "protagonist", "antagonist", "supporting"
}

/** Identical shape to Character — used for form input before an ID is assigned */
export interface CharacterInput {
  id: string;
  name: string;
  appearance: string;
  outfit?: string;
  hairstyle?: string;
  visualTraits?: string;
  role?: string;
}

export type CameraAngle =
  | "wide shot"
  | "medium shot"
  | "close-up"
  | "extreme close-up"
  | "over-the-shoulder"
  | "low angle"
  | "high angle"
  | "dutch angle"
  | "tracking shot"
  | "establishing shot";

export interface CinematicScene {
  index: number;
  title: string;
  description: string;
  imagePrompt: string;
  narration: string;
  cameraAngle?: CameraAngle;
  duration?: string;
}

/**
 * Narration and Video Export Types
 */

export type TTSService = "elevenlabs";

/**
 * NarrationAudio — the URL is a blob: URL created on the CLIENT side.
 * The server returns base64-encoded audio data, which the client
 * converts to a blob URL. This avoids using browser-only APIs
 * (URL.createObjectURL, new Audio) inside server functions.
 */
export interface NarrationAudio {
  url: string;       // blob: URL — created client-side from base64Data
  base64Data?: string; // raw base64 audio — present immediately after server response
  duration: number;
  service: TTSService;
}

export interface GeneratedImage {
  /**
   * Browser-loadable data URL (generated server-side from Pollinations or SVG placeholder).
   */
  url: string;
  provider: "pollinations";
  model: string;
  isPlaceholder?: boolean;
}

export interface SceneWithNarration extends CinematicScene {
  narrationAudio?: NarrationAudio;
  image?: GeneratedImage;
}

export interface NarrationGenerationOptions {
  voiceId?: string;
  model?: string;
}

export interface VideoExportOptions {
  format: "mp4" | "webm";
  quality: "low" | "medium" | "high";
  fps: 24 | 30 | 60;
  includeBackgroundMusic?: boolean;
  backgroundMusicUrl?: string;
  transitionDuration?: number;
}

export interface VideoExportProgress {
  step:
    | "preparing"
    | "generating-audio"
    | "rendering-scenes"
    | "composing-video"
    | "finalizing"
    | "complete";
  percentage: number;
  currentScene?: number;
  totalScenes?: number;
}

export interface ExportedVideo {
  url: string;
  duration: number;
  format: string;
  size: number;
}
