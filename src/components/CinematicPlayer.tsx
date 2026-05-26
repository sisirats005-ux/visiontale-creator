import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, SkipBack, SkipForward, Volume2, Maximize2, Minimize2 } from "lucide-react";
import type { SceneWithNarration } from "@/lib/types/character.types";
import { sceneTransition, cinematicFadeIn } from "@/lib/utils/transitions";
import { TypewriterText } from "./TypewriterText";

interface CinematicPlayerProps {
  scenes: SceneWithNarration[];
  isOpen: boolean;
  onClose: () => void;
}

export function CinematicPlayer({ scenes, isOpen, onClose }: CinematicPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentScene = scenes[currentIndex];

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying || !currentScene?.narrationAudio) return;

    const audio = new Audio(currentScene.narrationAudio.url);
    audioRef.current = audio;

    audio.onended = () => {
      if (currentIndex < scenes.length - 1) {
        handleNext();
      } else {
        setIsPlaying(false);
      }
    };

    audio.play().catch(console.error);

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [currentIndex, isPlaying, currentScene, scenes.length]);

  // Hide controls after inactivity
  useEffect(() => {
    const resetTimeout = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    resetTimeout();
    window.addEventListener("mousemove", resetTimeout);
    window.addEventListener("click", resetTimeout);

    return () => {
      window.removeEventListener("mousemove", resetTimeout);
      window.removeEventListener("click", resetTimeout);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < scenes.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleSceneClick = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  if (!isOpen || !currentScene) return null;

  const encodedPrompt = encodeURIComponent(currentScene.imagePrompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&seed=${currentScene.index}&nologo=true`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-50 bg-black ${isFullscreen ? "" : "rounded-2xl overflow-hidden"}`}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scene Image */}
            <motion.div
              key={currentIndex}
              variants={sceneTransition}
              initial="enter"
              animate="center"
              exit="exit"
              custom={direction}
              className="absolute inset-0"
            >
              <img
                src={imageUrl}
                alt={currentScene.title}
                className="w-full h-full object-cover"
              />
              
              {/* Cinematic vignette overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
              
              {/* Bottom gradient for text readability */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
            </motion.div>

            {/* Scene Number */}
            <motion.div
              variants={cinematicFadeIn}
              initial="hidden"
              animate="visible"
              className="absolute top-6 left-6 font-mono text-2xl text-[oklch(0.85_0.15_220)] neon-glow"
            >
              {String(currentScene.index).padStart(2, "0")}
            </motion.div>

            {/* Scene Title and Narration */}
            <motion.div
              variants={cinematicFadeIn}
              initial="hidden"
              animate="visible"
              className="absolute bottom-12 left-6 right-6 max-w-4xl"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {currentScene.title}
              </h2>
              <div className="text-lg sm:text-xl text-white/90 leading-relaxed">
                <TypewriterText
                  text={currentScene.narration}
                  speed={40}
                  skipAnimation={!isPlaying}
                />
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-6 right-6 flex items-center gap-2"
            >
              {/* Close button */}
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-full glass-neon text-[oklch(0.85_0.15_220)] hover:bg-[oklch(0.78_0.18_230/0.2)] transition-all"
              >
                <X className="h-5 w-5" />
              </motion.button>

              {/* Previous */}
              <motion.button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-full glass-neon text-[oklch(0.85_0.15_220)] hover:bg-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipBack className="h-5 w-5" />
              </motion.button>

              {/* Play/Pause */}
              <motion.button
                type="button"
                onClick={togglePlay}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-4 rounded-full glass-neon text-[oklch(0.85_0.15_220)] hover:bg-[oklch(0.78_0.18_230/0.2)] transition-all neon-glow"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
              </motion.button>

              {/* Next */}
              <motion.button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === scenes.length - 1}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-full glass-neon text-[oklch(0.85_0.15_220)] hover:bg-[oklch(0.78_0.18_230/0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward className="h-5 w-5" />
              </motion.button>

              {/* Fullscreen toggle */}
              <motion.button
                type="button"
                onClick={toggleFullscreen}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-full glass-neon text-[oklch(0.85_0.15_220)] hover:bg-[oklch(0.78_0.18_230/0.2)] transition-all"
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </motion.button>
            </motion.div>

            {/* Scene Progress Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showControls ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-0 left-0 right-0 h-1 bg-white/10"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-[oklch(0.78_0.18_230)] to-[oklch(0.85_0.15_220)]"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / scenes.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </motion.div>

            {/* Scene Thumbnails */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2"
            >
              {scenes.map((scene, index) => (
                <motion.button
                  key={scene.index}
                  type="button"
                  onClick={() => handleSceneClick(index)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-12 h-7 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? "border-[oklch(0.85_0.15_220)] neon-glow"
                      : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={`https://image.pollinations.ai/prompt/${encodeURIComponent(scene.imagePrompt)}?width=100&height=56&seed=${scene.index}&nologo=true`}
                    alt={scene.title}
                    className="w-full h-full object-cover"
                  />
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
