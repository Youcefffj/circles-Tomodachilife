"use client";

import { useCallback, useEffect, useState } from "react";

import { SHIPPED_SPECIES, type Species } from "@/lib/hatch";

/**
 * Per-wallet, locally-stored egg lifecycle state.
 *
 *   currentSpecies   the species the *active* blob is. null = no egg picked yet
 *   family           past species the user has hatched to Adult and graduated
 *   xpCheckpoint     cumulative CRC at the moment of the last graduation;
 *                    the current blob's progress = totalXp - xpCheckpoint
 *
 * Storage: localStorage[`hatch_egg_${address}`] = JSON of the above. Per-
 * wallet keying means multiple wallets on one device stay separate; per-
 * device because there's no backend yet.
 */

export type EggState = {
  currentSpecies: Species | null;
  family: Species[];
  xpCheckpoint: number;
};

const EMPTY: EggState = {
  currentSpecies: null,
  family: [],
  xpCheckpoint: 0,
};

const storageKey = (addr: string | null) =>
  addr ? `hatch_egg_${addr.toLowerCase()}` : null;

function read(addr: string | null): EggState {
  const key = storageKey(addr);
  if (!key || typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<EggState>;
    return {
      currentSpecies:
        parsed.currentSpecies && SHIPPED_SPECIES.includes(parsed.currentSpecies)
          ? parsed.currentSpecies
          : null,
      family: Array.isArray(parsed.family)
        ? parsed.family.filter((s): s is Species =>
            SHIPPED_SPECIES.includes(s as Species),
          )
        : [],
      xpCheckpoint:
        typeof parsed.xpCheckpoint === "number" ? parsed.xpCheckpoint : 0,
    };
  } catch {
    return EMPTY;
  }
}

function write(addr: string, value: EggState) {
  if (typeof window === "undefined") return;
  const key = storageKey(addr);
  if (!key) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function useEggState(address: string | null) {
  const [state, setState] = useState<EggState>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  // Reload when wallet changes. setLoaded after the first read so the UI
  // doesn't flash "no egg yet" before we've checked storage.
  useEffect(() => {
    if (!address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(EMPTY);
      setLoaded(false);
      return;
    }
    setState(read(address));
    setLoaded(true);
  }, [address]);

  const update = useCallback(
    (next: EggState) => {
      if (!address) return;
      write(address, next);
      setState(next);
    },
    [address],
  );

  const chooseSpecies = useCallback(
    (species: Species) => {
      update({ ...state, currentSpecies: species });
    },
    [state, update],
  );

  const pickRandom = useCallback(() => {
    const next = SHIPPED_SPECIES[Math.floor(Math.random() * SHIPPED_SPECIES.length)];
    update({ ...state, currentSpecies: next });
    return next;
  }, [state, update]);

  /**
   * Move the currently-grown blob into the family album and lock the
   * total XP at this moment so the next blob restarts at 0. Returns the
   * fresh state so callers can chain immediately.
   */
  const graduate = useCallback(
    (totalXpAtGraduation: number) => {
      if (!state.currentSpecies) return state;
      const next: EggState = {
        currentSpecies: null,
        family: [...state.family, state.currentSpecies],
        xpCheckpoint: totalXpAtGraduation,
      };
      update(next);
      return next;
    },
    [state, update],
  );

  return {
    state,
    loaded,
    chooseSpecies,
    pickRandom,
    graduate,
  };
}
