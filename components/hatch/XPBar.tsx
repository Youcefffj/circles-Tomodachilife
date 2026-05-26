"use client";

import { cn } from "@/lib/utils";

/**
 * Chunky segmented XP bar with a hard-ledge border and glossy fill.
 * Sits inside a dark trough so the bright fill pops.
 */
export function XPBar({
  value,
  max,
  label,
  tone = "aqua",
  className,
}: {
  value: number;
  max: number;
  label?: string;
  tone?: "aqua" | "fire" | "plante" | "spark" | "lunar" | "stone" | "gold";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));

  const toneColor: Record<typeof tone, string> = {
    aqua: "oklch(0.62 0.17 220)",
    fire: "oklch(0.65 0.18 40)",
    plante: "oklch(0.6 0.16 145)",
    spark: "oklch(0.78 0.16 95)",
    lunar: "oklch(0.65 0.2 295)",
    stone: "oklch(0.55 0.04 60)",
    gold: "oklch(0.82 0.14 78)",
  };

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label && (
        <div className="font-pixel flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{label}</span>
          <span className="text-foreground">
            {Math.floor(value)}{" "}
            <span className="text-muted-foreground">/ {max}</span>
          </span>
        </div>
      )}
      <div
        className="relative h-4 w-full overflow-hidden rounded-sm border-2 border-[var(--border)]"
        style={{
          background:
            "repeating-linear-gradient(90deg, oklch(0.115 0.04 245) 0 12px, oklch(0.155 0.045 245) 12px 14px)",
          boxShadow:
            "inset 0 2px 0 0 oklch(0 0 0 / 0.4), 0 2px 0 0 var(--ink)",
        }}
      >
        <div
          className="h-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: `
              linear-gradient(180deg,
                oklch(from ${toneColor[tone]} calc(l + 0.14) c h) 0%,
                ${toneColor[tone]} 55%,
                oklch(from ${toneColor[tone]} calc(l - 0.1) c h) 100%
              )`,
            boxShadow:
              "inset 0 1px 0 0 oklch(1 0 0 / 0.35), inset 0 -2px 0 0 oklch(0 0 0 / 0.15)",
          }}
        />
        {[25, 50, 75].map((m) => (
          <span
            key={m}
            aria-hidden
            className="absolute top-0 h-full w-px bg-[oklch(0_0_0_/_0.35)]"
            style={{ left: `${m}%` }}
          />
        ))}
      </div>
    </div>
  );
}
