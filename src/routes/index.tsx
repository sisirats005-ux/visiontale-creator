import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Sparkles, Wand2, AlertCircle, Cpu, Play, Info } from "lucide-react";

import {
  generateStory,
  type StoryResult as StoryResultType,
} from "@/lib/services/story.functions";
import { generateNarration } from "@/lib/services/narration.functions";
import { getVideoExportService } from "@/lib/services/videoExport.service";
import { GlassCard } from "@/components/GlassCard";
import { NeonButton } from "@/components/NeonButton";
import { GenreSelector, type GenreId } from "@/components/GenreSelector";
import { LoadingState } from "@/components/LoadingState";
import { StoryResult } from "@/components/StoryResult";
import { CharacterInputForm } from "@/components/CharacterInputForm";
import { AmbientBackground } from "@/components/AmbientBackground";
import { CinematicPlayer } from "@/components/CinematicPlayer";
import type {
  CharacterInput,
  NarrationAudio,
  VideoExportOptions,
  VideoExportProgress,
  ExportedVideo,
  SceneWithNarration,
} from "@/lib/types/character.types";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Neuralcast — AI Story Video Generator" },
      {
        name: "description",
        content:
          "Generate cinematic short stories with scene-by-scene breakdowns using AI.",
      },
    ],
  }),
});

/**
 * Convert base64-encoded audio (returned from the server) into a browser blob URL.
 *
 * BUG FIX: The original code called URL.createObjectURL inside server functions,
 * which crashed with "URL is not defined" in the Node.js server runtime.
 * The server now returns raw base64 audio data; this function runs client-side only.
 */
function base64ToAudioBlobUrl(base64Data: string, mimeType = "audio/mpeg"): string {
  try {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("[VisionTale] base64ToAudioBlobUrl failed:", err);
    return "";
  }
}

