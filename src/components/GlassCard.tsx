import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "neon";
}

export function GlassCard({ className, variant = "default", ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6 transition-all duration-300",
        variant === "neon" ? "glass-neon" : "glass",
        className,
      )}
      {...props}
    />
  );
}
