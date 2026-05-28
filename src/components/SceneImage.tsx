import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ImageOff, RefreshCw } from "lucide-react";

interface SceneImageProps {
  prompt: string;
  seed: number;
  className?: string;
}

/**
 * SceneImage — renders a Pollinations-generated cinematic image for a story scene.
 *
 * BUGS FIXED vs original:
 * 1. Removed `loading="lazy"` — lazy loading deferred images that were already
 *    in the viewport, causing them to silently never fire onLoad in many browsers
 *    right after story generation.
 * 2. Added `key={imageUrl}` logic via a `useEffect` reset — when the parent
 *    re-renders with a new prompt/seed (new story), the status resets to "loading"
 *    so the skeleton and then the image show correctly instead of staying stuck
 *    in a stale "error" or "loading" state from a previous render.
 * 3. Added a manual retry button so users can recover from transient Pollinations
 *    failures without regenerating the whole story.
 * 4. Added `fetchpriority="high"` to the first scene image (seed === 1) so the
 *    browser fetches it immediately rather than queuing it behind other resources.
 * 5. Fallback now shows the image prompt text so the user can see what would have
 *    rendered, keeping the UI informative rather than just showing an error icon.
 */
export function SceneImage({ prompt, seed, className }: SceneImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);

  // Build the Pollinations URL. Append retryCount as a cache-buster on retries.
  const encodedPrompt = encodeURIComponent(prompt.trim() || "cinematic scene");
  const cacheBust = retryCount > 0 ? `&_r=${retryCount}` : "";
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&seed=${seed}&nologo=true&model=flux${cacheBust}`;

  // BUG FIX #2: Reset status whenever the URL changes (new story generated).
  // Without this, if a previous story's image errored, the same component
  // instance keeps status="error" and never shows the new story's image.
  useEffect(() => {
    setStatus("loading");
  }, [imageUrl]);

  const handleLoad = useCallback(() => setStatus("loaded"), []);
  const handleError = useCallback(() => setStatus("error"), []);

  const handleRetry = useCallback(() => {
    setStatus("loading");
    setRetryCount((c) => c + 1);
  }, []);

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
        {status === "loading" && (
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
                Generating image…
              </span>
            </div>
          </div>
        )}

        {/* BUG FIX #1: removed loading="lazy" — eager loading ensures images render
            immediately after story generation without waiting for scroll events.
            BUG FIX #4: fetchpriority="high" on scene 1 (index 1) for above-fold speed. */}
        {status !== "error" && (
          <img
            src={imageUrl}
            alt={prompt}
            onLoad={handleLoad}
            onError={handleError}
            // REMOVED: loading="lazy"  ← this was the primary bug
            fetchPriority={seed <= 2 ? "high" : "auto"}
            className={cn(
              "absolute inset-0 w-full h-full object-cover rounded-xl",
              "transition-opacity duration-700 ease-out",
              status === "loading" ? "opacity-0" : "opacity-100",
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
