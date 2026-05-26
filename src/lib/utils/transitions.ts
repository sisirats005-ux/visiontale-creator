import { motion, Variants } from "framer-motion";

/**
 * Cinematic Transitions Utility
 * Reusable Framer Motion transition variants for cinematic effects
 */

export const cinematicFadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }
  },
};

export const cinematicSlideUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }
  },
};

export const cinematicSlideDown: Variants = {
  hidden: { opacity: 0, y: -40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }
  },
};

export const cinematicZoomIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1] }
  },
};

export const cinematicZoomOut: Variants = {
  hidden: { opacity: 0, scale: 1.1 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1] }
  },
};

export const cinematicDissolve: Variants = {
  hidden: { opacity: 0, filter: "blur(10px)" },
  visible: { 
    opacity: 1, 
    filter: "blur(0px)",
    transition: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }
  },
};

export const cinematicParallax: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1] }
  },
};

export const sceneTransition: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.5 },
      scale: { duration: 0.5 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.95,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.5 },
      scale: { duration: 0.5 },
    },
  }),
};

export const glowPulse = {
  animate: {
    boxShadow: [
      "0 0 20px oklch(0.78_0.18_230/0.3)",
      "0 0 40px oklch(0.78_0.18_230/0.6)",
      "0 0 20px oklch(0.78_0.18_230/0.3)",
    ],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

export const subtleFloat = {
  animate: {
    y: [0, -10, 0],
  },
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

/**
 * Stagger children animation for lists
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
  },
};
