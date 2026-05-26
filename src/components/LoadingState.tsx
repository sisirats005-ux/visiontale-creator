import { Sparkles } from "lucide-react";

const STEPS = [
  "Imagining your story…",
  "Crafting characters and arc…",
  "Breaking into cinematic scenes…",
  "Polishing narration…",
];

export function LoadingState() {
  return (
    <div className="glass-neon rounded-2xl p-8 animate-float-up">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-pulse-glow" />
          <Sparkles className="h-6 w-6 text-[oklch(0.85_0.15_220)] relative" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Generating</h3>
          <p className="text-sm text-muted-foreground">
            AI is composing your story and scenes
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className="flex items-center gap-3 text-sm text-muted-foreground animate-float-up"
            style={{ animationDelay: `${i * 200}ms` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.18_230)] animate-pulse" />
            {step}
          </div>
        ))}
      </div>

      <div className="mt-6 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full w-full animate-shimmer" />
      </div>
    </div>
  );
}
