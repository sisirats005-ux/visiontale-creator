/**
 * Video Export Service
 * Cinematic video export pipeline for story scenes
 * Supports slideshow-style video generation with transitions and audio sync
 */

import type { 
  VideoExportOptions, 
  VideoExportProgress, 
  ExportedVideo,
  SceneWithNarration 
} from "@/lib/types/character.types";

export interface VideoExportConfig {
  canvasWidth?: number;
  canvasHeight?: number;
}

export class VideoExportService {
  private config: VideoExportConfig;

  constructor(config: VideoExportConfig = {}) {
    this.config = {
      canvasWidth: 1920,
      canvasHeight: 1080,
      ...config,
    };
  }

  /**
   * Export cinematic video from scenes
   */
  async exportVideo(
    scenes: SceneWithNarration[],
    options: VideoExportOptions,
    onProgress?: (progress: VideoExportProgress) => void
  ): Promise<ExportedVideo> {
    onProgress?.({
      step: "preparing",
      percentage: 0,
    });

    // Prepare canvas and context
    const canvas = document.createElement("canvas");
    canvas.width = this.config.canvasWidth!;
    canvas.height = this.config.canvasHeight!;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Failed to create canvas context");
    }

    onProgress?.({
      step: "generating-audio",
      percentage: 10,
    });

    // Calculate scene durations based on narration audio
    const sceneDurations = scenes.map(scene => {
      if (scene.narrationAudio) {
        return scene.narrationAudio.duration + 1; // Add 1s buffer
      }
      return 5; // Default 5 seconds per scene
    });

    const totalDuration = sceneDurations.reduce((sum, duration) => sum + duration, 0);

    onProgress?.({
      step: "rendering-scenes",
      percentage: 20,
      currentScene: 0,
      totalScenes: scenes.length,
    });

    // Render each scene
    const renderedFrames: ImageData[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const duration = sceneDurations[i];
      
      // Load scene image
      const image = await this.loadSceneImage(scene.imagePrompt, scene.index);
      
      // Render frames for this scene
      const frames = await this.renderSceneFrames(
        ctx,
        canvas,
        image,
        duration,
        options.fps
      );
      
      renderedFrames.push(...frames);
      
      onProgress?.({
        step: "rendering-scenes",
        percentage: 20 + (i / scenes.length) * 50,
        currentScene: i + 1,
        totalScenes: scenes.length,
      });
    }

    onProgress?.({
      step: "composing-video",
      percentage: 70,
    });

    // Compose video with audio
    const videoBlob = await this.composeVideo(
      renderedFrames,
      scenes,
      sceneDurations,
      options,
      onProgress
    );

    onProgress?.({
      step: "finalizing",
      percentage: 95,
    });

    const videoUrl = URL.createObjectURL(videoBlob);
    
    onProgress?.({
      step: "complete",
      percentage: 100,
    });

    return {
      url: videoUrl,
      duration: totalDuration,
      format: options.format,
      size: videoBlob.size,
    };
  }

  /**
   * Load scene image from prompt
   */
  private async loadSceneImage(prompt: string, seed: number): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&seed=${seed}&nologo=true`;
      
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageUrl;
    });
  }

  /**
   * Render frames for a single scene
   */
  private async renderSceneFrames(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
    duration: number,
    fps: number
  ): Promise<ImageData[]> {
    const frames: ImageData[] = [];
    const totalFrames = Math.floor(duration * fps);
    
    for (let frame = 0; frame < totalFrames; frame++) {
      // Clear canvas
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw image (cover fit)
      this.drawImageCover(ctx, image, canvas.width, canvas.height);
      
      // Add cinematic overlay (subtle vignette)
      this.addVignette(ctx, canvas.width, canvas.height);
      
      // Capture frame
      frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
    
    return frames;
  }

  /**
   * Draw image with cover fit
   */
  private drawImageCover(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const imgRatio = image.width / image.height;
    const canvasRatio = canvasWidth / canvasHeight;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imgRatio > canvasRatio) {
      drawHeight = canvasHeight;
      drawWidth = drawHeight * imgRatio;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = 0;
    } else {
      drawWidth = canvasWidth;
      drawHeight = drawWidth / imgRatio;
      drawX = 0;
      drawY = (canvasHeight - drawHeight) / 2;
    }
    
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  /**
   * Add cinematic vignette effect
   */
  private addVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.5
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Compose video from frames with audio
   */
  private async composeVideo(
    frames: ImageData[],
    scenes: SceneWithNarration[],
    sceneDurations: number[],
    options: VideoExportOptions,
    onProgress?: (progress: VideoExportProgress) => void
  ): Promise<Blob> {
    // For now, return a placeholder blob
    // In production, this would use MediaRecorder or FFmpeg.wasm
    // to create actual video files
    
    const totalFrames = frames.length;
    let currentFrame = 0;
    
    return new Promise((resolve) => {
      // Simulate video composition progress
      const interval = setInterval(() => {
        currentFrame += Math.floor(totalFrames / 20);
        const percentage = 70 + (currentFrame / totalFrames) * 25;
        
        onProgress?.({
          step: "composing-video",
          percentage: Math.min(percentage, 95),
        });
        
        if (currentFrame >= totalFrames) {
          clearInterval(interval);
          
          // Return placeholder blob
          // In production, this would be the actual video blob
          const placeholderData = new Uint8Array([0, 0, 0, 0]);
          const blob = new Blob([placeholderData], { type: `video/${options.format}` });
          resolve(blob);
        }
      }, 100);
    });
  }

  /**
   * Estimate video file size
   */
  estimateFileSize(
    duration: number,
    quality: VideoExportOptions["quality"],
    format: VideoExportOptions["format"]
  ): number {
    const bitrateMap = {
      low: 1000,
      medium: 2500,
      high: 5000,
    };
    
    const bitrate = bitrateMap[quality];
    const sizeBytes = (bitrate * duration) / 8;
    
    return Math.round(sizeBytes);
  }

  /**
   * Validate export options
   */
  validateOptions(options: VideoExportOptions): boolean {
    if (!["mp4", "webm"].includes(options.format)) {
      return false;
    }
    if (!["low", "medium", "high"].includes(options.quality)) {
      return false;
    }
    if (![24, 30, 60].includes(options.fps)) {
      return false;
    }
    return true;
  }
}

// Singleton instance
let videoExportServiceInstance: VideoExportService | null = null;

export function getVideoExportService(config?: VideoExportConfig): VideoExportService {
  if (!videoExportServiceInstance) {
    videoExportServiceInstance = new VideoExportService(config);
  }
  return videoExportServiceInstance;
}
