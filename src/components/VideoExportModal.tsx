import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Film, CheckCircle, Loader2, Settings, Cpu, Zap } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { NeonButton } from "./NeonButton";
import type { 
  VideoExportOptions, 
  VideoExportProgress, 
  ExportedVideo,
  SceneWithNarration 
} from "@/lib/types/character.types";
import { cinematicFadeIn, glowPulse } from "@/lib/utils/transitions";

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: SceneWithNarration[];
  onExport: (options: VideoExportOptions, onProgress?: (progress: VideoExportProgress) => void) => Promise<ExportedVideo>;
}

const stepLabels: Record<VideoExportProgress["step"], string> = {
  "preparing": "Preparing export",
  "generating-audio": "Generating narration audio",
  "rendering-scenes": "Rendering scene frames",
  "composing-video": "Composing video",
  "finalizing": "Finalizing export",
  "complete": "Export complete",
};

export function VideoExportModal({ 
  isOpen, 
  onClose, 
  scenes, 
  onExport 
}: VideoExportModalProps) {
  const [options, setOptions] = useState<VideoExportOptions>({
    format: "mp4",
    quality: "medium",
    fps: 30,
    includeBackgroundMusic: false,
    transitionDuration: 1,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<VideoExportProgress | null>(null);
  const [exportedVideo, setExportedVideo] = useState<ExportedVideo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setIsExporting(false);
      setProgress(null);
      setExportedVideo(null);
      setShowSettings(false);
      setConsoleLogs([]);
    }
  }, [isOpen]);

  // Add fake console logs during export
  useEffect(() => {
    if (isExporting && progress) {
      const logMessages = [
        "Initializing GPU acceleration...",
        "Loading scene textures...",
        "Compiling shaders...",
        "Allocating video buffers...",
        "Starting render pipeline...",
        "Processing scene frames...",
        "Applying cinematic filters...",
        "Encoding video stream...",
        "Finalizing output...",
      ];
      
      const interval = setInterval(() => {
        const randomLog = logMessages[Math.floor(Math.random() * logMessages.length)];
        setConsoleLogs((prev) => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${randomLog}`]);
      }, 800);

      return () => clearInterval(interval);
    }
  }, [isExporting, progress]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportedVideo(null);
    setConsoleLogs([]);

    try {
      const video = await onExport(options, (prog) => {
        setProgress(prog);
      });
      setExportedVideo(video);
    } catch (error) {
      console.error("Export failed:", error);
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportedVideo) return;
    
    const link = document.createElement("a");
    link.href = exportedVideo.url;
    link.download = `story-video.${exportedVideo.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setIsExporting(false);
    setProgress(null);
    setExportedVideo(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard variant="neon" className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg glass-neon flex items-center justify-center neon-glow">
                    <Film className="h-5 w-5 text-[oklch(0.85_0.15_220)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Export Cinematic Video</h2>
                    <p className="text-xs text-muted-foreground">
                      {scenes.length} scenes · {exportedVideo ? "Ready to download" : "Configure export settings"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[oklch(0.22_0.035_260/0.6)] transition-colors"
                  disabled={isExporting}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Export Settings */}
              {!isExporting && !exportedVideo && (
                <div className="space-y-4">
                  {/* Quick settings */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setOptions({ ...options, quality: "low" })}
                      className={`p-3 rounded-lg border transition-all ${
                        options.quality === "low"
                          ? "border-[oklch(0.78_0.18_230/0.5)] bg-[oklch(0.78_0.18_230/0.15)]"
                          : "border-white/10 bg-[oklch(0.22_0.035_260/0.4)] hover:border-[oklch(0.78_0.18_230/0.3)]"
                      }`}
                    >
                      <div className="text-xs font-mono text-[oklch(0.85_0.15_220)] mb-1">LOW</div>
                      <div className="text-[10px] text-muted-foreground">Fast export</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOptions({ ...options, quality: "medium" })}
                      className={`p-3 rounded-lg border transition-all ${
                        options.quality === "medium"
                          ? "border-[oklch(0.78_0.18_230/0.5)] bg-[oklch(0.78_0.18_230/0.15)]"
                          : "border-white/10 bg-[oklch(0.22_0.035_260/0.4)] hover:border-[oklch(0.78_0.18_230/0.3)]"
                      }`}
                    >
                      <div className="text-xs font-mono text-[oklch(0.85_0.15_220)] mb-1">MEDIUM</div>
                      <div className="text-[10px] text-muted-foreground">Balanced</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOptions({ ...options, quality: "high" })}
                      className={`p-3 rounded-lg border transition-all ${
                        options.quality === "high"
                          ? "border-[oklch(0.78_0.18_230/0.5)] bg-[oklch(0.78_0.18_230/0.15)]"
                          : "border-white/10 bg-[oklch(0.22_0.035_260/0.4)] hover:border-[oklch(0.78_0.18_230/0.3)]"
                      }`}
                    >
                      <div className="text-xs font-mono text-[oklch(0.85_0.15_220)] mb-1">HIGH</div>
                      <div className="text-[10px] text-muted-foreground">Best quality</div>
                    </button>
                  </div>

                  {/* Advanced settings toggle */}
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-2 text-xs font-mono text-[oklch(0.85_0.15_220)] hover:text-[oklch(0.78_0.18_230)] transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    {showSettings ? "Hide" : "Show"} advanced settings
                  </button>

                  {/* Advanced settings */}
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 pt-3 border-t border-white/10"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-2">
                            Format
                          </label>
                          <select
                            value={options.format}
                            onChange={(e) => setOptions({ ...options, format: e.target.value as "mp4" | "webm" })}
                            className="w-full rounded-lg bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] transition-all"
                          >
                            <option value="mp4">MP4</option>
                            <option value="webm">WebM</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-2">
                            Frame Rate
                          </label>
                          <select
                            value={options.fps}
                            onChange={(e) => setOptions({ ...options, fps: parseInt(e.target.value) as 24 | 30 | 60 })}
                            className="w-full rounded-lg bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] transition-all"
                          >
                            <option value="24">24 FPS (Cinematic)</option>
                            <option value="30">30 FPS (Standard)</option>
                            <option value="60">60 FPS (Smooth)</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Export button */}
                  <NeonButton
                    onClick={handleExport}
                    className="w-full"
                  >
                    <Download className="h-4 w-4" />
                    Export Video
                  </NeonButton>
                </div>
              )}

              {/* Export Progress */}
              {isExporting && progress && (
                <div className="space-y-4">
                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[oklch(0.85_0.15_220)]">
                        {stepLabels[progress.step]}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {Math.round(progress.percentage)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[oklch(0.22_0.035_260/0.6)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[oklch(0.78_0.18_230)] to-[oklch(0.85_0.15_220)] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percentage}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    {progress.currentScene && progress.totalScenes && (
                      <div className="text-[10px] font-mono text-muted-foreground text-center">
                        Scene {progress.currentScene} of {progress.totalScenes}
                      </div>
                    )}
                  </div>

                  {/* Fake GPU Console Logs */}
                  <motion.div
                    variants={cinematicFadeIn}
                    initial="hidden"
                    animate="visible"
                    className="bg-[oklch(0.16_0.03_260/0.8)] rounded-lg p-3 font-mono text-[10px] border border-[oklch(0.78_0.18_230/0.2)]"
                  >
                    <div className="flex items-center gap-2 mb-2 text-[oklch(0.85_0.15_220)]">
                      <Cpu className="h-3 w-3 animate-pulse" />
                      <span className="uppercase tracking-wider">Render Console</span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {consoleLogs.map((log, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-[oklch(0.72_0.03_240)]"
                        >
                          {log}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Loading animation */}
                  <div className="flex items-center justify-center py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-8 w-8 text-[oklch(0.85_0.15_220)]" />
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Export Complete */}
              {exportedVideo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-center gap-3 py-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <CheckCircle className="h-12 w-12 text-[oklch(0.7_0.2_150)]" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Export Complete!</h3>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(exportedVideo.duration)}s · {exportedVideo.format.toUpperCase()} · {(exportedVideo.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <NeonButton
                      onClick={handleDownload}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4" />
                      Download Video
                    </NeonButton>
                    <NeonButton
                      onClick={handleReset}
                      className="flex-1 bg-[oklch(0.22_0.035_260/0.6)] border border-[oklch(0.78_0.18_230/0.3)] hover:bg-[oklch(0.22_0.035_260/0.8)]"
                    >
                      Export Again
                    </NeonButton>
                  </div>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
