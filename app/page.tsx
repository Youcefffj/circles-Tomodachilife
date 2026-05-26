"use client";

import { useEffect, useState } from "react";

import { Blob } from "@/components/hatch/Blob";
import { PixelButton } from "@/components/hatch/PixelButton";
import { Scene } from "@/components/hatch/Scene";
import { SpeciesCycler } from "@/components/hatch/SpeciesCycler";
import { StageCycler } from "@/components/hatch/StageCycler";
import { StatTile } from "@/components/hatch/StatTile";
import { XPBar } from "@/components/hatch/XPBar";
import {
  SPECIES,
  STAGE_META,
  XP_PER_DEMO_FEED,
  nextStage,
  type Species,
  type Stage,
} from "@/lib/hatch";

export default function HatchHomePage() {
  const [stage, setStage] = useState<Stage>("teen");
  const [species, setSpecies] = useState<Species>("aqua");
  const [squish, setSquish] = useState(false);
  const [xp, setXp] = useState(25);

  const meta = SPECIES[species];
  const stageMeta = STAGE_META[stage];

  // Paint the whole world to match the active species.
  // This sets a single attribute on <html> which every species-themed
  // CSS variable cascades off of (see :root[data-species="X"] blocks).
  useEffect(() => {
    document.documentElement.dataset.species = species;
  }, [species]);

  // Demo cycler: jump to a stage and reset progress to its midpoint.
  const goToStage = (s: Stage) => {
    setStage(s);
    const target = STAGE_META[s].xpToNext ?? 0;
    setXp(Math.floor(target / 2));
  };

  // Feed: bump XP, trigger squish, and auto-advance when the stage fills.
  const triggerFeed = () => {
    setXp((x) => {
      const cap = stageMeta.xpToNext;
      if (cap === null) return x;
      const next = x + XP_PER_DEMO_FEED;
      if (next >= cap) {
        const upgrade = nextStage(stage);
        if (upgrade) {
          // schedule the stage hop on the next tick so we don't update two
          // state slots inside the same setter (React 19 friendly)
          queueMicrotask(() => setStage(upgrade));
          return 0;
        }
        return cap;
      }
      return next;
    });
    setSquish(false);
    requestAnimationFrame(() => setSquish(true));
    setTimeout(() => setSquish(false), 620);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      {/* ── Title row ──────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[var(--aqua)]">
            Your Nest · {stageMeta.ageRange}
          </p>
          <h1 className="font-pixel mt-1 text-2xl text-foreground sm:text-3xl">
            Hatch your blob.
          </h1>
        </div>
        <FamilyBadge count={0} />
      </div>

      {/* ── Nameplate above the tank ────────────────────────────── */}
      <Nameplate name="Bubbly" species={meta.label} icon={meta.icon} />

      {/* ── The diorama / tank ──────────────────────────────────── */}
      <Scene height={380} species={species}>
        <div className="relative my-2">
          <Blob species={species} stage={stage} squish={squish} size={300} />
        </div>
      </Scene>

      {/* ── XP bar (right under the tank, prominent) ────────────── */}
      <div className="px-1">
        <XPBar
          value={xp}
          max={stageMeta.xpToNext ?? xp}
          label={
            stageMeta.xpToNext === null
              ? "Fully grown · joins your family"
              : `XP · next stage in ${(stageMeta.xpToNext ?? xp) - Math.floor(xp)}`
          }
          tone={species === "fire" ? "fire" : species === "plante" ? "plante" : "aqua"}
        />
      </div>

      {/* ── Stat tile grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Age" value={stageMeta.ageRange} icon="🕒" accent="gold" />
        <StatTile label="Fed by" value="0 friends" icon="👥" accent="species" />
        <StatTile label="Mood" value="Curious" icon="✨" accent="leaf" />
      </div>

      {/* ── Action buttons ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PixelButton size="lg" variant="primary" icon="🍼" onClick={triggerFeed}>
          Feed · 1 CRC
        </PixelButton>
        <PixelButton size="lg" variant="outline" icon="👥">
          Visit a friend
        </PixelButton>
      </div>

      {/* ── Demo cyclers ────────────────────────────────────────── */}
      <section className="mt-2 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4">
        <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
          Demo · preview each species and stage
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <SpeciesCycler current={species} onChange={setSpecies} />
          <StageCycler current={stage} onChange={goToStage} />
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Real progression will come from Circles activity.
        </p>
      </section>
    </div>
  );
}

function Nameplate({
  name,
  species,
  icon,
}: {
  name: string;
  species: string;
  icon: string;
}) {
  return (
    <div className="mx-auto flex items-center gap-2.5">
      <Triangle direction="left" />
      <div className="cartridge-sm font-pixel flex items-center gap-3 bg-[var(--card)] px-5 py-2 text-xs uppercase tracking-wider">
        <span aria-hidden className="text-base leading-none">
          {icon}
        </span>
        <span className="text-foreground">{name}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-[var(--aqua)]">{species}</span>
      </div>
      <Triangle direction="right" />
    </div>
  );
}

function Triangle({ direction }: { direction: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className="block h-2.5 w-2.5"
      style={{
        background: "var(--aqua)",
        clipPath:
          direction === "left"
            ? "polygon(100% 0, 0 50%, 100% 100%)"
            : "polygon(0 0, 100% 50%, 0 100%)",
      }}
    />
  );
}

function FamilyBadge({ count }: { count: number }) {
  return (
    <div className="cartridge-sm flex items-center gap-3 px-3 py-2">
      <span aria-hidden className="text-lg leading-none">
        🐾
      </span>
      <div className="flex flex-col">
        <span className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
          Family
        </span>
        <span className="font-pixel text-base text-foreground">
          {String(count).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
