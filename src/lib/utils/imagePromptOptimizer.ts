/**
 * Aggressive cinematic prompt optimizer for Pollinations.
 * Keeps prompts short (120–180 chars) to avoid URL limits and provider instability.
 */

const MAX_CHARS = 160;
const MIN_CHARS = 80;

const FILLER_WORDS =
  /\b(very|extremely|highly|incredibly|absolutely|quite|really|somewhat|particularly|especially|beautifully|stunningly|meticulously|carefully|precisely|exactly|literally|simply|just|also|additionally|furthermore|however|meanwhile|overall|essentially|basically)\b/gi;

const REDUNDANT_PHRASES = [
  /\bcharacter appearances? (?:must|should|need to) be\b/gi,
  /\bexact(?:ly)? as specified\b/gi,
  /\bnever (?:leave|describe)\b/gi,
  /\bimage prompt\b/gi,
  /\bflux image generation\b/gi,
  /\bminimum \d+ words\b/gi,
  /\b(?:first|before) (?:lighting|mood|composition)\b/gi,
  /\bspatial relationship\b/gi,
  /\bvisual traits?\b/gi,
  /\bappearance details?\b/gi,
  /\bcolor palette\b/gi,
  /\bcomposition(?:al)? notes?\b/gi,
];

/** Likely character names (Title Case tokens, not common scene words). */
const NOT_NAMES = new Set([
  "The", "A", "An", "In", "On", "At", "With", "And", "Or", "Scene", "Wide", "Medium",
  "Close", "Shot", "Cinematic", "Dramatic", "Soft", "Hard", "Blue", "Red", "Dark",
  "Light", "Neon", "Cyberpunk", "Sci", "Fi", "Fantasy", "Horror", "Mood", "Lighting",
]);

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function dedupeClauses(text: string): string {
  const parts = text.split(/[.;]\s+/).map((p) => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase().slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join(", ");
}

function extractNames(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
  const names: string[] = [];
  for (const m of matches) {
    const first = m.split(/\s+/)[0];
    if (NOT_NAMES.has(first) || NOT_NAMES.has(m)) continue;
    if (m.length < 2 || m.length > 24) continue;
    if (!names.includes(m)) names.push(m);
    if (names.length >= 3) break;
  }
  return names;
}

function extractMoodLighting(text: string): string[] {
  const hints: string[] = [];
  const patterns = [
    /\b(?:neon|holographic|amber|crimson|azure|emerald|golden|moonlit|sunset|dawn|twilight)\s+\w*/gi,
    /\b(?:cyberpunk|noir|dystopian|futuristic|abandoned|ruined|misty|rain-soaked|stormy)\b/gi,
    /\b(?:dramatic|moody|ethereal|ominous|tense|hopeful|melancholic|cinematic)\s+(?:lighting|atmosphere|mood)?/gi,
    /\b(?:wide|medium|close-up|low angle|high angle|tracking|establishing)\s+shot\b/gi,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) hints.push(...m.map((x) => x.trim()));
  }
  return [...new Set(hints)].slice(0, 4);
}

function trimToMax(text: string, max: number): string {
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const lastComma = sliced.lastIndexOf(",");
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastComma > max * 0.6 ? lastComma : lastSpace > max * 0.5 ? lastSpace : max;
  return sliced.slice(0, cut).trim().replace(/[,;]\s*$/, "");
}

export type OptimizedPrompt = {
  prompt: string;
  originalLength: number;
  optimizedLength: number;
  truncated: boolean;
};

/**
 * Reduce long LLM imagePrompt output to a short Pollinations-friendly line.
 */
export function optimizeImagePrompt(raw: string, maxChars = MAX_CHARS): OptimizedPrompt {
  const originalLength = raw.length;
  let text = collapseWhitespace(raw);

  for (const re of REDUNDANT_PHRASES) {
    text = text.replace(re, " ");
  }
  text = text.replace(FILLER_WORDS, " ");
  text = collapseWhitespace(text);
  text = dedupeClauses(text);

  const names = extractNames(raw);
  const moodBits = extractMoodLighting(raw);

  // Build compact cinematic line: names + core scene + mood/lighting
  const segments: string[] = [];

  if (names.length > 0) {
    segments.push(names.join(" and "));
  }

  // Use first meaningful chunk of cleaned text (environment/action)
  const core = text
    .replace(/\b(?:wearing|outfit|hairstyle|hair|eyes|skin|tall|short)\b[^,]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (core.length > 20) {
    const coreShort = trimToMax(core, maxChars - 40);
    segments.push(coreShort);
  }

  if (moodBits.length > 0) {
    segments.push(moodBits.slice(0, 2).join(", "));
  }

  let prompt = segments.filter(Boolean).join(", ");
  if (!prompt || prompt.length < MIN_CHARS / 2) {
    prompt = trimToMax(core || "cinematic movie scene, dramatic lighting", maxChars);
  }

  if (!/\bcinematic\b/i.test(prompt)) {
    prompt += ", cinematic atmosphere, detailed movie still";
  }

  prompt = collapseWhitespace(prompt.replace(/,+/g, ",").replace(/,\s*,/g, ","));
  const truncated = prompt.length > maxChars;
  prompt = trimToMax(prompt, maxChars);

  if (!prompt) {
    prompt = "cinematic movie scene, dramatic lighting, detailed still";
  }

  return {
    prompt,
    originalLength,
    optimizedLength: prompt.length,
    truncated: truncated || originalLength > maxChars,
  };
}