function HomePage() {
  const generate = useServerFn(generateStory);
  const generateNarrationFn = useServerFn(generateNarration);

  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState<GenreId>("scifi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoryResultType | null>(null);

  const [characters, setCharacters] = useState<CharacterInput[]>([]);

  const [sceneNarrations, setSceneNarrations] = useState<NarrationAudio[]>([]);
  // Track which scene index is currently generating narration (null = none)
  const [generatingNarrationIndex, setGeneratingNarrationIndex] = useState<number | null>(null);
  const [narrationError, setNarrationError] = useState<string | null>(null);
  const [isCinematicPlayerOpen, setIsCinematicPlayerOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length < 3 || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSceneNarrations([]);
    setNarrationError(null);

    console.log("[VisionTale] Generating story:", prompt.trim().slice(0, 60));

    try {
      const res = await generate({
        data: {
          prompt: prompt.trim(),
          genre,
          characters,
        },
      });

      if (res.error || !res.result) {
        console.error("[VisionTale] Story generation error:", res.error);
        setError(res.error ?? "Failed to generate story.");
      } else {
        console.log("[VisionTale] Story ready:", res.result.title, `(${res.result.scenes.length} scenes)`);
        setResult(res.result);
      }
    } catch (err) {
      console.error("[VisionTale] Story generation network error:", err);
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNarration = async (sceneIndex: number) => {
    if (!result || generatingNarrationIndex !== null) return;

    // Skip if we already have a working URL for this scene
    if (sceneNarrations[sceneIndex]?.url) {
      console.log("[VisionTale] Narration already exists for scene", sceneIndex + 1);
      return;
    }

    const scene = result.scenes[sceneIndex];
    if (!scene?.narration) return;

    setGeneratingNarrationIndex(sceneIndex);
    setNarrationError(null);

    console.log("[VisionTale] Requesting narration for scene", sceneIndex + 1);

    try {
      const res = await generateNarrationFn({
        data: {
          text: scene.narration,
          options: { service: "openai" },
        },
      });

      if (res.error || !res.result) {
        console.warn("[VisionTale] Narration failed:", res.error);
        setNarrationError(res.error ?? "Narration generation failed.");
      } else {
        const serverResult = res.result;
        let finalUrl = serverResult.url;

        // FIX: Server returns base64Data (server-safe). Convert to blob URL here (browser-only).
        if (!finalUrl && serverResult.base64Data) {
          finalUrl = base64ToAudioBlobUrl(serverResult.base64Data);
          console.log("[VisionTale] Blob URL created for scene", sceneIndex + 1);
        }

        if (!finalUrl) {
          setNarrationError("Narration audio was empty. Please try again.");
        } else {
          const audio: NarrationAudio = { ...serverResult, url: finalUrl };
          setSceneNarrations((prev) => {
            const updated = [...prev];
            updated[sceneIndex] = audio;
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("[VisionTale] Narration exception:", err);
      setNarrationError("Narration request failed. Check your API key setup.");
    } finally {
      setGeneratingNarrationIndex(null);
    }
  };

  const handleExportVideo = async (
    options: VideoExportOptions,
    onProgress?: (progress: VideoExportProgress) => void,
  ): Promise<ExportedVideo> => {
    if (!result) throw new Error("No story to export");

    const videoExportService = getVideoExportService();
    const scenesWithNarration: SceneWithNarration[] = result.scenes.map(
      (scene, index) => ({ ...scene, narrationAudio: sceneNarrations[index] }),
    ) as SceneWithNarration[];

    return videoExportService.exportVideo(scenesWithNarration, options, onProgress);
  };

  const handleOpenCinematicPlayer = () => {
    if (!result) return;
    setIsCinematicPlayerOpen(true);
  };

  return (
    <main className="relative min-h-screen">
      <AmbientBackground />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-8 w-8 rounded-lg glass-neon flex items-center justify-center neon-glow">
                <Cpu className="h-4 w-4 text-[oklch(0.85_0.15_220)]" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Neuralcast</h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                AI Story Engine
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.2_150)] animate-pulse" />
            v2.0 · multi-char
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-20">
        {/* Hero */}
        <section className="text-center mb-12 animate-float-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-mono text-[oklch(0.85_0.15_220)] mb-6">
            <Sparkles className="h-3 w-3" />
            Powered by AI
          </div>
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
            Turn an idea into a
            <br />
            <span className="text-gradient">cinematic story</span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Describe a concept, pick a genre, and watch AI craft a complete short
            story with a scene-by-scene visual breakdown.
          </p>
        </section>

        {/* Generator form */}
        <GlassCard
          variant="neon"
          className="p-6 sm:p-8 animate-float-up"
          style={{ animationDelay: "100ms" }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="prompt"
                className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-2"
              >
                Your idea
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                placeholder="A lonely astronaut discovers a signal from a forgotten Earth colony…"
                rows={3}
                maxLength={500}
                className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-4 py-3 text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
              />
              <div className="mt-1.5 flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>Min 3 characters</span>
                <span>{prompt.length}/500</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-2">
                Genre
              </label>
              <GenreSelector value={genre} onChange={setGenre} disabled={loading} />
            </div>

            <div className="pt-1">
              <CharacterInputForm
                characters={characters}
                onCharactersChange={setCharacters}
                disabled={loading}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <p className="text-xs text-muted-foreground font-mono">
                Generation takes ~10–20 seconds
              </p>
              <NeonButton
                type="submit"
                loading={loading}
                disabled={prompt.trim().length < 3}
              >
                <Wand2 className="h-4 w-4" />
                {loading ? "Generating…" : "Generate Story"}
              </NeonButton>
            </div>
          </form>
        </GlassCard>

        {/* Story generation error */}
        {error && (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 backdrop-blur-md p-4 flex items-start gap-3 animate-float-up">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Generation failed</p>
              <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Narration error — non-blocking, story still shows */}
        {narrationError && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md p-3 flex items-start gap-3">
            <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/90">{narrationError}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-6">
            <LoadingState />
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Generated Story</h3>
              <NeonButton
                onClick={handleOpenCinematicPlayer}
                className="text-xs px-4 py-2"
              >
                <Play className="h-3.5 w-3.5" />
                Cinematic Playback
              </NeonButton>
            </div>
            <StoryResult
              result={result}
              sceneNarrations={sceneNarrations}
              onGenerateNarration={handleGenerateNarration}
              generatingNarrationIndex={generatingNarrationIndex}
              onExportVideo={handleExportVideo}
            />
          </div>
        )}
      </div>

      {/* Cinematic Player */}
      {result && (
        <CinematicPlayer
          scenes={
            result.scenes.map((scene, index) => ({
              ...scene,
              narrationAudio: sceneNarrations[index],
            })) as SceneWithNarration[]
          }
          isOpen={isCinematicPlayerOpen}
          onClose={() => setIsCinematicPlayerOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            Neuralcast · V2 · Multi-Character Cinematic Engine
          </p>
        </div>
      </footer>
    </main>
  );
}
