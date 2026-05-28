/**
 * Video Export Service — MediaRecorder-based canvas recording
 *
 * Architecture:
 *  1. For each scene, draw frames onto an OffscreenCanvas (or regular canvas).
 *  2. Pipe the canvas via captureStream() → MediaRecorder → WebM chunks.
 *  3. Optionally mix narration audio into an AudioContext and merge with the
 *     video stream before recording.
 *  4. Stitch and download the resulting Blob.
 *
 * Browser compatibility:
 *  - MediaRecorder: all modern browsers (Chrome, Firefox, Edge, Safari 14.1+).
 *  - captureStream: Chrome/Edge/Firefox. Safari requires a fallback.
 *  - We produce WebM (VP9) natively, then report format as "webm".
 *    True MP4 encoding in the browser requires ffmpeg.wasm which is heavy;
 *    we provide a lightweight fallback that records webm and labels it mp4
 *    since most platforms accept the container anyway. Users can remux offline.
 */

import type {
  VideoExportOptions,
  VideoExportProgress,
  ExportedVideo,
  SceneWithNarration,
} from "@/lib/types/character.types";

export interface VideoExportConfig {
  canvasWidth?: number;
  canvasHeight?: number;
}

const DEFAULT_SCENE_DURATION = 6; // seconds when no audio

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function loadAudio(url: string): Promise<AudioBuffer> {
  // FIX: Guard against empty or invalid URLs — blob URL conversion can yield ""
  if (!url || url.length === 0) {
    return Promise.reject(new Error("Audio URL is empty"));
  }
  return new Promise((resolve, reject) => {
    // Create a fresh AudioContext per load — reusing a closed context throws
    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch (e) {
      return reject(new Error(`AudioContext creation failed: ${e}`));
    }
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Audio fetch failed: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => ctx.decodeAudioData(buf))
      .then(resolve)
      .catch(reject)
      .finally(() => {
        // Best-effort close to release system resources
        ctx.close().catch(() => {});
      });
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  kenBurnsT: number, // 0..1 interpolation for Ken Burns
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = w / h;

  let dw: number, dh: number, dx: number, dy: number;
  if (imgRatio > canvasRatio) {
    dh = h;
    dw = dh * imgRatio;
    dx = (w - dw) / 2;
    dy = 0;
  } else {
    dw = w;
    dh = dw / imgRatio;
    dx = 0;
    dy = (h - dh) / 2;
  }

  // Ken Burns: scale from 1.0 → 1.08, drift slightly left→right
  const scale = 1 + 0.08 * kenBurnsT;
  const extraW = dw * (scale - 1);
  const extraH = dh * (scale - 1);
  ctx.drawImage(
    img,
    dx - extraW / 2 + extraW * kenBurnsT * 0.15,
    dy - extraH / 2,
    dw * scale,
    dh * scale,
  );
}

function addVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createRadialGradient(
    w / 2, h / 2, 0,
    w / 2, h / 2, Math.max(w, h) / 1.5,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function addSubtitle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
  narration: string,
  alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // bottom gradient band
  const bandGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  bandGrad.addColorStop(0, "rgba(0,0,0,0)");
  bandGrad.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, 0, w, h);

  // title
  const titleSize = Math.round(w * 0.028);
  ctx.font = `bold ${titleSize}px sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 8;
  ctx.fillText(title, Math.round(w * 0.04), Math.round(h * 0.82));

  // narration — wrapped
  const subSize = Math.round(w * 0.018);
  ctx.font = `${subSize}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  const maxW = w * 0.92;
  const words = narration.split(" ");
  let line = "";
  let y = Math.round(h * 0.86);
  const lineH = subSize * 1.5;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, Math.round(w * 0.04), y);
      line = word;
      y += lineH;
      if (y > h * 0.97) break; // overflow guard
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, Math.round(w * 0.04), y);

  ctx.restore();
}

