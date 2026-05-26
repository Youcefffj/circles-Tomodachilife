export type Species = "aqua" | "fire" | "plante" | "spark" | "lunar" | "stone";

export type Stage = "egg" | "baby" | "teen" | "adult";

export const STAGES: Stage[] = ["egg", "baby", "teen", "adult"];

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
   * XP required IN THIS STAGE to advance.
   * Per-stage (not cumulative): when xp reaches xpToNext, the stage
   * advances and the in-stage counter resets to 0.
   *
   * Solo loop: 1 daily mint = +XP_PER_FEED ≈ 1 stage / day. So a
   * disciplined daily player walks the full egg→adult arc in 3 days.
   */
  xpToNext: number | null;
  ageRange: string;
  animClass: string;
};

/**
 * XP economy — tuned so a single daily mint advances exactly one stage.
 * Friend tips compress the curve; solo play stays satisfying.
 */
export const XP_PER_DAILY_MINT = 50;       // one mint claim = full stage
export const XP_PER_NEW_FRIEND = 25;       // first tip from a never-seen feeder
export const XP_PER_REPEAT_FRIEND = 5;     // every tip after that
export const XP_PER_TIP_SENT = 2;          // small generosity reward
export const XP_PER_DEMO_FEED = 12;        // demo click — feels chewy without trivialising

export const STAGE_META: Record<Stage, StageMeta> = {
  egg:   { id: "egg",   label: "Egg",   xpToNext: 50,   ageRange: "Day 1",  animClass: "anim-egg"   },
  baby:  { id: "baby",  label: "Baby",  xpToNext: 50,   ageRange: "Day 2",  animClass: "anim-baby"  },
  teen:  { id: "teen",  label: "Teen",  xpToNext: 50,   ageRange: "Day 3",  animClass: "anim-teen"  },
  adult: { id: "adult", label: "Adult", xpToNext: null, ageRange: "Day 4+", animClass: "anim-adult" },
};

export function nextStage(stage: Stage): Stage | null {
  const idx = STAGES.indexOf(stage);
  return idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
}

export function isStageComplete(stage: Stage, xpInStage: number): boolean {
  const meta = STAGE_META[stage];
  return meta.xpToNext !== null && xpInStage >= meta.xpToNext;
}

export function spritePath(species: Species, stage: Stage): string {
  return `/sprites/${species}_${stage}.png`;
}

export function spritePathClosed(species: Species, stage: Stage): string {
  return `/sprites/${species}_${stage}_close.png`;
}

/** Stable cute name from an address (or any seed). Deterministic, no storage. */
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
