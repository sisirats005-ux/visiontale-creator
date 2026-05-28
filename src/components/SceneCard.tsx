import type { Scene } from "@/lib/services/story.functions";
import type { NarrationAudio } from "@/lib/types/character.types";
import { GlassCard } from "./GlassCard";
import { SceneImage } from "./SceneImage";
import { NarrationPlayer } from "./NarrationPlayer";
import { Image as ImageIcon, Mic, Camera, Clock, Play } from "lucide-react";
import { motion } from "framer-motion";
import { cinematicFadeIn, glowPulse } from "@/lib/utils/transitions";

interface SceneCardProps {
  scene: Scene;
  delayMs?: number;
  narrationAudio?: NarrationAudio;
  imageUrl?: string;
  isPlaceholderImage?: boolean;
  isGeneratingImage?: boolean;
  onGenerateImage?: (opts?: { force?: boolean }) => void;
  onGenerateNarration?: () => void;
  isGeneratingNarration?: boolean;
  isActive?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
  showTimeline?: boolean;
  isLast?: boolean;
}

export function SceneCard({
  scene,
  delayMs = 0,
  narrationAudio,
  imageUrl,
  isPlaceholderImage = false,
  isGeneratingImage = false,
  onGenerateImage,
  onGenerateNarration,
  isGeneratingNarration = false,
  isActive = false,
  isPlaying = false,
  onPlay,
  showTimeline = false,
  isLast = false,
}: SceneCardProps) {
  return (
    <div className="relative">
      {/* Timeline connector */}
      {showTimeline && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-[oklch(0.78_0.18_230/0.3)] to-transparent -z-10" />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: delayMs / 1000 }}
        whileHover={{ scale: 1.01 }}
        className="group relative"
      >
        {/* Timeline node */}
        {showTimeline && (
          <motion.div
            className="absolute left-4 top-6 w-5 h-5 rounded-full border-2 border-[oklch(0.78_0.18_230/0.5)] bg-background z-10"
            animate={isActive ? glowPulse.animate : {}}
            style={{
              backgroundColor: isActive
                ? "oklch(0.78_0.18_230/0.3)"
                : "oklch(0.22_0.035_260)",
            }}
          >
            {isActive && isPlaying && (
              <motion.div
                className="absolute inset-0 rounded-full bg-[oklch(0.78_0.18_230)]"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.div>
        )}

        <GlassCard
          className={`overflow-hidden transition-all duration-300 ${
            isActive
              ? "border-[oklch(0.78_0.18_230/0.5)] shadow-[0_0_30px_oklch(0.78_0.18_230/0.3)]"
              : "border-white/10"
          }`}
        >
          {/* Cinematic storyboard header */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-xl glass-neon flex items-center justify-center font-mono text-sm text-[oklch(0.85_0.15_220)] transition-all ${
                isActive ? "neon-glow" : ""
              }`}
            >
              {String(scene.index).padStart(2, "0")}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className={`text-lg font-semibold transition-colors ${
                  isActive ? "text-[oklch(0.85_0.15_220)]" : "text-foreground"
                }`}
              >
                {scene.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {scene.description}
              </p>
            </div>
            {onPlay && (
              <motion.button
                type="button"
                onClick={onPlay}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 w-10 h-10 rounded-lg glass-neon flex items-center justify-center text-[oklch(0.85_0.15_220)] hover:bg-[oklch(0.78_0.18_230/0.2)] transition-all"
              >
                <Play className="h-4 w-4 fill-current" />
              </motion.button>
            )}
          </div>

          {/* AI-generated scene image
              BUG FIX: added key={scene.index + "-" + scene.imagePrompt} so React
              unmounts and remounts SceneImage when a new story is generated with
              different scenes, forcing a clean load state instead of reusing the
              stale component instance that might be stuck in "error" or "loading". */}
          <div className="mb-4">
            <SceneImage
              key={`${scene.index}-${scene.imagePrompt.slice(0, 40)}`}
              prompt={scene.imagePrompt || `Cinematic scene ${scene.index}: ${scene.title}`}
              seed={scene.index}
              imageUrl={imageUrl}
              isPlaceholder={isPlaceholderImage}
              isGenerating={isGeneratingImage}
              onGenerate={onGenerateImage}
            />
          </div>

          {/* Cinematic metadata */}
          <div className="flex flex-wrap gap-2 mb-4">
            {scene.cameraAngle && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[oklch(0.78_0.18_230/0.15)] border border-[oklch(0.78_0.18_230/0.3)]">
                <Camera className="h-3 w-3 text-[oklch(0.85_0.15_220)]" />
                <span className="text-xs font-mono text-[oklch(0.85_0.15_220)]">
                  {scene.cameraAngle}
                </span>
              </div>
            )}
            {scene.duration && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[oklch(0.78_0.18_230/0.15)] border border-[oklch(0.78_0.18_230/0.3)]">
                <Clock className="h-3 w-3 text-[oklch(0.85_0.15_220)]" />
                <span className="text-xs font-mono text-[oklch(0.85_0.15_220)]">
                  {scene.duration}
                </span>
              </div>
            )}
          </div>

          {/* Narration Player */}
          <div className="mb-4">
            <NarrationPlayer
              narrationAudio={narrationAudio}
              onGenerate={onGenerateNarration}
              isGenerating={isGeneratingNarration}
            />
          </div>

          {/* Narration text */}
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-xs">
              <Mic className="h-3.5 w-3.5 mt-0.5 text-[oklch(0.78_0.18_230)] flex-shrink-0" />
              <div>
                <span className="font-mono uppercase tracking-wider text-[oklch(0.78_0.18_230)]">
                  Narration
                </span>
                <p className="mt-0.5 text-muted-foreground/90 leading-relaxed italic">
                  "{scene.narration}"
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs opacity-60 group-hover:opacity-100 transition-opacity">
              <ImageIcon className="h-3.5 w-3.5 mt-0.5 text-[oklch(0.78_0.18_230)] flex-shrink-0" />
              <div>
                <span className="font-mono uppercase tracking-wider text-[oklch(0.78_0.18_230)]">
                  Image prompt
                </span>
                <p className="mt-0.5 text-muted-foreground/90 leading-relaxed line-clamp-2">
                  {scene.imagePrompt}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Cinematic hover overlay */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(circle at center, transparent 0%, oklch(0.78_0.18_230/0.05) 100%)",
          }}
        />
      </motion.div>
    </div>
  );
}
