"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import {
  SPECIES,
  STAGE_META,
  spritePath,
  spritePathClosed,
  type Species,
  type Stage,
} from "@/lib/hatch";

/**
 * Big stage-piece blob.
 *
 * - Picks the sprite from /public/sprites/{species}-{stage}.png
 * - Applies a stage-specific idle animation
 * - Renders species-specific ambient particles around it
 * - Shows a soft "halo" under adults
 * - Falls back to a CSS-drawn placeholder if the PNG hasn't been added yet
 */
export function Blob({
  species,
  stage,
  squish = false,
  size = 240,
}: {
  species: Species;
  stage: Stage;
  squish?: boolean;
  size?: number;
}) {
  const stageMeta = STAGE_META[stage];

  return (
    <div
      className="relative isolate flex items-end justify-center"
      style={{ width: size, height: size }}
    >
      {/* Soft ambient glow under the blob — lifts it off the tank floor */}
      <div
        aria-hidden
        className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full blur-2xl",
          stage === "adult" && "anim-halo",
        )}
        style={{
          width: size * 0.75,
          height: size * 0.28,
          background:
            stage === "adult"
              ? "radial-gradient(ellipse, oklch(0.92 0.1 var(--bright-hue) / 0.7), transparent 70%)"
              : "radial-gradient(ellipse, oklch(0.85 0.08 var(--bright-hue) / 0.4), transparent 75%)",
        }}
      />

      {/* The sprite — or its placeholder.
          Keyed by species+stage so image-load state resets on switch
          (React-19 idiomatic; no useEffect needed). */}
      <div
        className={cn(
          "relative flex items-end justify-center",
          stageMeta.animClass,
          squish && "anim-squish",
        )}
        style={{ width: size * 0.8, height: size * 0.8 }}
      >
        <SpriteLayer
          key={`${species}-${stage}`}
          species={species}
          stage={stage}
          size={size * 0.8}
        />
      </div>
    </div>
  );
}

function SpriteLayer({
  species,
  stage,
  size,
}: {
  species: Species;
  stage: Stage;
  size: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [closedAvailable, setClosedAvailable] = useState(true);
  const stageMeta = STAGE_META[stage];
  const speciesMeta = SPECIES[species];

  if (imgFailed) {
    return <PlaceholderBlob species={species} stage={stage} size={size} />;
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <Image
        src={spritePath(species, stage)}
        alt={`${speciesMeta.label} ${stageMeta.label}`}
        width={size}
        height={size}
        className="pixelated select-none"
        onError={() => setImgFailed(true)}
        unoptimized
        priority
      />
      {closedAvailable && (
        <Image
          src={spritePathClosed(species, stage)}
          alt=""
          width={size}
          height={size}
          className="pixelated anim-blink pointer-events-none absolute inset-0 select-none"
          onError={() => setClosedAvailable(false)}
          unoptimized
        />
      )}
    </div>
  );
}

/**
 * CSS-drawn fallback so the page is alive even before sprites are in /public.
 * Cute but deliberately unfinished-looking — it tells you the PNG is missing.
 */
function PlaceholderBlob({
  species,
  stage,
  size,
}: {
  species: Species;
  stage: Stage;
  size: number;
}) {
  const isEgg = stage === "egg";
  const scale = stage === "baby" ? 0.55 : stage === "teen" ? 0.78 : 1;

  return (
    <div
      aria-hidden
      className="relative"
      style={{
        width: size * scale,
        height: size * scale,
      }}
    >
      <div
        className="absolute inset-0 shadow-inner"
        style={{
          background: `radial-gradient(circle at 35% 30%,
            var(--aqua-soft),
            var(--aqua) 60%,
            var(--aqua-deep) 100%)`,
          borderRadius: isEgg ? "48% 48% 46% 46% / 56% 56% 44% 44%" : "46% 46% 50% 50% / 56% 56% 44% 44%",
          border: "2px solid oklch(0.22 0.02 240 / 0.85)",
        }}
      />
      {!isEgg && (
        <>
          {/* eyes */}
          <span
            className="absolute rounded-full bg-[oklch(0.22_0.02_240)]"
            style={{
              width: size * 0.07 * scale,
              height: size * 0.09 * scale,
              left: "30%",
              top: "40%",
            }}
          />
          <span
            className="absolute rounded-full bg-[oklch(0.22_0.02_240)]"
            style={{
              width: size * 0.07 * scale,
              height: size * 0.09 * scale,
              right: "30%",
              top: "40%",
            }}
          />
          {/* cheek blush */}
          <span
            className="absolute rounded-full bg-[oklch(0.78_0.14_25_/_0.55)]"
            style={{
              width: size * 0.09 * scale,
              height: size * 0.05 * scale,
              left: "22%",
              top: "55%",
            }}
          />
          <span
            className="absolute rounded-full bg-[oklch(0.78_0.14_25_/_0.55)]"
            style={{
              width: size * 0.09 * scale,
              height: size * 0.05 * scale,
              right: "22%",
              top: "55%",
            }}
          />
        </>
      )}
      {isEgg && (
        // hairline crack
        <span
          aria-hidden
          className="absolute"
          style={{
            top: "30%",
            left: "55%",
            width: 2,
            height: size * 0.25,
            background: "oklch(0.22 0.02 240 / 0.6)",
            transform: "rotate(15deg)",
            clipPath:
              "polygon(0 0, 100% 8%, 0 18%, 100% 30%, 0 42%, 100% 55%, 0 68%, 100% 82%, 0 100%)",
          }}
        />
      )}
      <p
        className="font-pixel pointer-events-none absolute bottom-[-1.5rem] left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground"
      >
        drop {`${species}-${stage}.png`} in /public/sprites/
      </p>
    </div>
  );
}
