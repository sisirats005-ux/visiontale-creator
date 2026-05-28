import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ImageOff, RefreshCw } from "lucide-react";

interface SceneImageProps {
  prompt: string;
  seed: number;
  imageUrl?: string;
  isPlaceholder?: boolean;
  isGenerating?: boolean;
  onGenerate?: (opts?: { force?: boolean }) => void;
  className?: string;
}

/**
 * SceneImage — displays server-generated Pollinations images (data URLs).
 * Generation is triggered once per scene via onGenerate; no browser prompt URLs.
 */
export function SceneImage({
  prompt,
  seed,
  imageUrl,
  isPlaceholder,
  isGenerating,
  onGenerate,
  className,
}: SceneImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const requestedRef = useRef(false);

  // BUG FIX #2: Reset status whenever the URL changes (new story generated).
  // Without this, if a previous story's image errored, the same component
  // instance keeps status="error" and never shows the new story's image.
  useEffect(() => {
    setStatus(imageUrl ? "loading" : "loading");
    requestedRef.current = false;
  }, [imageUrl, seed, prompt]);

  // Generate once on mount if needed (exactly one request per scene).
  useEffect(() => {
    if (imageUrl) return;
    if (!onGenerate) return;
    if (requestedRef.current) return;
    requestedRef.current = true;
    onGenerate({ force: false });
  }, [imageUrl, onGenerate]);

  const handleLoad = useCallback(() => setStatus("loaded"), []);
  const handleError = useCallback(() => {
    console.error(
      "[VisionTale] Scene image failed to load",
      JSON.stringify({
        seed,
        url: imageUrl ?? null,
        promptLength: prompt.trim().length,
        provider: "pollinations",
        isPlaceholder: isPlaceholder ?? false,
      }),
    );
    setStatus("error");
  }, [imageUrl, prompt, seed]);

  const handleRetry = useCallback(() => {
    setStatus("loading");
    requestedRef.current = true;
    onGenerate?.({ force: true });
  }, [onGenerate]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-[oklch(0.78_0.18_230/0.35)]",
        "shadow-[0_0_20px_oklch(0.78_0.18_230/0.25),0_0_60px_oklch(0.78_0.18_230/0.12)]",
        "transition-all duration-500",
        status === "loaded" &&
          "shadow-[0_0_28px_oklch(0.78_0.18_230/0.4),0_0_80px_oklch(0.78_0.18_230/0.2)]",
        className,
      )}
    >
      {/* 16:9 cinematic aspect-ratio container */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        {/* Loading shimmer — visible while image is fetching */}
        {(status === "loading" || isGenerating) && (
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.22 0.035 260) 0%, oklch(0.28 0.06 260) 50%, oklch(0.22 0.035 260) 100%)",
              }}
            />
            <motion.div
              className="absolute inset-0"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, oklch(0.78 0.18 230 / 0.18) 50%, transparent 100%)",
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <motion.div
                className="w-8 h-8 rounded-full border-2 border-[oklch(0.78_0.18_230/0.4)] border-t-[oklch(0.85_0.15_220)]"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-xs font-mono text-[oklch(0.78_0.18_230/0.7)] uppercase tracking-wider">
                {isGenerating ? "Generating image…" : "Loading image…"}
              </span>
            </div>
          </div>
        )}

        {isPlaceholder && imageUrl && status === "loaded" && (
          <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-black/50 border border-amber-500/30">
            <span className="text-[10px] font-mono text-amber-300/90 uppercase tracking-wider">
              Placeholder
            </span>
          </div>
        )}

        {status !== "error" && imageUrl && (
          <img
            src={imageUrl}
            alt={prompt}
            onLoad={handleLoad}
            onError={handleError}
            fetchPriority={seed <= 2 ? "high" : "auto"}
            className={cn(
              "absolute inset-0 w-full h-full object-cover rounded-xl",
              "transition-opacity duration-700 ease-out",
              status === "loading" ? "opacity-0" : "opacity-100",
              isPlaceholder && "opacity-90",
            )}
          />
        )}

        {/* Error fallback with retry + prompt preview */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[oklch(0.22_0.035_260/0.8)] rounded-xl px-6">
            <ImageOff className="h-8 w-8 text-[oklch(0.78_0.18_230/0.6)]" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider text-center">
              Image generation failed
            </span>
            <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed line-clamp-2 font-mono italic">
              {prompt}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
                         bg-[oklch(0.78_0.18_230/0.15)] border border-[oklch(0.78_0.18_230/0.35)]
                         text-[oklch(0.85_0.15_220)] hover:bg-[oklch(0.78_0.18_230/0.25)]
                         transition-all"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
