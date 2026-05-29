import type { NarrationAudio } from "@/lib/types/character.types";

const WORDS_PER_MINUTE = 150;
const PREFERRED_VOICE_PATTERNS = [
  /neural/i,
  /premium/i,
  /enhanced/i,
  /natural/i,
  /google us english/i,
  /microsoft .* online/i,
  /samantha/i,
  /alex/i,
];

export type BrowserSpeechHandle = {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
};

type SpeakOptions = {
  volume?: number;
  onStart?: () => void;
  onBoundary?: (progress: number) => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
};

let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function isBrowserSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function estimateSpeechDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round((words / WORDS_PER_MINUTE) * 60));
}

export function createBrowserSpeechNarration(text: string): NarrationAudio {
  const voice = getBestAvailableVoice();
  return {
    url: "",
    duration: estimateSpeechDuration(text),
    service: "speechsynthesis",
    text,
    voiceName: voice?.name,
    isFallback: true,
  };
}

export function cancelBrowserSpeechNarration(): void {
  if (!isBrowserSpeechSupported()) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
}

export function pauseBrowserSpeechNarration(): void {
  if (!isBrowserSpeechSupported()) return;
  window.speechSynthesis.pause();
}

export function resumeBrowserSpeechNarration(): void {
  if (!isBrowserSpeechSupported()) return;
  window.speechSynthesis.resume();
}

export function getBestAvailableVoice(): SpeechSynthesisVoice | null {
  if (!isBrowserSpeechSupported()) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const candidates = englishVoices.length > 0 ? englishVoices : voices;

  return (
    candidates.find((voice) =>
      PREFERRED_VOICE_PATTERNS.some((pattern) => pattern.test(voice.name)),
    ) ??
    candidates.find((voice) => voice.default) ??
    candidates.find((voice) => voice.localService) ??
    candidates[0] ??
    null
  );
}

export function loadBrowserSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isBrowserSpeechSupported()) return Promise.resolve([]);

  const currentVoices = window.speechSynthesis.getVoices();
  if (currentVoices.length > 0) return Promise.resolve(currentVoices);

  if (!voicesReadyPromise) {
    voicesReadyPromise = new Promise((resolve) => {
      const finish = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", finish);
        resolve(window.speechSynthesis.getVoices());
      };

      window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
      window.setTimeout(finish, 1_000);
    });
  }

  return voicesReadyPromise;
}

export async function speakWithBrowserSpeech(
  text: string,
  options: SpeakOptions = {},
): Promise<BrowserSpeechHandle | null> {
  if (!isBrowserSpeechSupported()) return null;

  await loadBrowserSpeechVoices();
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getBestAvailableVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = options.volume ?? 0.9;

  utterance.onstart = () => options.onStart?.();
  utterance.onboundary = (event) => {
    if (text.length > 0 && typeof event.charIndex === "number") {
      options.onBoundary?.(Math.min(100, Math.max(0, (event.charIndex / text.length) * 100)));
    }
  };
  utterance.onend = () => {
    if (activeUtterance === utterance) activeUtterance = null;
    options.onEnd?.();
  };
  utterance.onerror = (event) => {
    if (activeUtterance === utterance) activeUtterance = null;
    options.onError?.(event.error || event);
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);

  return {
    pause: pauseBrowserSpeechNarration,
    resume: resumeBrowserSpeechNarration,
    cancel: () => {
      if (activeUtterance === utterance) activeUtterance = null;
      window.speechSynthesis.cancel();
    },
  };
}
