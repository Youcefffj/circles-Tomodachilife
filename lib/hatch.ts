export type Species = "aqua" | "fire" | "plante" | "spark" | "lunar" | "stone";

export type Stage = "egg" | "baby" | "teen" | "adult";

export const STAGES: Stage[] = ["egg", "baby", "teen", "adult"];

/**
 * Species that have sprites + scenery ready in this build.
 * Stays in sync with /public/sprites and the SpeciesCycler.
 */
export const SHIPPED_SPECIES: Species[] = ["aqua", "fire", "plante"];

export type SpeciesMeta = {
  id: Species;
  label: string;
  icon: string;
  blurb: string;
  hue: number;
  vibe: string;
};

export const SPECIES: Record<Species, SpeciesMeta> = {
  aqua: {
    id: "aqua",
    label: "Aqua",
    icon: "🌊",
    blurb: "Grows twice as fast under the moon.",
    hue: 220,
    vibe: "Soft tides, gill marks, dreamy.",
  },
  fire: {
    id: "fire",
    label: "Fire",
    icon: "🔥",
    blurb: "Grows twice as fast under the sun.",
    hue: 35,
    vibe: "Crackling sparks, warm and bold.",
  },
  plante: {
    id: "plante",
    label: "Plant",
    icon: "🍃",
    blurb: "Synergy bonus when fed by other Plants.",
    hue: 145,
    vibe: "Vines and quiet curiosity.",
  },
  spark: {
    id: "spark",
    label: "Spark",
    icon: "⚡",
    blurb: "Hatches in 2 hours instead of 12.",
    hue: 90,
    vibe: "Restless, electric, fast.",
  },
  lunar: {
    id: "lunar",
    label: "Lunar",
    icon: "🌙",
    blurb: "Only hatches on full-moon nights. Rare.",
    hue: 280,
    vibe: "Mystical, drifting, soft glow.",
  },
  stone: {
    id: "stone",
    label: "Stone",
    icon: "🪨",
    blurb: "Slowest grower, biggest adult silhouette.",
    hue: 60,
    vibe: "Stubborn, dependable, ancient.",
  },
};

export type StageMeta = {
  id: Stage;
  label: string;
  /**
   * Lower bound of cumulative XP required to *enter* this stage.
   *   egg: 0   → spawn
   *   baby: 10 → first ~half-day of activity
   *   teen: 30 → end of day 1-2
   *   adult: 60 → day 3+
   *
   * 1 CRC received ≈ 1 XP, so the curve tracks ~daily-mint pace
   * (typical mint ≈ 24 CRC/day → one stage per day solo).
   */
  xpEnter: number;
  /** XP at which the next stage begins (null for adult — terminal). */
  xpExit: number | null;
  label_age: string;
  animClass: string;
};

export const STAGE_META: Record<Stage, StageMeta> = {
  egg:   { id: "egg",   label: "Egg",   xpEnter: 0,  xpExit: 10,  label_age: "Day 1",  animClass: "anim-egg"   },
  baby:  { id: "baby",  label: "Baby",  xpEnter: 10, xpExit: 30,  label_age: "Day 2",  animClass: "anim-baby"  },
  teen:  { id: "teen",  label: "Teen",  xpEnter: 30, xpExit: 60,  label_age: "Day 3",  animClass: "anim-teen"  },
  adult: { id: "adult", label: "Adult", xpEnter: 60, xpExit: null, label_age: "Day 4+", animClass: "anim-adult" },
};

/** Derive current stage from cumulative XP. */
export function stageFromXp(xp: number): Stage {
  if (xp >= 60) return "adult";
  if (xp >= 30) return "teen";
  if (xp >= 10) return "baby";
  return "egg";
}

/** Within-stage progress for the XP bar. */
export function xpInStage(xp: number, stage: Stage = stageFromXp(xp)): {
  value: number;
  max: number;
} {
  const meta = STAGE_META[stage];
  if (meta.xpExit === null) {
    return { value: 0, max: 1 };
  }
  return {
    value: Math.max(0, xp - meta.xpEnter),
    max: meta.xpExit - meta.xpEnter,
  };
}

export function nextStage(stage: Stage): Stage | null {
  const idx = STAGES.indexOf(stage);
  return idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
}

export function spritePath(species: Species, stage: Stage): string {
  return `/sprites/${species}_${stage}.png`;
}

export function spritePathClosed(species: Species, stage: Stage): string {
  return `/sprites/${species}_${stage}_close.png`;
}

/**
 * Deterministic species assignment from a Circles address.
 * Same wallet → same species forever. Distribution is uniform over
 * shipped species (no rare/common bias yet).
 */
export function speciesFromAddress(address: string): Species {
  const seed = address.toLowerCase();
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return SHIPPED_SPECIES[h % SHIPPED_SPECIES.length];
}

/** Stable cute name from an address. Deterministic, no storage. */
export function nameFromSeed(seed: string): string {
  const SYL_A = ["Bub", "Mi", "Lo", "Pip", "Zu", "Kai", "Nim", "Plo", "Suu", "Vy"];
  const SYL_B = ["bly", "ko", "ra", "py", "lin", "no", "shi", "rax", "mi", "tle"];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return SYL_A[h % SYL_A.length] + SYL_B[(h >>> 7) % SYL_B.length];
}
