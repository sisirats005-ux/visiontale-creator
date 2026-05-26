import { useState } from "react";
import { motion } from "framer-motion";
import { User, Sparkles, Plus, X } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { NeonButton } from "./NeonButton";
import type { CharacterInput } from "@/lib/types/character.types";

interface CharacterInputFormProps {
  onCharacterAdd: (character: CharacterInput) => void;
  disabled?: boolean;
}

export function CharacterInputForm({ onCharacterAdd, disabled }: CharacterInputFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [appearance, setAppearance] = useState("");
  const [outfit, setOutfit] = useState("");
  const [hairstyle, setHairstyle] = useState("");
  const [visualTraits, setVisualTraits] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !appearance.trim()) return;

    const character: CharacterInput = {
      name: name.trim(),
      appearance: appearance.trim(),
      outfit: outfit.trim() || undefined,
      hairstyle: hairstyle.trim() || undefined,
      visualTraits: visualTraits.trim() || undefined,
    };

    onCharacterAdd(character);
    
    // Reset form
    setName("");
    setAppearance("");
    setOutfit("");
    setHairstyle("");
    setVisualTraits("");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg glass-neon flex items-center justify-center neon-glow">
                <User className="h-5 w-5 text-[oklch(0.85_0.15_220)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Character Consistency</h3>
                <p className="text-xs text-muted-foreground">Add character details for consistent visuals</p>
              </div>
            </div>
            <NeonButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(true)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
              Add Character
            </NeonButton>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard variant="neon" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg glass-neon flex items-center justify-center neon-glow">
              <User className="h-5 w-5 text-[oklch(0.85_0.15_220)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Character Setup</h3>
              <p className="text-xs text-muted-foreground">Define your protagonist's appearance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-[oklch(0.22_0.035_260/0.6)] transition-colors"
            disabled={disabled}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="character-name"
              className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-2"
            >
              Character Name *
            </label>
            <input
              id="character-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled}
              placeholder="e.g., Captain Maya Chen"
              maxLength={50}
              className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="character-appearance"
              className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-2"
            >
              Appearance Description *
            </label>
            <textarea
              id="character-appearance"
              value={appearance}
              onChange={(e) => setAppearance(e.target.value)}
              disabled={disabled}
              placeholder="e.g., Young woman with sharp features, dark eyes, athletic build, determined expression"
              rows={3}
              maxLength={300}
              className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
            />
            <div className="mt-1.5 text-right text-[11px] font-mono text-muted-foreground">
              {appearance.length}/300
            </div>
          </div>

          <div>
            <label
              htmlFor="character-outfit"
              className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-2"
            >
              Outfit (Optional)
            </label>
            <input
              id="character-outfit"
              type="text"
              value={outfit}
              onChange={(e) => setOutfit(e.target.value)}
              disabled={disabled}
              placeholder="e.g., Worn leather jacket, cargo pants, combat boots"
              maxLength={150}
              className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="character-hairstyle"
              className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-2"
            >
              Hairstyle (Optional)
            </label>
            <input
              id="character-hairstyle"
              type="text"
              value={hairstyle}
              onChange={(e) => setHairstyle(e.target.value)}
              disabled={disabled}
              placeholder="e.g., Short black hair, slightly messy"
              maxLength={100}
              className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="character-traits"
              className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-2"
            >
              Visual Traits (Optional)
            </label>
            <input
              id="character-traits"
              type="text"
              value={visualTraits}
              onChange={(e) => setVisualTraits(e.target.value)}
              disabled={disabled}
              placeholder="e.g., Small scar on left cheek, tattoo on right arm"
              maxLength={150}
              className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <NeonButton
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={disabled}
              className="flex-1"
            >
              Cancel
            </NeonButton>
            <NeonButton
              type="submit"
              disabled={!name.trim() || !appearance.trim() || disabled}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4" />
              Save Character
            </NeonButton>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  );
}
