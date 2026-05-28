import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, Loader2 } from "lucide-react";
import type { NarrationAudio } from "@/lib/types/character.types";

interface NarrationPlayerProps {
  narrationAudio?: NarrationAudio;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function NarrationPlayer({
  narrationAudio,
  onGenerate,
  isGenerating = false,
}: NarrationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
    };
  }, [narrationAudio]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !narrationAudio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn("[VisionTale] Narration playback failed:", err);
      setIsPlaying(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !narrationAudio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = percentage * audio.duration;
  };

  useEffect(() => {
    const audio = audioRef.current;
    setIsPlaying(false);
    setProgress(0);
    return () => {
      audio?.pause();
    };
  }, [narrationAudio?.url]);

  if (!narrationAudio && !onGenerate) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Hidden audio element — only render when we have a valid URL */}
      {narrationAudio && narrationAudio.url && narrationAudio.url.length > 0 && (
        <audio ref={audioRef} src={narrationAudio.url} preload="auto" />
      )}

      {/* Generate button or player */}
      {!narrationAudio ? (
        <motion.button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[oklch(0.78_0.18_230/0.15)] border border-[oklch(0.78_0.18_230/0.3)] text-[oklch(0.85_0.15_220)] text-xs font-mono uppercase tracking-wider hover:bg-[oklch(0.78_0.18_230/0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating Voice...
            </>
          ) : (
            <>
              <Volume2 className="h-3.5 w-3.5" />
              Generate Narration
            </>
          )}
        </motion.button>
      ) : (
        <div className="space-y-2">
          {/* Play/Pause button */}
          <motion.button
            type="button"
            onClick={togglePlay}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg glass-neon text-[oklch(0.85_0.15_220)] text-xs font-mono uppercase tracking-wider neon-glow hover:bg-[oklch(0.78_0.18_230/0.15)] transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                Pause Narration
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Play Narration
              </>
            )}
          </motion.button>

          {/* Progress bar */}
          <motion.div
            className="relative h-1.5 bg-[oklch(0.22_0.035_260/0.6)] rounded-full overflow-hidden cursor-pointer"
            onClick={handleProgressClick}
            whileHover={{ scale: 1.02 }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[oklch(0.78_0.18_230)] to-[oklch(0.85_0.15_220)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
            {/* Glowing effect on progress */}
            <motion.div
              className="absolute inset-y-0 right-0 w-2 bg-[oklch(0.85_0.15_220)] blur-sm rounded-full"
              style={{ left: `${progress}%` }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>

          {/* Duration display */}
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>ELEVENLABS</span>
            <span>{Math.round(narrationAudio.duration)}s</span>
          </div>
        </div>
      )}
    </div>
  );
}
