"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "gold";

const variantBg: Record<Variant, string> = {
  primary:
    "bg-[var(--species-accent)] text-[var(--cream)] hover:bg-[oklch(0.66_0.18_220)]",
  outline:
    "bg-[var(--card)] text-foreground hover:bg-[oklch(0.27_0.06_245)]",
  gold:
    "bg-[var(--gold)] text-[oklch(0.16_0.045_245)] hover:bg-[oklch(0.85_0.15_78)]",
};

export function PixelButton({
  children,
  variant = "primary",
  className,
  icon,
  size = "md",
  ...rest
}: {
  variant?: Variant;
  icon?: ReactNode;
  size?: "md" | "lg";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        "btn-pixel font-pixel inline-flex items-center justify-center gap-2 uppercase tracking-wider",
        size === "lg" ? "px-6 py-3.5 text-xs" : "px-4 py-2.5 text-[11px]",
        variantBg[variant],
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {icon && (
        <span aria-hidden className="text-lg leading-none">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}
