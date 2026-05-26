"use client";

import { useEffect, useMemo, useState } from "react";

import { useSdk } from "@/components/wallet/SdkProvider";
import { stageFromXp, type Stage } from "@/lib/hatch";

type HistoryRow = {
  from?: string;
  to?: string;
  crc?: number | string;
  staticCircles?: number | string;
};

function rowAmount(r: HistoryRow): number {
  const primary = Number(r.crc ?? 0);
  if (Number.isFinite(primary) && primary > 0) return primary;
  const fallback = Number(r.staticCircles ?? 0);
  if (Number.isFinite(fallback) && fallback > 0) return fallback;
  return 0;
}

type ProfileViewMini = { profile?: { name?: string } };

type SdkRead = {
  rpc: {
    transaction: {
      getTransactionHistory: (
        addr: `0x${string}`,
        limit?: number,
      ) => Promise<{ results: HistoryRow[] }>;
    };
    profile: {
      getProfileView: (addr: `0x${string}`) => Promise<ProfileViewMini>;
    };
  };
};

export type LeaderboardRow = {
  address: string;
  name: string | null;
  xp: number;
  stage: Stage;
  feedersCount: number;
  isMe: boolean;
};

const MAX_ROWS = 50;

/**
 * Global Hatch leaderboard.
 *
 * Works in two modes:
 *   • Connected: uses the wallet-bound SDK + force-includes the user
 *   • Anonymous: builds an on-the-fly read-only SDK (no runner needed)
 *
 * In both modes the directory comes from /api/users (Redis SET populated
 * on chat sign-in / egg-state save) and we fan out the same history +
 * profile RPC calls per address. Anonymous mode skips the 'isMe' flag
 * since there's no current user.
 */
export function useFriendsLeaderboard(): {
  rows: LeaderboardRow[];
  loading: boolean;
  error: string | null;
} {
  const sdkState = useSdk();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drop a stable dep value so the effect doesn't refire on every render.
  const myAddress = sdkState.kind === "ready" ? sdkState.address : null;
  const connectedSdk = useMemo(
    () => (sdkState.kind === "ready" ? (sdkState.sdk as SdkRead) : null),
    [sdkState],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // ── Resolve the SDK we'll use for reads ─────────────────
        let sdkInstance: SdkRead;
        if (connectedSdk) {
          sdkInstance = connectedSdk;
        } else {
          // Anonymous read-only instance — no runner needed, the indexer
          // RPC accepts everyone.
          const { Sdk } = await import("@aboutcircles/sdk");
          sdkInstance = new (Sdk as new () => unknown)() as SdkRead;
        }

        // ── Directory of every Hatch user (public registry) ─────
        const res = await fetch("/api/users", { cache: "no-store" });
        const data = (await res.json()) as { users?: string[] };
        const directory = new Set<string>(
          (data.users ?? []).map((a) => a.toLowerCase()),
        );

        // Force-include the current user if we have one (in case
        // their SADD hasn't landed yet — e.g. first connect).
        if (myAddress) directory.add(myAddress.toLowerCase());

        const addresses = Array.from(directory).slice(0, MAX_ROWS);

        // ── Fan-out: history + profile per address, parallel ────
        const results: LeaderboardRow[] = await Promise.all(
          addresses.map(async (addr) => {
            const [history, profile] = await Promise.allSettled([
              sdkInstance.rpc.transaction.getTransactionHistory(
                addr as `0x${string}`,
                100,
              ),
              sdkInstance.rpc.profile.getProfileView(addr as `0x${string}`),
            ]);

            let xp = 0;
            const feeders = new Set<string>();
            if (history.status === "fulfilled") {
              for (const row of history.value.results ?? []) {
                if (row.to?.toLowerCase() === addr) {
                  xp += rowAmount(row);
                  const from = row.from?.toLowerCase();
                  if (from && from !== addr) feeders.add(from);
                }
              }
            }

            const name =
              profile.status === "fulfilled"
                ? profile.value.profile?.name?.trim() || null
                : null;

            return {
              address: addr,
              name,
              xp,
              stage: stageFromXp(xp),
              feedersCount: feeders.size,
              isMe: myAddress ? addr === myAddress.toLowerCase() : false,
            };
          }),
        );

        if (cancelled) return;
        results.sort((a, b) => b.xp - a.xp);
        setRows(results);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [connectedSdk, myAddress]);

  return { rows, loading, error };
}
