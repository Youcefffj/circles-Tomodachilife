"use client";

import { useEffect, useMemo, useState } from "react";

import { useSdk } from "@/components/wallet/SdkProvider";
import { stageFromXp, type Stage } from "@/lib/hatch";

type TrustRow = {
  subjectAvatar: string;
  objectAvatar: string;
  relation: "trusts" | "trustedBy" | "mutuallyTrusts";
};

type HistoryRow = { from?: string; to?: string; crc?: number };

type ProfileViewMini = { profile?: { name?: string } };

type AvatarLike = {
  trust: { getAll: () => Promise<TrustRow[]> };
};

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
  relation: TrustRow["relation"];
};

/**
 * Builds a ranked list of the user's trust circle by computing each
 * friend's XP (= cumulative incoming CRC) from their history.
 *
 * Fan-out is intentional: ~20-50 parallel RPC calls is fine for
 * Circles' indexer. Results are sorted XP desc and cached on the
 * sdkState identity (no manual revalidation needed).
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
  const hasAvatar = sdkState.kind === "ready" ? sdkState.hasAvatar : false;
  const avatar = useMemo(
    () =>
      sdkState.kind === "ready" && sdkState.hasAvatar
        ? (sdkState.avatar as AvatarLike | null)
        : null,
    [sdkState],
  );
  const sdkRef = useMemo(
    () => (sdkState.kind === "ready" ? (sdkState.sdk as SdkRead) : null),
    [sdkState],
  );

  useEffect(() => {
    if (!ready || !hasAvatar || !avatar || !sdkRef) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Resolve the user's outgoing + mutual trust links.
        const all = await avatar.trust.getAll();
        const outgoing = all.filter(
          (r) => r.relation === "trusts" || r.relation === "mutuallyTrusts",
        );

        if (cancelled) return;
        if (outgoing.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        // 2. Fan-out: for each friend, fetch their history + profile.
        const results: LeaderboardRow[] = await Promise.all(
          outgoing.map(async (rel) => {
            const addr = rel.objectAvatar;
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
              const me = addr.toLowerCase();
              for (const row of history.value.results ?? []) {
                if (row.to?.toLowerCase() === me) {
                  xp += row.crc ?? 0;
                  const from = row.from?.toLowerCase();
                  if (from && from !== me) feeders.add(from);
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
              relation: rel.relation,
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
  }, [ready, hasAvatar, avatar, sdkRef]);

  return { rows, loading, error };
}
