import type { StoryResult as StoryResultType } from "@/lib/services/story.functions";
import type {
  NarrationAudio,
  SceneWithNarration,
  VideoExportOptions,
  ExportedVideo,
  VideoExportProgress,
} from "@/lib/types/character.types";
import { GlassCard } from "./GlassCard";
import { SceneCard } from "./SceneCard";
import { VideoExportModal } from "./VideoExportModal";
import { NeonButton } from "./NeonButton";
import { BookOpen, Film, Video } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface StoryResultProps {
  result: StoryResultType;
  sceneNarrations?: NarrationAudio[];
  sceneImages?: Array<{ url: string; model: string; isPlaceholder?: boolean } | null>;
  generatingImageIndex?: number | null;
  queuedImageIndexes?: Set<number>;
  onGenerateImage?: (sceneIndex: number, opts?: { force?: boolean }) => void;
  onGenerateNarration?: (sceneIndex: number) => void;
  /**
   * FIX: Changed from boolean `isGeneratingNarration` to `generatingNarrationIndex: number | null`.
   * With the old boolean, ALL scenes showed "generating" simultaneously when any one was loading.
   * Now each SceneCard independently shows its spinner only when it is the active scene.
   */
  generatingNarrationIndex?: number | null;
  onExportVideo?: (
    options: VideoExportOptions,
    onProgress?: (progress: VideoExportProgress) => void,
  ) => Promise<ExportedVideo>;
}

export function StoryResult({
  result,
  sceneNarrations = [],
  sceneImages = [],
  generatingImageIndex = null,
  queuedImageIndexes = new Set(),
  onGenerateImage,
  onGenerateNarration,
  generatingNarrationIndex = null,
  onExportVideo,
}: StoryResultProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExportVideo = async (
    options: VideoExportOptions,
    onProgress?: (progress: VideoExportProgress) => void,
  ) => {
    if (!onExportVideo) throw new Error("Export video function not provided");
    return onExportVideo(options, onProgress);
  };

  const scenesWithNarration: SceneWithNarration[] = result.scenes.map((scene, index) => ({
    ...scene,
    narrationAudio: sceneNarrations[index],
    image: sceneImages[index]
      ? {
          url: sceneImages[index]!.url,
          provider: "pollinations",
          model: sceneImages[index]!.model,
          isPlaceholder: sceneImages[index]!.isPlaceholder,
        }
      : undefined,
  })) as SceneWithNarration[];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Story card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GlassCard variant="neon">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)]">
              <BookOpen className="h-3.5 w-3.5" />
              Generated Story
            </div>
            {onExportVideo && (
              <NeonButton onClick={() => setIsExportModalOpen(true)} className="text-xs px-4 py-2">
                <Video className="h-3.5 w-3.5" />
                Export Video
              </NeonButton>
            )}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient leading-tight mb-3">
            {result.title}
          </h2>
          <p className="text-sm text-muted-foreground italic mb-6">{result.logline}</p>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{result.story}</p>
        </GlassCard>
      </motion.div>

      {/* Scene breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4 px-1">
          <Film className="h-4 w-4 text-[oklch(0.78_0.18_230)]" />
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
            Scene Breakdown · {result.scenes.length} scenes
          </h3>
        </div>
        <div className="space-y-3">
          {result.scenes.map((scene, i) => (
            <SceneCard
              key={`${scene.index}-${scene.title}`}
              scene={scene}
              delayMs={i * 100}
              narrationAudio={sceneNarrations[i]}
              imageUrl={sceneImages[i]?.url}
              isPlaceholderImage={sceneImages[i]?.isPlaceholder}
              isGeneratingImage={generatingImageIndex === i}
              isQueuedImage={queuedImageIndexes.has(i)}
              onGenerateImage={onGenerateImage ? (opts) => onGenerateImage(i, opts) : undefined}
              onGenerateNarration={onGenerateNarration ? () => onGenerateNarration(i) : undefined}
              isGeneratingNarration={generatingNarrationIndex === i}
            />
          ))}
        </div>
      </motion.div>

      {/* Video Export Modal */}
      {onExportVideo && (
        <VideoExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          scenes={scenesWithNarration}
          onExport={handleExportVideo}
        />
      )}
    </motion.div>
  );
}
