import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  skipAnimation?: boolean;
}

/**
 * Typewriter Text Reveal
 * Cinematic progressive text reveal with glowing cursor effect
 * Optional skip animation for better UX
 */
export function TypewriterText({
  text,
  speed = 30,
  className = "",
  onComplete,
  skipAnimation = false,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (skipAnimation) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    let index = 0;
    let timeoutId: NodeJS.Timeout;

    const typeNextChar = () => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
        timeoutId = setTimeout(typeNextChar, speed);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    };

    timeoutId = setTimeout(typeNextChar, speed);

    return () => clearTimeout(timeoutId);
  }, [text, speed, skipAnimation, onComplete]);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  const handleSkip = () => {
    setDisplayedText(text);
    setIsComplete(true);
    onComplete?.();
  };

  return (
    <div className={`relative ${className}`}>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {displayedText}
      </motion.span>
      
      {/* Glowing cursor */}
      {!isComplete && showCursor && (
        <motion.span
          className="inline-block w-0.5 h-5 ml-1 bg-[oklch(0.85_0.15_220)]"
          animate={{
            opacity: [0.5, 1, 0.5],
            boxShadow: [
              "0 0 4px oklch(0.85_0.15_220/0.5)",
              "0 0 8px oklch(0.85_0.15_220/0.8)",
              "0 0 4px oklch(0.85_0.15_220/0.5)",
            ],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Skip button (only visible during animation) */}
      {!isComplete && !skipAnimation && (
        <button
          type="button"
          onClick={handleSkip}
          className="ml-2 text-[10px] font-mono text-[oklch(0.78_0.18_230)] hover:text-[oklch(0.85_0.15_220)] transition-colors opacity-60 hover:opacity-100"
        >
          [skip]
        </button>
      )}
    </div>
  );
}
