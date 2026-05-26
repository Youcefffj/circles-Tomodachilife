"use client";

import { useEffect, useMemo, useState } from "react";

import { useSdk } from "@/components/wallet/SdkProvider";
import { stageFromXp, type Stage } from "@/lib/hatch";

type HistoryRow = {
  from?: string;
  to?: string;
  // RPC returns numeric fields as strings — coerce before arithmetic.
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

const MAX_ROWS = 50; // cap fan-out to keep the indexer happy

/**
 * Global Hatch leaderboard.
 *
 * Fetches the list of every Hatch user from `/api/users` (a Redis set
 * populated whenever someone signs in or saves egg state), then in
 * parallel pulls each one's transaction history + profile to compute
 * their XP. Sorts XP desc. The current user is always included.
 *
 * Capped at MAX_ROWS to bound fan-out. Tuned for Garage MVP scale —
 * if the user count grows beyond a few hundred we'd want a server-
 * side aggregation pass instead.
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

  const ready = sdkState.kind === "ready";
  const myAddress = sdkState.kind === "ready" ? sdkState.address : null;
  const sdkRef = useMemo(
    () => (sdkState.kind === "ready" ? (sdkState.sdk as SdkRead) : null),
    [sdkState],
  );

  useEffect(() => {
    if (!ready || !sdkRef || !myAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Pull the global directory.
        const res = await fetch("/api/users", { cache: "no-store" });
        const data = (await res.json()) as { users?: string[] };
        const directory = new Set<string>(
          (data.users ?? []).map((a) => a.toLowerCase()),
        );

        // Always include the current user, even if registration hasn't
        // landed in the SET yet (first connect, pre sign-in, etc.).
        directory.add(myAddress.toLowerCase());

        const addresses = Array.from(directory).slice(0, MAX_ROWS);

        // 2. Fan-out: per-user history + profile, parallel.
        const results: LeaderboardRow[] = await Promise.all(
          addresses.map(async (addr) => {
            const [history, profile] = await Promise.allSettled([
              sdkRef.rpc.transaction.getTransactionHistory(
                addr as `0x${string}`,
                100,
              ),
              sdkRef.rpc.profile.getProfileView(addr as `0x${string}`),
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
              isMe: addr === myAddress.toLowerCase(),
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
  }, [ready, sdkRef, myAddress]);

  return { rows, loading, error };
}
