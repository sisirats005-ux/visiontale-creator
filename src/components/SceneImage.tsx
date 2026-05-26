import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface SceneImageProps {
  prompt: string;
  seed: number;
  className?: string;
}

export function SceneImage({ prompt, seed, className }: SceneImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const handleLoad = useCallback(() => setStatus("loaded"), []);
  const handleError = useCallback(() => setStatus("error"), []);

  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&seed=${seed}&nologo=true`;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-[oklch(0.78_0.18_230/0.35)]",
        "shadow-[0_0_20px_oklch(0.78_0.18_230/0.25),0_0_60px_oklch(0.78_0.18_230/0.12)]",
        "transition-all duration-500",
        status === "loaded" && "shadow-[0_0_28px_oklch(0.78_0.18_230/0.4),0_0_80px_oklch(0.78_0.18_230/0.2)]",
        className,
      )}
    >
      {/* Aspect ratio container — 16:9 cinematic */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        {/* Loading shimmer skeleton */}
        {status === "loading" && (
          <div className="absolute inset-0 animate-shimmer rounded-xl" />
        )}

        {/* Actual image */}
        {status !== "error" && (
          <img
            src={imageUrl}
            alt={prompt}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              "transition-opacity duration-700 ease-out",
              status === "loading" ? "opacity-0" : "opacity-100",
            )}
            loading="lazy"
          />
        )}

        {/* Error fallback */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[oklch(0.22_0.035_260/0.6)] rounded-xl">
            <ImageOff className="h-8 w-8 text-[oklch(0.78_0.18_230/0.6)]" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Image unavailable
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
