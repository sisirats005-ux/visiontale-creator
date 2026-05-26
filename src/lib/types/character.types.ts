/**
 * Character Consistency System Types
 * Defines the data structure for maintaining consistent character appearance
 * across all generated scenes in a story.
 */

export interface Character {
  name: string;
  appearance: string;
  outfit?: string;
  hairstyle?: string;
  visualTraits?: string;
}

export interface CharacterInput {
  name: string;
  appearance: string;
  outfit?: string;
  hairstyle?: string;
  visualTraits?: string;
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
 * Defines types for AI voice narration and cinematic video export
 */

export type TTSService = "elevenlabs" | "openai" | "playht";

export interface NarrationAudio {
  url: string;
  duration: number;
  service: TTSService;
}

export interface SceneWithNarration extends CinematicScene {
  narrationAudio?: NarrationAudio;
}

export interface NarrationGenerationOptions {
  service: TTSService;
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
  step: "preparing" | "generating-audio" | "rendering-scenes" | "composing-video" | "finalizing" | "complete";
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
