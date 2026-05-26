import type { Scene } from "@/lib/services/story.functions";
import { GlassCard } from "./GlassCard";
import { SceneImage } from "./SceneImage";
import { Image as ImageIcon, Mic } from "lucide-react";

interface SceneCardProps {
  scene: Scene;
  delayMs?: number;
}

export function SceneCard({ scene, delayMs = 0 }: SceneCardProps) {
  return (
    <GlassCard
      className="animate-float-up"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg glass-neon flex items-center justify-center font-mono text-sm text-[oklch(0.85_0.15_220)]">
          {String(scene.index).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{scene.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {scene.description}
          </p>

          {/* AI-generated scene image */}
          <div className="mt-4">
            <SceneImage prompt={scene.imagePrompt} seed={scene.index} />
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-start gap-2 text-xs">
              <ImageIcon className="h-3.5 w-3.5 mt-0.5 text-[oklch(0.78_0.18_230)] flex-shrink-0" />
              <div>
                <span className="font-mono uppercase tracking-wider text-[oklch(0.78_0.18_230)]">
                  Image prompt
                </span>
                <p className="mt-0.5 text-muted-foreground/90 leading-relaxed">
                  {scene.imagePrompt}
                </p>
              </div>
            </div>

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
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

