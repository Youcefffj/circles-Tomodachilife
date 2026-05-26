"use client";

import { useMemo } from "react";

import type { Species } from "@/lib/hatch";

/**
 * Species-specific ambient particles, CSS-only.
 *
 *   aqua  → bubbles rising slow and clear
 *   fire  → embers rising fast, shrinking and cooling
 *   other → nothing yet
 */
export function Particles({
  species,
  count = 14,
}: {
  species: Species;
  count?: number;
}) {
  const dots = useMemo(() => seededDots(count, species), [count, species]);

  if (species === "aqua") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {dots.map((d, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${d.left}%`,
              bottom: `${d.bottom}%`,
              width: `${d.size}px`,
              height: `${d.size}px`,
              background:
                "radial-gradient(circle at 35% 30%, oklch(0.98 0.02 220 / 0.95), oklch(0.62 0.16 220 / 0.55) 60%, transparent 75%)",
              boxShadow: "inset -1px -1px 0 oklch(0.4 0.13 235 / 0.45)",
              animation: `bubble-rise ${d.duration}s ease-in ${d.delay}s infinite`,
              ["--drift" as string]: `${d.drift}px`,
            }}
          />
        ))}
      </div>
    );
  }

  if (species === "fire") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {dots.map((d, i) => {
          const size = Math.max(3, d.size - 4); // embers smaller than bubbles
          return (
            <span
              key={i}
              className="anim-ember-flicker absolute rounded-full"
              style={{
                left: `${d.left}%`,
                bottom: `${d.bottom}%`,
                width: `${size}px`,
                height: `${size}px`,
                background:
                  "radial-gradient(circle at 50% 50%, oklch(0.96 0.18 70 / 1), oklch(0.78 0.2 40 / 0.85) 50%, oklch(0.55 0.2 25 / 0.5) 80%, transparent 100%)",
                animation: `ember-rise ${d.duration * 0.6}s ease-out ${d.delay}s infinite, ember-flicker ${1.2 + (i % 3) * 0.2}s ease-in-out infinite`,
                ["--drift" as string]: `${d.drift * 1.2}px`,
              }}
            />
          );
        })}
      </div>
    );
  }

  if (species === "plante") {
    // Leaves fall from the top instead of rising. `bottom` becomes
    // entry-Y (anchored near the top, falling down). We reuse the
    // same seeded dots but reinterpret them.
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {dots.map((d, i) => {
          const palette = i % 3;
          const leafColor =
            palette === 0
              ? "oklch(0.55 0.2 135)"
              : palette === 1
              ? "oklch(0.45 0.18 110)"
              : "oklch(0.65 0.18 95)";
          const w = 9 + (d.size - 6); // slightly varied leaf sizes
          const h = Math.max(4, Math.round(w * 0.55));
          return (
            <span
              key={i}
              className="absolute"
              style={{
                left: `${d.left}%`,
                top: `${d.bottom}%`, // reused: low percentage = near the top
                width: `${w}px`,
                height: `${h}px`,
                background: leafColor,
                borderRadius: "0 100% 0 100%",
                boxShadow: "inset 0 -1px 0 oklch(0 0 0 / 0.2)",
                animation: `leaf-fall ${d.duration + 1.5}s linear ${d.delay}s infinite`,
                ["--drift" as string]: `${d.drift * 1.5}px`,
              }}
            />
          );
        })}
      </div>
    );
  }

  return null;
}

function seededDots(count: number, seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return (h % 10000) / 10000;
  };

  return Array.from({ length: count }, () => ({
    left: 8 + rnd() * 84,
    bottom: rnd() * 22,
    size: 6 + Math.floor(rnd() * 10),
    duration: 3.5 + rnd() * 2.5,
    delay: rnd() * 4,
    drift: Math.round((rnd() - 0.5) * 30),
  }));
}
