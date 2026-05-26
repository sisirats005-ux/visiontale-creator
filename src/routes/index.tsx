import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Sparkles, Wand2, AlertCircle, Cpu } from "lucide-react";

import { generateStory, type StoryResult as StoryResultType } from "@/lib/services/story.functions";
import { GlassCard } from "@/components/GlassCard";
import { NeonButton } from "@/components/NeonButton";
import { GenreSelector, type GenreId } from "@/components/GenreSelector";
import { LoadingState } from "@/components/LoadingState";
import { StoryResult } from "@/components/StoryResult";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Neuralcast — AI Story Video Generator" },
      {
        name: "description",
        content:
          "Generate cinematic short stories with scene-by-scene breakdowns using AI. Built for creators and storytellers.",
      },
      { property: "og:title", content: "Neuralcast — AI Story Video Generator" },
      {
        property: "og:description",
        content:
          "Turn a single idea into a cinematic story with scene-by-scene visual prompts and narration.",
      },
    ],
  }),
});

function HomePage() {
  const generate = useServerFn(generateStory);

  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState<GenreId>("scifi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoryResultType | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length < 3 || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await generate({ data: { prompt: prompt.trim(), genre } });
      if (res.error || !res.result) {
        setError(res.error ?? "Failed to generate story.");
      } else {
        setResult(res.result);
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen">
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
            v1.0 · online
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
            Describe a concept, pick a genre, and watch AI craft a complete short story
            with a scene-by-scene visual breakdown.
          </p>
        </section>

        {/* Generator form */}
        <GlassCard variant="neon" className="p-6 sm:p-8 animate-float-up" style={{ animationDelay: "100ms" }}>
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

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 backdrop-blur-md p-4 flex items-start gap-3 animate-float-up">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Generation failed</p>
              <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
            </div>
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
            <StoryResult result={result} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            Neuralcast · V1 · Scenes, images & video coming next
          </p>
        </div>
      </footer>
    </main>
  );
}
