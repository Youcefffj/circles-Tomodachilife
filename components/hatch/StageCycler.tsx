"use client";

import { cn } from "@/lib/utils";
import { STAGE_META, STAGES, type Stage } from "@/lib/hatch";

const STAGE_EMOJI: Record<Stage, string> = {
  egg: "🥚",
  baby: "🐣",
  teen: "🐥",
  adult: "🦆",
};

export function StageCycler({
  current,
  onChange,
}: {
  current: Stage;
  onChange: (s: Stage) => void;
}) {
  return (
    <div className="cartridge-sm flex items-center gap-1 p-1">
      {STAGES.map((s) => {
        const active = s === current;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={cn(
              "font-pixel flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] uppercase tracking-wider transition-colors",
              active
                ? "bg-[var(--species-accent)] text-[var(--cream)]"
                : "text-muted-foreground hover:bg-[oklch(0.27_0.06_245)] hover:text-foreground",
            )}
          >
            <span aria-hidden className="text-sm leading-none">
              {STAGE_EMOJI[s]}
            </span>
            <span>{STAGE_META[s].label}</span>
          </button>
        );
      })}
    </div>
  );
}
