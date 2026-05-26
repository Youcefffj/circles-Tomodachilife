"use client";

import { cn } from "@/lib/utils";
import { SPECIES, type Species } from "@/lib/hatch";

/**
 * Demo control: lets us switch species so we can preview each sprite set.
 * Only species we already have sprites for should be listed here for now.
 */
const AVAILABLE: Species[] = ["aqua", "fire", "plante"];

export function SpeciesCycler({
  current,
  onChange,
}: {
  current: Species;
  onChange: (s: Species) => void;
}) {
  return (
    <div className="cartridge-sm flex items-center gap-1 p-1">
      {AVAILABLE.map((s) => {
        const meta = SPECIES[s];
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
              {meta.icon}
            </span>
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
