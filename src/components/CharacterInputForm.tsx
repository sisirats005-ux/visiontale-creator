import { useState, useId } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import {
  User,
  Sparkles,
  Plus,
  X,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Shield,
  Users,
  Sword,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { NeonButton } from "./NeonButton";
import type { CharacterInput } from "@/lib/types/character.types";

const ROLE_OPTIONS = [
  { value: "", label: "No role" },
  { value: "protagonist", label: "Protagonist", icon: Shield },
  { value: "antagonist", label: "Antagonist", icon: Sword },
  { value: "supporting", label: "Supporting", icon: Users },
];

const ROLE_COLORS: Record<string, string> = {
  protagonist: "oklch(0.78_0.18_230)",
  antagonist: "oklch(0.72_0.22_15)",
  supporting: "oklch(0.78_0.18_150)",
};

function getRoleColor(role?: string): string {
  return role ? (ROLE_COLORS[role] ?? "oklch(0.85_0.15_220)") : "oklch(0.85_0.15_220)";
}

function generateId(): string {
  return `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Empty form state ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  appearance: "",
  outfit: "",
  hairstyle: "",
  visualTraits: "",
  role: "",
};

// ─── Single character card (collapsed) ───────────────────────────────────────

interface CharacterChipProps {
  character: CharacterInput;
  onEdit: (character: CharacterInput) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

function CharacterChip({ character, onEdit, onDelete, disabled }: CharacterChipProps) {
  const [expanded, setExpanded] = useState(false);
  const roleColor = getRoleColor(character.role);

  return (
    <Reorder.Item value={character} id={character.id} dragListener={!disabled}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="group relative"
      >
        <div
          className="rounded-xl border border-white/10 bg-[oklch(0.16_0.03_260/0.6)]
                     hover:border-[oklch(0.78_0.18_230/0.3)] transition-all duration-200
                     overflow-hidden"
          style={{ borderLeftColor: roleColor, borderLeftWidth: "2px" }}
        >
          {/* Header row */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            {/* Drag handle */}
            {!disabled && (
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors flex-shrink-0">
                <GripVertical className="h-4 w-4" />
              </div>
            )}

            {/* Avatar placeholder */}
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono"
              style={{
                background: `${roleColor}/0.15`,
                border: `1px solid ${roleColor}/0.35`,
                color: roleColor,
              }}
            >
              {character.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground truncate">
                  {character.name}
                </span>
                {character.role && (
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                    style={{
                      background: `${roleColor}/0.15`,
                      color: roleColor,
                    }}
                  >
                    {character.role}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {character.appearance}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground/60 hover:text-muted-foreground"
                aria-label={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onEdit(character)}
                disabled={disabled}
                className="p-1.5 rounded-lg hover:bg-[oklch(0.78_0.18_230/0.1)] transition-colors text-muted-foreground/60 hover:text-[oklch(0.85_0.15_220)] disabled:opacity-40"
                aria-label="Edit character"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(character.id)}
                disabled={disabled}
                className="p-1.5 rounded-lg hover:bg-[oklch(0.72_0.22_15/0.15)] transition-colors text-muted-foreground/60 hover:text-[oklch(0.72_0.22_15)] disabled:opacity-40"
                aria-label="Delete character"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Expanded detail strip */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-1">
                  {character.outfit && (
                    <p className="text-[11px] text-muted-foreground/80">
                      <span className="font-mono text-[oklch(0.85_0.15_220)/0.7] uppercase tracking-wider text-[10px]">Outfit </span>
                      {character.outfit}
                    </p>
                  )}
                  {character.hairstyle && (
                    <p className="text-[11px] text-muted-foreground/80">
                      <span className="font-mono text-[oklch(0.85_0.15_220)/0.7] uppercase tracking-wider text-[10px]">Hair </span>
                      {character.hairstyle}
                    </p>
                  )}
                  {character.visualTraits && (
                    <p className="text-[11px] text-muted-foreground/80">
                      <span className="font-mono text-[oklch(0.85_0.15_220)/0.7] uppercase tracking-wider text-[10px]">Traits </span>
                      {character.visualTraits}
                    </p>
                  )}
                  {!character.outfit && !character.hairstyle && !character.visualTraits && (
                    <p className="text-[11px] text-muted-foreground/50 italic">No additional details</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CharacterInputFormProps {
  /** Array of saved characters — replaces old single `savedCharacter` prop */
  characters: CharacterInput[];
  onCharactersChange: (characters: CharacterInput[]) => void;
  disabled?: boolean;
}

export function CharacterInputForm({
  characters,
  onCharactersChange,
  disabled,
}: CharacterInputFormProps) {
  const formId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [fields, setFields] = useState(EMPTY_FORM);

  const setField = (key: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setFields((f) => ({ ...f, [key]: e.target.value }));

  const openNew = () => {
    setFields(EMPTY_FORM);
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (character: CharacterInput) => {
    setFields({
      name: character.name,
      appearance: character.appearance,
      outfit: character.outfit ?? "",
      hairstyle: character.hairstyle ?? "",
      visualTraits: character.visualTraits ?? "",
      role: character.role ?? "",
    });
    setEditingId(character.id);
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!fields.name.trim() || !fields.appearance.trim()) return;

    const updated: CharacterInput = {
      id: editingId ?? generateId(),
      name: fields.name.trim(),
      appearance: fields.appearance.trim(),
      outfit: fields.outfit.trim() || undefined,
      hairstyle: fields.hairstyle.trim() || undefined,
      visualTraits: fields.visualTraits.trim() || undefined,
      role: fields.role || undefined,
    };

    if (editingId) {
      onCharactersChange(
        characters.map((c) => (c.id === editingId ? updated : c))
      );
    } else {
      onCharactersChange([...characters, updated]);
    }

    setFields(EMPTY_FORM);
    setEditingId(null);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setFields(EMPTY_FORM);
    setEditingId(null);
    setIsOpen(false);
  };

  const handleDelete = (id: string) => {
    onCharactersChange(characters.filter((c) => c.id !== id));
  };

  const handleReorder = (reordered: CharacterInput[]) => {
    onCharactersChange(reordered);
  };

  const MAX_CHARACTERS = 6;
  const canAddMore = characters.length < MAX_CHARACTERS;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-[oklch(0.78_0.18_230)]" />
          <span className="text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)]">
            Characters
          </span>
          {characters.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">
              ({characters.length}/{MAX_CHARACTERS})
            </span>
          )}
        </div>
        {!isOpen && canAddMore && (
          <NeonButton
            type="button"
            onClick={openNew}
            disabled={disabled}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Character
          </NeonButton>
        )}
      </div>

      {/* Character list with drag-to-reorder */}
      {characters.length > 0 && (
        <Reorder.Group
          axis="y"
          values={characters}
          onReorder={handleReorder}
          className="space-y-2"
          as="div"
        >
          <AnimatePresence>
            {characters.map((char) => (
              <CharacterChip
                key={char.id}
                character={char}
                onEdit={openEdit}
                onDelete={handleDelete}
                disabled={disabled}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* Empty state */}
      {characters.length === 0 && !isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center"
        >
          <User className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground/70">
            No characters yet. Add characters for consistent visuals across all scenes.
          </p>
        </motion.div>
      )}

      {/* Max reached notice */}
      {characters.length >= MAX_CHARACTERS && !isOpen && (
        <p className="text-[11px] font-mono text-muted-foreground/60 text-center">
          Maximum {MAX_CHARACTERS} characters reached
        </p>
      )}

      {/* Add / Edit form */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="char-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <GlassCard variant="neon" className="p-5">
              {/* Form header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg glass-neon flex items-center justify-center neon-glow">
                    <User className="h-4 w-4 text-[oklch(0.85_0.15_220)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {editingId ? "Edit Character" : "New Character"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {editingId
                        ? "Update this character's appearance"
                        : "Define appearance for scene consistency"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  disabled={disabled}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Fields — no <form> wrapper so it never triggers parent form submit */}
              <div className="space-y-4">
                {/* Name + Role row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`${formId}-name`}
                      className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-1.5"
                    >
                      Name *
                    </label>
                    <input
                      id={`${formId}-name`}
                      type="text"
                      value={fields.name}
                      onChange={setField("name")}
                      disabled={disabled}
                      placeholder="Captain Maya Chen"
                      maxLength={50}
                      className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${formId}-role`}
                      className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-1.5"
                    >
                      Role
                    </label>
                    <select
                      id={`${formId}-role`}
                      value={fields.role}
                      onChange={setField("role")}
                      disabled={disabled}
                      className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60 appearance-none cursor-pointer"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Appearance */}
                <div>
                  <label
                    htmlFor={`${formId}-appearance`}
                    className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-1.5"
                  >
                    Appearance *
                  </label>
                  <textarea
                    id={`${formId}-appearance`}
                    value={fields.appearance}
                    onChange={setField("appearance")}
                    disabled={disabled}
                    placeholder="Young woman, sharp features, dark eyes, athletic build, determined expression"
                    rows={2}
                    maxLength={300}
                    className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
                  />
                  <div className="mt-1 text-right text-[11px] font-mono text-muted-foreground">
                    {fields.appearance.length}/300
                  </div>
                </div>

                {/* Outfit */}
                <div>
                  <label
                    htmlFor={`${formId}-outfit`}
                    className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-1.5"
                  >
                    Outfit
                  </label>
                  <input
                    id={`${formId}-outfit`}
                    type="text"
                    value={fields.outfit}
                    onChange={setField("outfit")}
                    disabled={disabled}
                    placeholder="Worn leather jacket, cargo pants, combat boots"
                    maxLength={150}
                    className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
                  />
                </div>

                {/* Hairstyle + Visual Traits row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`${formId}-hairstyle`}
                      className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-1.5"
                    >
                      Hairstyle
                    </label>
                    <input
                      id={`${formId}-hairstyle`}
                      type="text"
                      value={fields.hairstyle}
                      onChange={setField("hairstyle")}
                      disabled={disabled}
                      placeholder="Short black hair"
                      maxLength={100}
                      className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${formId}-traits`}
                      className="block text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.15_220)] mb-1.5"
                    >
                      Visual Traits
                    </label>
                    <input
                      id={`${formId}-traits`}
                      type="text"
                      value={fields.visualTraits}
                      onChange={setField("visualTraits")}
                      disabled={disabled}
                      placeholder="Scar on left cheek"
                      maxLength={150}
                      className="w-full rounded-xl bg-[oklch(0.16_0.03_260/0.6)] border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.78_0.18_230/0.6)] focus:ring-2 focus:ring-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <NeonButton
                    type="button"
                    onClick={handleCancel}
                    disabled={disabled}
                    className="flex-1"
                  >
                    Cancel
                  </NeonButton>
                  {/* type="button" — never triggers parent form submit */}
                  <NeonButton
                    type="button"
                    onClick={handleSave}
                    disabled={
                      !fields.name.trim() || !fields.appearance.trim() || disabled
                    }
                    className="flex-1"
                  >
                    <Sparkles className="h-4 w-4" />
                    {editingId ? "Update Character" : "Save Character"}
                  </NeonButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
