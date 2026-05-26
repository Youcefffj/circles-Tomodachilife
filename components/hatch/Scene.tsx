"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Particles } from "./Particles";
import { AquaScenery } from "./scenery/AquaScenery";
import { FireScenery } from "./scenery/FireScenery";
import { PlanteScenery } from "./scenery/PlanteScenery";
import type { Species } from "@/lib/hatch";

/**
 * The "tank" — a deep diorama that frames the blob.
 *
 * Shared layers (every species):
 *   1. Tank backdrop gradient (top → mid → deep, driven by --tank-* vars)
 *   2. Two drifting caustic blobs (tinted by --bright-hue)
 *   3. Top shimmer band (water line / heat haze)
 *   4. Floor shadow ellipse
 *   5. Glass top-left highlight
 *   6. Corner LEDs
 *   7. Scanlines overlay
 *
 * Species-specific layers (rendered conditionally between #2 and the
 * children): provide the "feel" of the world — flames for fire,
 * kelp/floor-caustic for aqua, etc.
 */
export function Scene({
  children,
  className,
  height = 360,
  species,
}: {
  children: ReactNode;
  className?: string;
  height?: number;
  species?: Species;
}) {
  const isFire = species === "fire";

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[1.5rem] border-[3px] border-[var(--ink)]",
        "scanlines",
        isFire && "anim-scene-flicker",
        className,
      )}
      style={{
        height,
        background: `
          radial-gradient(120% 70% at 50% 110%, var(--tank-deep) 0%, transparent 60%),
          linear-gradient(180deg,
            var(--tank-top) 0%,
            var(--tank-mid) 45%,
            var(--tank-deep) 100%
          )`,
        boxShadow:
          "0 6px 0 0 var(--ink), 0 24px 40px -16px oklch(0 0 0 / 0.55), inset 0 2px 0 0 oklch(1 0 0 / 0.1)",
        transition: "background 600ms ease-out",
      }}
    >
      {/* Drifting caustic lights — tinted by species */}
      <div
        aria-hidden
        className="anim-caustics-a pointer-events-none absolute -inset-x-20 -top-10 h-2/3 opacity-70"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.96 0.06 var(--bright-hue) / 0.5), transparent 70%)",
          filter: "blur(28px)",
        }}
      />
      <div
        aria-hidden
        className="anim-caustics-b pointer-events-none absolute -inset-x-10 top-6 h-1/2 opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.88 0.1 calc(var(--bright-hue) - 20) / 0.5), transparent 70%)",
          filter: "blur(32px)",
        }}
      />

      {/* Top shimmer band — water-line for aqua, heat haze for fire */}
      <div
        aria-hidden
        className="anim-shimmer pointer-events-none absolute inset-x-0 top-3 h-2"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.96 0.05 var(--bright-hue) / 0.55), transparent)",
          filter: "blur(2px)",
        }}
      />

      {/* Species scenery — each species defines its own world inside the tank */}
      {isFire && <FireScenery />}
      {species === "aqua" && <AquaScenery />}
      {species === "plante" && <PlanteScenery />}

      {/* Tank-wide ambient particles */}
      {species && <Particles species={species} count={18} />}

      {/* Floor shadow under the blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2"
        style={{
          width: "60%",
          height: 18,
          background:
            "radial-gradient(ellipse at center, oklch(0.05 0.04 250 / 0.5), transparent 70%)",
          filter: "blur(3px)",
        }}
      />

      {/* Children (the blob) */}
      <div className="relative z-10 flex h-full w-full items-end justify-center pb-6">
        {children}
      </div>

      {/* Glass top-left highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-1/2 w-2/5 opacity-40"
        style={{
          background:
            "linear-gradient(135deg, oklch(1 0 0 / 0.35), transparent 60%)",
        }}
      />

      {/* Corner LEDs */}
      <span className="absolute left-3 top-3 h-2 w-2 rounded-sm bg-[oklch(0.85_0.18_30)]" />
      <span className="anim-led absolute right-3 top-3 h-2 w-2 rounded-sm bg-[oklch(0.85_0.18_140)]" />
      <span className="absolute left-3 bottom-3 h-2 w-2 rounded-sm bg-[oklch(0.85_0.18_70)]" />
      <span className="anim-led absolute right-3 bottom-3 h-2 w-2 rounded-sm bg-[oklch(0.85_0.18_220)]" />
    </div>
  );
}
