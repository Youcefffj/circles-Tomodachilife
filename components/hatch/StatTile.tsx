"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  icon,
  accent = "species",
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "species" | "gold" | "leaf" | "neutral";
  className?: string;
}) {
  const accentBar: Record<typeof accent, string> = {
    species: "bg-[var(--species-accent)]",
    gold: "bg-[var(--gold)]",
    leaf: "bg-[oklch(0.6_0.16_145)]",
    neutral: "bg-[var(--border)]",
  };

  return (
    <div
      className={cn(
        "cartridge-sm relative flex items-center gap-3 overflow-hidden px-3 py-3",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1.5", accentBar[accent])}
      />
      {icon && (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-[var(--border)] bg-[oklch(0.13_0.04_var(--world-hue,245))] text-lg"
          style={{ background: "oklch(0.13 0.04 var(--world-hue))" }}
        >
          {icon}
        </span>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-pixel truncate text-sm text-foreground">
          {value}
        </span>
      </div>
    </div>
  );
}
