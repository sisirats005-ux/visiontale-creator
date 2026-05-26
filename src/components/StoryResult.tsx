import type { StoryResult as StoryResultType } from "@/lib/services/story.functions";
import type { NarrationAudio, SceneWithNarration, VideoExportOptions, ExportedVideo } from "@/lib/types/character.types";
import { GlassCard } from "./GlassCard";
import { SceneCard } from "./SceneCard";
import { VideoExportModal } from "./VideoExportModal";
import { NeonButton } from "./NeonButton";
import { BookOpen, Film, Video, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface StoryResultProps {
  result: StoryResultType;
  sceneNarrations?: NarrationAudio[];
  onGenerateNarration?: (sceneIndex: number) => void;
  isGeneratingNarration?: boolean;
  onExportVideo?: (options: VideoExportOptions, onProgress?: (progress: any) => void) => Promise<ExportedVideo>;
}

export function StoryResult({ 
  result, 
  sceneNarrations = [],
  onGenerateNarration,
  isGeneratingNarration = false,
  onExportVideo
}: StoryResultProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExportVideo = async (options: VideoExportOptions, onProgress?: (progress: any) => void) => {
    if (!onExportVideo) {
      throw new Error("Export video function not provided");
    }
    return onExportVideo(options, onProgress);
  };

  // Convert scenes to SceneWithNarration for export
  const scenesWithNarration: SceneWithNarration[] = result.scenes.map((scene, index) => ({
    ...scene,
    narrationAudio: sceneNarrations[index],
  })) as SceneWithNarration[];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
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
              <NeonButton
                onClick={() => setIsExportModalOpen(true)}
                className="text-xs px-4 py-2"
              >
                <Video className="h-3.5 w-3.5" />
                Export Video
              </NeonButton>
            )}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient leading-tight mb-3">
            {result.title}
          </h2>
          <p className="text-sm text-muted-foreground italic mb-6">{result.logline}</p>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
            {result.story}
          </p>
        </GlassCard>
      </motion.div>

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
              key={scene.index}
              scene={scene}
              delayMs={i * 100}
              narrationAudio={sceneNarrations[i]}
              onGenerateNarration={onGenerateNarration ? () => onGenerateNarration(i) : undefined}
              isGeneratingNarration={isGeneratingNarration}
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
