import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  ImageOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { SceneWithNarration } from "@/lib/types/character.types";
import { TypewriterText } from "./TypewriterText";
import {
  cancelBrowserSpeechNarration,
  type BrowserSpeechHandle,
  speakWithBrowserSpeech,
} from "@/lib/services/browserSpeechNarration.service";

interface CinematicPlayerProps {
  scenes: SceneWithNarration[];
  isOpen: boolean;
  onClose: () => void;
}

/** Duration (seconds) used when no narration audio is attached to a scene. */
const DEFAULT_SCENE_DURATION = 6;

/** Duration of crossfade between scenes, in ms. */
const CROSSFADE_MS = 800;

function getImageUrl(scene: SceneWithNarration): string {
  return scene.image?.url ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: single scene layer with Ken Burns effect
// ─────────────────────────────────────────────────────────────────────────────
function SceneLayer({
  scene,
  visible,
  kenBurnsKey,
}: {
  scene: SceneWithNarration;
  visible: boolean;
  kenBurnsKey: number;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const url = getImageUrl(scene);

  // Reset on scene/image change. Scenes without an image should show the fallback
  // immediately instead of leaving the player in an infinite loading shimmer.
  useEffect(() => {
    setStatus(url ? "loading" : "error");
  }, [scene.index, url]);

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: CROSSFADE_MS / 1000, ease: "easeInOut" }}
    >
      {/* Loading shimmer */}
      {status === "loading" && (
        <div className="absolute inset-0 bg-[oklch(0.10_0.02_260)]">
          <motion.div
            className="absolute inset-0"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, oklch(0.78 0.18 230 / 0.12) 50%, transparent 100%)",
            }}
          />
        </div>
      )}

      {/* Ken Burns animated image */}
      {status !== "error" && (
        <motion.img
          key={kenBurnsKey}
          src={url || undefined}
          alt={scene.title}
          fetchPriority="high"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          /* Ken Burns: slow zoom-in from 100% → 108% over 10s */
          initial={{ scale: 1.0, x: "0%", y: "0%" }}
          animate={
            status === "loaded"
              ? {
                  scale: [1.0, 1.08],
                  x: ["0%", kenBurnsKey % 2 === 0 ? "1%" : "-1%"],
                  y: ["0%", "-1%"],
                }
              : { scale: 1.0 }
          }
          transition={{
            duration: 10,
            ease: "linear",
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className={`w-full h-full object-cover transition-opacity duration-700 ${
            status === "loading" ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {/* Error fallback */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[oklch(0.12_0.02_260)]">
          <ImageOff className="h-12 w-12 text-[oklch(0.78_0.18_230/0.4)]" />
          <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Scene image unavailable
          </span>
          <p className="text-xs text-muted-foreground/50 text-center max-w-md px-6 font-mono italic">
            {scene.imagePrompt}
          </p>
        </div>
      )}

      {/* Cinematic vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />
      {/* Bottom gradient for readability */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Thumbnail button
// ─────────────────────────────────────────────────────────────────────────────
function ThumbnailButton({
  scene,
  index,
  isActive,
  onClick,
}: {
  scene: SceneWithNarration;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const thumbUrl = scene.image?.url ?? "";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`relative w-14 h-8 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
        isActive
          ? "border-[oklch(0.85_0.15_220)] shadow-[0_0_8px_oklch(0.85_0.15_220/0.6)]"
          : "border-white/20 opacity-60 hover:opacity-100"
      }`}
    >
      {imgError || !thumbUrl ? (
        <div className="w-full h-full bg-[oklch(0.18_0.03_260)] flex items-center justify-center">
          <span className="text-[8px] font-mono text-[oklch(0.78_0.18_230/0.6)]">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      ) : (
        <img
          src={thumbUrl || undefined}
          alt={scene.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      )}
      {isActive && (
        <div className="absolute inset-0 border-2 border-[oklch(0.85_0.15_220/0.4)] rounded-lg pointer-events-none" />
      )}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main CinematicPlayer
// ─────────────────────────────────────────────────────────────────────────────
export function CinematicPlayer({ scenes, isOpen, onClose }: CinematicPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [kenBurnsKey, setKenBurnsKey] = useState(0);
  const [subtitleKey, setSubtitleKey] = useState(0);
  // elapsed seconds within current scene (drives the progress bar)
  const [elapsed, setElapsed] = useState(0);
  const [isIntro, setIsIntro] = useState(true);
  const [isOutro, setIsOutro] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechHandleRef = useRef<BrowserSpeechHandle | null>(null);
  const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);
  const isMutedRef = useRef(isMuted);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentScene = scenes[currentIndex];
  const sceneDuration = Math.max(
    0.1,
    currentScene?.narrationAudio?.duration ?? DEFAULT_SCENE_DURATION,
  );

  // ── reset state when scene changes ──────────────────────────────────────
  useEffect(() => {
    setElapsed(0);
    setKenBurnsKey((k) => k + 1);
    setSubtitleKey((k) => k + 1);
  }, [currentIndex]);

  // Preload narration for the active scene before autoplay starts
  useEffect(() => {
    if (preloadedAudioRef.current) {
      preloadedAudioRef.current.pause();
      preloadedAudioRef.current = null;
    }
    const src = currentScene?.narrationAudio?.url;
    if (currentScene?.narrationAudio?.service === "speechsynthesis") return;
    if (!isOpen || !src || src.length === 0) return;

    const preload = new Audio(src);
    preload.preload = "auto";
    preload.load();
    preloadedAudioRef.current = preload;

    return () => {
      preload.pause();
      if (preloadedAudioRef.current === preload) {
        preloadedAudioRef.current = null;
      }
    };
  }, [
    isOpen,
    currentIndex,
    currentScene?.narrationAudio?.service,
    currentScene?.narrationAudio?.url,
  ]);

  // ── hide controls after inactivity ──────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimer();
    window.addEventListener("mousemove", resetControlsTimer);
    window.addEventListener("click", resetControlsTimer);
    return () => {
      window.removeEventListener("mousemove", resetControlsTimer);
      window.removeEventListener("click", resetControlsTimer);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [resetControlsTimer]);

  // ── playback engine ──────────────────────────────────────────────────────
  const advanceScene = useCallback(() => {
    setCurrentIndex((idx) => {
      if (idx < scenes.length - 1) return idx + 1;
      // outro
      setIsOutro(true);
      setIsPlaying(false);
      return idx;
    });
  }, [scenes.length]);

  useEffect(() => {
    // Cleanup previous timers
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    speechHandleRef.current?.cancel();
    speechHandleRef.current = null;

    if (!isOpen || !isPlaying || !currentScene) return;

    let duration = DEFAULT_SCENE_DURATION;
    let cancelled = false;

    if (currentScene.narrationAudio?.service === "speechsynthesis") {
      duration = Math.max(DEFAULT_SCENE_DURATION, currentScene.narrationAudio.duration + 0.5);
      void speakWithBrowserSpeech(currentScene.narrationAudio.text ?? currentScene.narration, {
        volume: isMutedRef.current ? 0 : 0.9,
        onError: (e) => {
          console.warn("[VisionTale] Cinematic SpeechSynthesis narration failed:", e);
        },
      }).then((handle) => {
        if (cancelled) {
          handle?.cancel();
          return;
        }
        speechHandleRef.current = handle;
      });
    } else if (currentScene.narrationAudio?.url && currentScene.narrationAudio.url.length > 0) {
      // Guard against empty URL — base64→blob conversion can yield "" on failure.
      // An empty src causes a broken audio element with misleading console errors.
      cancelBrowserSpeechNarration();
      const audio =
        preloadedAudioRef.current?.src === currentScene.narrationAudio.url
          ? preloadedAudioRef.current
          : new Audio(currentScene.narrationAudio.url);
      audio.muted = isMutedRef.current;
      audio.volume = 0.9;
      audio.currentTime = 0;
      audioRef.current = audio;
      void audio.play().catch((e) => {
        console.warn("[VisionTale] Cinematic narration play failed:", e);
      });
      duration = Math.max(DEFAULT_SCENE_DURATION, currentScene.narrationAudio.duration + 0.5);
    }

    // Elapsed ticker
    const startTime = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.min((Date.now() - startTime) / 1000, duration));
    }, 100);

    // Auto-advance after duration
    playTimerRef.current = setTimeout(() => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      advanceScene();
    }, duration * 1000);

    return () => {
      cancelled = true;
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      speechHandleRef.current?.cancel();
      speechHandleRef.current = null;
    };
  }, [
    advanceScene,
    currentIndex,
    currentScene,
    currentScene?.narrationAudio?.duration,
    currentScene?.narrationAudio?.service,
    currentScene?.narrationAudio?.text,
    currentScene?.narrationAudio?.url,
    isOpen,
    isPlaying,
  ]);

  // mute/unmute without restarting the active narration track
  useEffect(() => {
    isMutedRef.current = isMuted;
    if (audioRef.current) audioRef.current.muted = isMuted;
    // SpeechSynthesis does not expose reliable live volume changes; new fallback
    // utterances honor the current muted state when each scene starts.
  }, [isMuted]);

  // ── intro animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setIsIntro(true);
      setIsOutro(false);
      setCurrentIndex(0);
      setIsPlaying(false);
      const t = setTimeout(() => setIsIntro(false), 1800);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── fullscreen API ───────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── navigate ─────────────────────────────────────────────────────────────
  const handleClose = () => {
    setIsPlaying(false);
    onClose();
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsOutro(false);
      setCurrentIndex((i) => i - 1);
    }
  };
  const handleNext = () => {
    if (currentIndex < scenes.length - 1) {
      setIsOutro(false);
      setCurrentIndex((i) => i + 1);
    }
  };
  const handleSceneClick = (index: number) => {
    setIsOutro(false);
    setCurrentIndex(index);
  };

  if (!isOpen || !currentScene) return null;

  const clampedSceneRatio = Math.max(0, Math.min(1, elapsed / sceneDuration));
  const progressPercent = clampedSceneRatio * 100;
  const overallPercent = Math.max(
    0,
    Math.min(100, ((currentIndex + clampedSceneRatio) / scenes.length) * 100),
  );

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        key="cinematic-player"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-50 bg-black overflow-hidden"
        onClick={handleClose}
      >
        <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
          {/* ── Scene layers with crossfade ── */}
          {scenes.map((scene, idx) => (
            <SceneLayer
              key={scene.index}
              scene={scene}
              visible={idx === currentIndex}
              kenBurnsKey={idx === currentIndex ? kenBurnsKey : 0}
            />
          ))}

          {/* ── Cinematic intro bars ── */}
          <AnimatePresence>
            {isIntro && (
              <>
                <motion.div
                  className="absolute inset-x-0 top-0 h-[12vh] bg-black z-20"
                  initial={{ y: 0 }}
                  animate={{ y: "-100%" }}
                  transition={{ delay: 0.8, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                />
                <motion.div
                  className="absolute inset-x-0 bottom-0 h-[12vh] bg-black z-20"
                  initial={{ y: 0 }}
                  animate={{ y: "100%" }}
                  transition={{ delay: 0.8, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                />
                <motion.div
                  className="absolute inset-0 flex items-center justify-center z-30"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <span className="font-mono text-xl tracking-[0.4em] text-[oklch(0.85_0.15_220)] uppercase">
                    {scenes[0]?.title || "VisionTale"}
                  </span>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Outro overlay ── */}
          <AnimatePresence>
            {isOutro && (
              <motion.div
                className="absolute inset-0 bg-black z-20 flex flex-col items-center justify-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="text-center"
                >
                  <p className="font-mono text-xs tracking-[0.5em] text-[oklch(0.78_0.18_230)] uppercase mb-3">
                    The End
                  </p>
                  <h2 className="text-3xl font-bold text-white">
                    {scenes[0]?.title || "Story Complete"}
                  </h2>
                </motion.div>
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  onClick={() => {
                    setIsOutro(false);
                    setCurrentIndex(0);
                    setIsPlaying(false);
                  }}
                  className="mt-6 px-6 py-2 rounded-full border border-[oklch(0.78_0.18_230/0.5)] text-[oklch(0.85_0.15_220)] font-mono text-xs tracking-widest hover:bg-[oklch(0.78_0.18_230/0.15)] transition-all"
                >
                  REPLAY
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Scene number ── */}
          <motion.div
            animate={{ opacity: showControls ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-6 left-6 font-mono text-2xl text-[oklch(0.85_0.15_220)] drop-shadow-lg z-10"
            style={{ textShadow: "0 0 20px oklch(0.85_0.15_220/0.8)" }}
          >
            {String(currentScene.index).padStart(2, "0")}
            <span className="text-sm text-white/40 ml-1">
              / {String(scenes.length).padStart(2, "0")}
            </span>
          </motion.div>

          {/* ── Close button ── */}
          <motion.button
            type="button"
            onClick={handleClose}
            animate={{ opacity: showControls ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.1 }}
            className="absolute top-5 right-5 z-10 p-2.5 rounded-full bg-black/40 border border-white/20 text-white/70 hover:text-white hover:bg-black/60 transition-all"
          >
            <X className="h-5 w-5" />
          </motion.button>

          {/* ── Subtitle / narration ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={subtitleKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute bottom-[88px] left-6 right-6 z-10 max-w-4xl mx-auto"
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 drop-shadow-lg">
                {currentScene.title}
              </h2>
              {/* Subtitle box */}
              <div className="inline-block bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                <TypewriterText
                  text={currentScene.narration}
                  speed={isPlaying ? 35 : 0}
                  skipAnimation={!isPlaying}
                  className="text-base sm:text-lg text-white/90 leading-relaxed"
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Thumbnail strip ── */}
          <motion.div
            animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 16 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-10 px-2 overflow-x-auto max-w-[90vw]"
            style={{ scrollbarWidth: "none" }}
          >
            {scenes.map((scene, index) => (
              <ThumbnailButton
                key={scene.index}
                scene={scene}
                index={index}
                isActive={index === currentIndex}
                onClick={() => handleSceneClick(index)}
              />
            ))}
          </motion.div>

          {/* ── Control bar ── */}
          <motion.div
            animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 12 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-4 left-6 right-6 z-10 flex items-center gap-3"
          >
            {/* Prev */}
            <motion.button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-full bg-black/50 border border-white/20 text-white/80 hover:text-white hover:bg-black/70 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SkipBack className="h-4 w-4" />
            </motion.button>

            {/* Play/Pause */}
            <motion.button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-3 rounded-full bg-[oklch(0.78_0.18_230/0.25)] border border-[oklch(0.85_0.15_220/0.5)] text-[oklch(0.85_0.15_220)] hover:bg-[oklch(0.78_0.18_230/0.4)] transition-all"
              style={{ boxShadow: "0 0 14px oklch(0.78_0.18_230/0.35)" }}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </motion.button>

            {/* Next */}
            <motion.button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === scenes.length - 1}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-full bg-black/50 border border-white/20 text-white/80 hover:text-white hover:bg-black/70 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SkipForward className="h-4 w-4" />
            </motion.button>

            {/* Progress timeline */}
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              {/* Per-scene progress */}
              <div
                className="h-1 bg-white/15 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  const targetScene = Math.floor(ratio * scenes.length);
                  handleSceneClick(Math.max(0, Math.min(scenes.length - 1, targetScene)));
                }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-[oklch(0.78_0.18_230)] to-[oklch(0.85_0.15_220)] rounded-full"
                  animate={{ width: `${overallPercent}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              {/* Scene segment markers */}
              <div className="relative h-0.5">
                {scenes.map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 w-px h-full bg-white/20"
                    style={{ left: `${(idx / scenes.length) * 100}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Mute */}
            <motion.button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-full bg-black/50 border border-white/20 text-white/80 hover:text-white hover:bg-black/70 transition-all"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </motion.button>

            {/* Fullscreen */}
            <motion.button
              type="button"
              onClick={toggleFullscreen}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-full bg-black/50 border border-white/20 text-white/80 hover:text-white hover:bg-black/70 transition-all"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </motion.button>
          </motion.div>

          {/* ── Scene-level progress bar at very bottom ── */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-10">
            <motion.div
              className="h-full bg-[oklch(0.85_0.15_220/0.8)]"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