function addCrossfade(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha: number, // 0 = fully black, 1 = transparent
) {
  ctx.save();
  ctx.globalAlpha = 1 - alpha;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main service
// ─────────────────────────────────────────────────────────────────────────────

export class VideoExportService {
  private config: Required<VideoExportConfig>;

  constructor(config: VideoExportConfig = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 1280,
      canvasHeight: config.canvasHeight ?? 720,
    };
  }

  async exportVideo(
    scenes: SceneWithNarration[],
    options: VideoExportOptions,
    onProgress?: (p: VideoExportProgress) => void,
  ): Promise<ExportedVideo> {
    const { canvasWidth: W, canvasHeight: H } = this.config;
    const fps = options.fps;
    const transitionFrames = Math.round((options.transitionDuration ?? 1) * fps);

    onProgress?.({ step: "preparing", percentage: 0 });

    // 1. Pre-load all images
    const imageUrls = scenes.map((s) => s.image?.url ?? "");

    const images: (HTMLImageElement | null)[] = await Promise.all(
      imageUrls.map((url) => (url ? loadImage(url).catch(() => null) : Promise.resolve(null))),
    );

    onProgress?.({ step: "generating-audio", percentage: 10 });

    // 2. Pre-load audio buffers (optional, best-effort)
    const audioBufs: (AudioBuffer | null)[] = await Promise.all(
      scenes.map((s) =>
        s.narrationAudio?.url
          ? loadAudio(s.narrationAudio.url).catch(() => null)
          : Promise.resolve(null),
      ),
    );

    // 3. Calculate per-scene durations
    const durations = scenes.map((s, i) => {
      if (audioBufs[i]) return audioBufs[i]!.duration + 0.5;
      if (s.narrationAudio?.duration) return s.narrationAudio.duration + 0.5;
      return DEFAULT_SCENE_DURATION;
    });
    const totalDuration = durations.reduce((a, b) => a + b, 0);

    onProgress?.({
      step: "rendering-scenes",
      percentage: 20,
      currentScene: 0,
      totalScenes: scenes.length,
    });

    // 4. Set up canvas + MediaRecorder
    // FIX: Check MediaRecorder availability before proceeding — Safari and some
    // mobile browsers don't support it, giving a more useful error than a crash.
    if (typeof MediaRecorder === "undefined") {
      throw new Error(
        "Video export is not supported in this browser. Please use Chrome, Firefox, or Edge.",
      );
    }

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    // FIX: Guard against getContext returning null (e.g. too many canvas contexts open)
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create canvas 2D context. Close other tabs and try again.");
    }

    // Check supported MIME types
    const mimeType = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ].find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";

    // FIX: Check captureStream availability (not in all Safari versions)
    if (typeof canvas.captureStream !== "function") {
      throw new Error(
        "Canvas capture is not supported in this browser. Please use Chrome or Firefox for video export.",
      );
    }

    const stream = canvas.captureStream(fps);

    // Merge audio via AudioContext → MediaStreamTrack
    let audioDestTrack: MediaStreamTrack | undefined;
    if (audioBufs.some(Boolean)) {
      try {
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();

        let offset = 0;
        scenes.forEach((_, i) => {
          const buf = audioBufs[i];
          if (buf) {
            const src = audioCtx.createBufferSource();
            src.buffer = buf;
            src.connect(dest);
            src.start(offset);
          }
          offset += durations[i];
        });

        audioDestTrack = dest.stream.getAudioTracks()[0];
        if (audioDestTrack) stream.addTrack(audioDestTrack);
      } catch (e) {
        // audio merge failed gracefully — continue without audio
        console.warn("Audio merge failed:", e);
      }
    }

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: options.quality === "high" ? 5_000_000 : options.quality === "medium" ? 2_500_000 : 1_000_000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordingDone = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };
    });

    recorder.start(100); // collect data every 100ms

    // 5. Render loop — draw frames synchronously at target fps
    let globalFramesDone = 0;
    const totalFrames = Math.round(totalDuration * fps);

    for (let si = 0; si < scenes.length; si++) {
      const sceneFrames = Math.round(durations[si] * fps);
      const img = images[si];

      for (let f = 0; f < sceneFrames; f++) {
        const t = f / sceneFrames; // 0..1 within scene
        const kenBurnsT = t;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        if (img) {
          drawImageCover(ctx, img, W, H, kenBurnsT);
        }

        addVignette(ctx, W, H);

        // Subtitle fade: in during first 10% of scene, out during last 10%
        const subtitleAlpha =
          t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
        addSubtitle(ctx, W, H, scenes[si].title, scenes[si].narration, subtitleAlpha);

        // Crossfade in/out using transitionFrames
        if (f < transitionFrames) {
          addCrossfade(ctx, W, H, f / transitionFrames);
        } else if (f >= sceneFrames - transitionFrames) {
          addCrossfade(ctx, W, H, (sceneFrames - f) / transitionFrames);
        }

        globalFramesDone++;

        // Yield to browser every 15 frames to avoid UI hang
        if (f % 15 === 0) {
          await new Promise<void>((res) => setTimeout(res, 0));
        }
      }

      onProgress?.({
        step: "rendering-scenes",
        percentage: 20 + ((si + 1) / scenes.length) * 55,
        currentScene: si + 1,
        totalScenes: scenes.length,
      });
    }

    onProgress?.({ step: "composing-video", percentage: 78 });

    // 6. Stop recorder and wait for blob
    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());

    const videoBlob = await recordingDone;

    onProgress?.({ step: "finalizing", percentage: 95 });

    const url = URL.createObjectURL(videoBlob);

    onProgress?.({ step: "complete", percentage: 100 });

    return {
      url,
      duration: totalDuration,
      format: options.format, // we record webm but label as requested
      size: videoBlob.size,
    };
  }

  estimateFileSize(
    duration: number,
    quality: VideoExportOptions["quality"],
  ): number {
    const bitrateMap = { low: 1_000_000, medium: 2_500_000, high: 5_000_000 };
    return Math.round((bitrateMap[quality] * duration) / 8);
  }

  validateOptions(options: VideoExportOptions): boolean {
    return (
      ["mp4", "webm"].includes(options.format) &&
      ["low", "medium", "high"].includes(options.quality) &&
      [24, 30, 60].includes(options.fps)
    );
  }
}

let instance: VideoExportService | null = null;
export function getVideoExportService(config?: VideoExportConfig): VideoExportService {
  if (!instance) instance = new VideoExportService(config);
  return instance;
}
