import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function NeonButton({
  className,
  children,
  loading,
  disabled,
  ...props
}: NeonButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2",
        "rounded-xl px-6 py-3 font-medium tracking-wide",
        "bg-gradient-to-r from-[oklch(0.78_0.18_230)] to-[oklch(0.6_0.22_280)]",
        "text-primary-foreground",
        "shadow-[0_0_24px_oklch(0.78_0.18_230/0.45)]",
        "transition-all duration-300",
        "hover:shadow-[0_0_40px_oklch(0.78_0.18_230/0.7)] hover:-translate-y-0.5",
        "active:translate-y-0",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
