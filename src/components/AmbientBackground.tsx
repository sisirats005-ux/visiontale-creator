import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

/**
 * Ambient Background Effects
 * Lightweight floating particles, animated gradients, and subtle glow overlays
 * Maintains cyberpunk aesthetic while adding cinematic immersion
 */
export function AmbientBackground() {
  // Generate random particles
  const particles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            "radial-gradient(ellipse 80% 60% at 20% 20%, oklch(0.78 0.18 230 / 0.15), transparent 50%)",
            "radial-gradient(ellipse 80% 60% at 80% 80%, oklch(0.55 0.2 290 / 0.15), transparent 50%)",
            "radial-gradient(ellipse 80% 60% at 50% 50%, oklch(0.78 0.18 230 / 0.15), transparent 50%)",
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-[oklch(0.78_0.18_230/0.3)] blur-sm"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Light streaks */}
      <motion.div
        className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[oklch(0.78_0.18_230/0.2)] to-transparent"
        animate={{
          y: [0, "100vh"],
          opacity: [0, 0.5, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatDelay: 3,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-[oklch(0.55_0.2_290/0.2)] to-transparent"
        animate={{
          x: [0, "100vw"],
          opacity: [0, 0.5, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatDelay: 4,
          ease: "easeInOut",
        }}
      />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
    </div>
  );
}
