"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readSessionToken } from "@/lib/auth-token";
import { SHIPPED_SPECIES, type Species } from "@/lib/hatch";

/**
 * Per-wallet egg lifecycle state.
 *
 *   currentSpecies   the species the *active* blob is. null = no egg picked yet
 *   family           past species the user has hatched to Adult and graduated
 *   xpCheckpoint     cumulative CRC at the moment of the last graduation;
 *                    the current blob's progress = totalXp - xpCheckpoint
 *
 * Persistence is dual-layered:
 *   1. localStorage  (per device, instant) — `hatch_egg_<address>`
 *   2. Upstash Redis (server, cross-device) — only when the user has
 *      signed in (Bearer token from /api/chat/login).
 *
 * Conflict policy:
 *   • On load, if both stores have data, the one with the larger
 *     updatedAt wins. We compare by (family.length, xpCheckpoint) when
 *     updatedAt is unavailable, since both monotonically increase.
 *   • Local writes are immediate; server PUT is fire-and-forget in the
 *     background (debounced 400ms to collapse rapid edits).
 *   • Server is the source of truth across devices once a sign-in has
 *     happened. Before sign-in, local is the only copy.
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

const localKey = (addr: string | null) =>
  addr ? `hatch_egg_${addr.toLowerCase()}` : null;

function readLocal(addr: string | null): EggState {
  const key = localKey(addr);
  if (!key || typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY;
    return normalize(JSON.parse(raw));
  } catch {
    return EMPTY;
  }
}

function writeLocal(addr: string, value: EggState) {
  if (typeof window === "undefined") return;
  const key = localKey(addr);
  if (!key) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalize(input: unknown): EggState {
  const o = (input ?? {}) as Partial<EggState>;
  return {
    currentSpecies:
      o.currentSpecies && SHIPPED_SPECIES.includes(o.currentSpecies)
        ? o.currentSpecies
        : null,
    family: Array.isArray(o.family)
      ? o.family.filter((s): s is Species =>
          SHIPPED_SPECIES.includes(s as Species),
        )
      : [],
    xpCheckpoint:
      typeof o.xpCheckpoint === "number" && o.xpCheckpoint >= 0
        ? o.xpCheckpoint
        : 0,
  };
}

/** Picks the more advanced state — bigger family wins, ties broken by xpCheckpoint. */
function mergePickLatest(a: EggState, b: EggState): EggState {
  if (a.family.length !== b.family.length) {
    return a.family.length > b.family.length ? a : b;
  }
  return a.xpCheckpoint >= b.xpCheckpoint ? a : b;
}

async function fetchServer(token: string): Promise<EggState | null> {
  try {
    const res = await fetch("/api/egg/state", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { state?: unknown };
    if (!data.state) return null;
    return normalize(data.state);
  } catch {
    return null;
  }
}

async function pushServer(token: string, state: EggState): Promise<void> {
  try {
    await fetch("/api/egg/state", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ state }),
    });
  } catch (err) {
    console.warn("[useEggState] push to server failed:", err);
  }
}

export function useEggState(address: string | null) {
  const [state, setState] = useState<EggState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load: local first (instant), then server (cross-device merge).
  useEffect(() => {
    if (!address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(EMPTY);
      setLoaded(false);
      return;
    }

    let cancelled = false;
    const local = readLocal(address);
    setState(local);
    setLoaded(true);

    const token = readSessionToken();
    if (!token) return; // nothing to merge — local is the only copy

    (async () => {
      const remote = await fetchServer(token);
      if (cancelled || !remote) return;
      const merged = mergePickLatest(local, remote);
      // Write back to local + server only if the merge changed anything.
      const localChanged =
        merged.currentSpecies !== local.currentSpecies ||
        merged.family.length !== local.family.length ||
        merged.xpCheckpoint !== local.xpCheckpoint;
      if (localChanged) {
        setState(merged);
        writeLocal(address, merged);
      }
      const remoteChanged =
        merged.currentSpecies !== remote.currentSpecies ||
        merged.family.length !== remote.family.length ||
        merged.xpCheckpoint !== remote.xpCheckpoint;
      if (remoteChanged) {
        await pushServer(token, merged);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  // ── Update: write local instantly + debounced server push.
  const update = useCallback(
    (next: EggState) => {
      if (!address) return;
      writeLocal(address, next);
      setState(next);

      const token = readSessionToken();
      if (!token) return;

      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => {
        pushServer(token, next);
      }, 400);
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

  /**
   * Force a sync now — used after sign-in to push the current local
   * state to the server as the "initial backup".
   */
  const forcePushToServer = useCallback(async () => {
    const token = readSessionToken();
    if (!token) return;
    await pushServer(token, state);
  }, [state]);

  // Listen for the chat sign-in event — first thing we do is push the
  // current local state up + pull any existing server state down so the
  // sign-in moment doubles as a "sync now" trigger.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!address) return;
    const onSignedIn = async () => {
      const token = readSessionToken();
      if (!token) return;
      // Pull remote, merge, write back the winner everywhere.
      const remote = await fetchServer(token);
      const local = stateRef.current;
      const merged = remote ? mergePickLatest(local, remote) : local;
      const changedLocal =
        merged.currentSpecies !== local.currentSpecies ||
        merged.family.length !== local.family.length ||
        merged.xpCheckpoint !== local.xpCheckpoint;
      if (changedLocal) {
        writeLocal(address, merged);
        setState(merged);
      }
      await pushServer(token, merged);
    };
    window.addEventListener("hatch:signed-in", onSignedIn);
    return () => window.removeEventListener("hatch:signed-in", onSignedIn);
  }, [address]);

  return {
    state,
    loaded,
    chooseSpecies,
    pickRandom,
    graduate,
    forcePushToServer,
  };
}
