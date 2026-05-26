import type { StoryResult as StoryResultType } from "@/lib/services/story.functions";
import { GlassCard } from "./GlassCard";
import { SceneCard } from "./SceneCard";
import { BookOpen, Film } from "lucide-react";

interface StoryResultProps {
  result: StoryResultType;
}

export function StoryResult({ result }: StoryResultProps) {
  return (
    <div className="space-y-6">
      <GlassCard variant="neon" className="animate-float-up">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)]">
          <BookOpen className="h-3.5 w-3.5" />
          Generated Story
        </div>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-gradient leading-tight">
          {result.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground italic">{result.logline}</p>
        <p className="mt-5 text-foreground/90 leading-relaxed whitespace-pre-line">
          {result.story}
        </p>
      </GlassCard>

      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Film className="h-4 w-4 text-[oklch(0.78_0.18_230)]" />
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
            Scene Breakdown · {result.scenes.length} scenes
          </h3>
        </div>
        <div className="space-y-3">
          {result.scenes.map((scene, i) => (
            <SceneCard key={scene.index} scene={scene} delayMs={i * 80} />
          ))}
        </div>
      </div>
    </div>
  );
}
