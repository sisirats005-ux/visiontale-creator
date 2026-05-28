import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Film,
  CheckCircle,
  Loader2,
  Settings,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { NeonButton } from "./NeonButton";
import type {
  VideoExportOptions,
  VideoExportProgress,
  ExportedVideo,
  SceneWithNarration,
} from "@/lib/types/character.types";

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: SceneWithNarration[];
  onExport: (
    options: VideoExportOptions,
    onProgress?: (progress: VideoExportProgress) => void,
  ) => Promise<ExportedVideo>;
}

const STEP_LABELS: Record<VideoExportProgress["step"], string> = {
  preparing: "Preparing pipeline",
  "generating-audio": "Loading narration audio",
  "rendering-scenes": "Rendering scene frames",
  "composing-video": "Composing video stream",
  finalizing: "Finalizing export",
  complete: "Export complete",
};

const STEP_ORDER: VideoExportProgress["step"][] = [
  "preparing",
  "generating-audio",
  "rendering-scenes",
  "composing-video",
  "finalizing",
  "complete",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function VideoExportModal({
  isOpen,
  onClose,
  scenes,
  onExport,
}: VideoExportModalProps) {
  const [options, setOptions] = useState<VideoExportOptions>({
    format: "webm",
    quality: "medium",
    fps: 24,
    includeBackgroundMusic: false,
    transitionDuration: 1,
  });
  const [phase, setPhase] = useState<"config" | "exporting" | "done" | "error">(
    "config",
  );
  const [progress, setProgress] = useState<VideoExportProgress | null>(null);
  const [exportedVideo, setExportedVideo] = useState<ExportedVideo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const abortRef = useRef(false);

  // FIX: Reset state both when modal opens AND when it closes.
  // Previously only closing reset state, so re-opening the modal after a failed/completed
  // export would show stale "done" or "error" UI before the user starts a new export.
  useEffect(() => {
    setPhase("config");
    setProgress(null);
    setExportedVideo(null);
    setErrorMsg(null);
    setShowAdvanced(false);
    abortRef.current = false;
  }, [isOpen]);

  const handleExport = async () => {
    abortRef.current = false;
    setPhase("exporting");
    setErrorMsg(null);
    setProgress({ step: "preparing", percentage: 0 });

    try {
      const video = await onExport(options, (prog) => {
        if (abortRef.current) return;
        setProgress(prog);
      });
      if (!abortRef.current) {
        setExportedVideo(video);
        setPhase("done");
      }
    } catch (err: unknown) {
      if (!abortRef.current) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setErrorMsg(msg);
        setPhase("error");
      }
    }
  };

  const handleDownload = () => {
    if (!exportedVideo) return;
    const a = document.createElement("a");
    a.href = exportedVideo.url;
    a.download = `visiontale-story.${exportedVideo.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAbort = () => {
    abortRef.current = true;
    setPhase("config");
    setProgress(null);
  };

  const stepIdx = progress ? STEP_ORDER.indexOf(progress.step) : -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard variant="neon" className="p-6 space-y-5">
              {/* ── Header ── */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg glass-neon flex items-center justify-center neon-glow">
                    <Film className="h-5 w-5 text-[oklch(0.85_0.15_220)]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Export Cinematic Video
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {scenes.length} scenes ·{" "}
                      {phase === "done"
                        ? "Ready to download"
                        : "Canvas + MediaRecorder"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={phase === "exporting"}
                  className="p-2 rounded-lg hover:bg-[oklch(0.22_0.035_260/0.6)] transition-colors disabled:opacity-40"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* ── Config ── */}
              {phase === "config" && (
                <div className="space-y-4">
                  {/* Quality quick-select */}
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-2">
                      Quality
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["low", "medium", "high"] as const).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setOptions((o) => ({ ...o, quality: q }))}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            options.quality === q
                              ? "border-[oklch(0.78_0.18_230/0.6)] bg-[oklch(0.78_0.18_230/0.15)]"
                              : "border-white/10 bg-[oklch(0.22_0.035_260/0.4)] hover:border-[oklch(0.78_0.18_230/0.3)]"
                          }`}
                        >
                          <div className="text-xs font-mono text-[oklch(0.85_0.15_220)] mb-0.5 uppercase">
                            {q}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {q === "low"
                              ? "Fast · 1 Mbps"
                              : q === "medium"
                                ? "Balanced · 2.5 Mbps"
                                : "Best · 5 Mbps"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex items-center gap-2 text-xs font-mono text-[oklch(0.85_0.15_220)] hover:text-[oklch(0.78_0.18_230)] transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    {showAdvanced ? "Hide" : "Show"} advanced settings
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 border-t border-white/10 pt-3 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-1.5">
                              Frame Rate
                            </label>
                            <select
                              value={options.fps}
                              onChange={(e) =>
                                setOptions((o) => ({
                                  ...o,
                                  fps: parseInt(e.target.value) as 24 | 30 | 60,
                                }))
                              }
                              className="w-full rounded-lg bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] transition-all"
                            >
                              <option value="24">24 FPS — Cinematic</option>
                              <option value="30">30 FPS — Standard</option>
                              <option value="60">60 FPS — Smooth</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-1.5">
                              Transition
                            </label>
                            <select
                              value={options.transitionDuration}
                              onChange={(e) =>
                                setOptions((o) => ({
                                  ...o,
                                  transitionDuration: parseFloat(e.target.value),
                                }))
                              }
                              className="w-full rounded-lg bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] transition-all"
                            >
                              <option value="0.5">0.5s — Quick</option>
                              <option value="1">1s — Normal</option>
                              <option value="1.5">1.5s — Slow</option>
                              <option value="2">2s — Cinematic</option>
                            </select>
                          </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground font-mono leading-relaxed bg-[oklch(0.16_0.03_260/0.5)] rounded-lg px-3 py-2 border border-white/5">
                          ⚠ Export renders each frame to a canvas in real-time.
                          A 5-scene story at 24fps takes ~30–60s. Output is WebM
                          (VP9) — universally playable; rename to .mp4 if needed.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <NeonButton onClick={handleExport} className="w-full">
                    <Film className="h-4 w-4" />
                    Start Export
                  </NeonButton>
                </div>
              )}

              {/* ── Exporting ── */}
              {phase === "exporting" && progress && (
                <div className="space-y-4">
                  {/* Step breadcrumb */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {STEP_ORDER.filter((s) => s !== "complete").map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5 flex-shrink-0">
                        <div
                          className={`text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded transition-all ${
                            i < stepIdx
                              ? "text-[oklch(0.7_0.2_150)] bg-[oklch(0.7_0.2_150/0.15)]"
                              : i === stepIdx
                                ? "text-[oklch(0.85_0.15_220)] bg-[oklch(0.78_0.18_230/0.2)]"
                                : "text-muted-foreground/50"
                          }`}
                        >
                          {s.replace("-", " ")}
                        </div>
                        {i < STEP_ORDER.length - 2 && (
                          <span className="text-white/20 text-xs">›</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Main progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[oklch(0.85_0.15_220)]">
                        {STEP_LABELS[progress.step]}
                      </span>
                      <span className="font-mono text-muted-foreground tabular-nums">
                        {Math.round(progress.percentage)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[oklch(0.22_0.035_260/0.6)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[oklch(0.78_0.18_230)] to-[oklch(0.85_0.15_220)] rounded-full"
                        animate={{ width: `${progress.percentage}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    {progress.currentScene !== undefined &&
                      progress.totalScenes !== undefined && (
                        <p className="text-[10px] font-mono text-muted-foreground text-center">
                          Scene {progress.currentScene} / {progress.totalScenes}
                        </p>
                      )}
                  </div>

                  {/* Spinner + message */}
                  <div className="flex items-center gap-3 py-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-6 w-6 text-[oklch(0.85_0.15_220)]" />
                    </motion.div>
                    <span className="text-sm text-muted-foreground font-mono">
                      Rendering frames to canvas…
                    </span>
                  </div>

                  {/* Cancel */}
                  <button
                    type="button"
                    onClick={handleAbort}
                    className="w-full text-xs font-mono text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* ── Done ── */}
              {phase === "done" && exportedVideo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-4 py-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", bounce: 0.5 }}
                    >
                      <CheckCircle className="h-12 w-12 text-[oklch(0.7_0.2_150)]" />
                    </motion.div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        Export Complete!
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatDuration(exportedVideo.duration)} ·{" "}
                        {exportedVideo.format.toUpperCase()} ·{" "}
                        {formatBytes(exportedVideo.size)}
                      </p>
                    </div>
                  </div>

                  {/* Video preview (if small enough to be safe) */}
                  {exportedVideo.size < 50 * 1024 * 1024 && (
                    <video
                      src={exportedVideo.url}
                      controls
                      className="w-full rounded-lg border border-white/10 max-h-48 bg-black"
                    />
                  )}

                  <div className="flex gap-3">
                    <NeonButton onClick={handleDownload} className="flex-1">
                      <Download className="h-4 w-4" />
                      Download
                    </NeonButton>
                    <button
                      type="button"
                      onClick={() => {
                        setPhase("config");
                        setExportedVideo(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-sm text-muted-foreground hover:text-foreground hover:border-white/30 transition-all"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Export Again
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Error ── */}
              {phase === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/25">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-300">
                        Export failed
                      </p>
                      <p className="text-xs text-red-400/80 font-mono mt-1">
                        {errorMsg ?? "An unknown error occurred."}
                      </p>
                    </div>
                  </div>
                  <NeonButton
                    onClick={() => setPhase("config")}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </NeonButton>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
