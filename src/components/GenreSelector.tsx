import { cn } from "@/lib/utils";

export const GENRES = [
  { id: "scifi", label: "Sci-Fi", emoji: "🚀" },
  { id: "fantasy", label: "Fantasy", emoji: "🐉" },
  { id: "horror", label: "Horror", emoji: "👻" },
  { id: "mystery", label: "Mystery", emoji: "🔍" },
  { id: "romance", label: "Romance", emoji: "💞" },
  { id: "adventure", label: "Adventure", emoji: "🗺️" },
  { id: "cyberpunk", label: "Cyberpunk", emoji: "🌃" },
  { id: "comedy", label: "Comedy", emoji: "🎭" },
] as const;

export type GenreId = (typeof GENRES)[number]["id"];

interface GenreSelectorProps {
  value: GenreId;
  onChange: (value: GenreId) => void;
  disabled?: boolean;
}

export function GenreSelector({ value, onChange, disabled }: GenreSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {GENRES.map((g) => {
        const active = value === g.id;
        return (
          <button
            key={g.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(g.id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5",
              "text-sm font-medium transition-all duration-200",
              "border backdrop-blur-md",
              active
                ? "bg-[oklch(0.78_0.18_230/0.15)] border-[oklch(0.78_0.18_230/0.6)] text-foreground shadow-[0_0_16px_oklch(0.78_0.18_230/0.35)]"
                : "bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:border-[oklch(0.78_0.18_230/0.35)] hover:text-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <span>{g.emoji}</span>
            <span>{g.label}</span>
          </button>
        );
      })}
    </div>
  );
}
