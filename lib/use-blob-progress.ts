"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSdk } from "@/components/wallet/SdkProvider";
import { stageFromXp, type Stage } from "@/lib/hatch";

type HistoryRow = {
  from?: string;
  to?: string;
  crc?: number;
  timestamp?: number;
  transactionHash?: string;
};

type AvatarLike = {
  history: { getTransactions: (limit?: number) => Promise<{ results: HistoryRow[] }> };
};

export type BlobProgress = {
  xp: number;
  stage: Stage;
  feedersCount: number;
  feedersSet: Set<string>;
  firstFedAt: number | null;
  lastFedAt: number | null;
  totalIncoming: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const EMPTY: Omit<BlobProgress, "refresh"> = {
  xp: 0,
  stage: "egg",
  feedersCount: 0,
  feedersSet: new Set(),
  firstFedAt: null,
  lastFedAt: null,
  totalIncoming: 0,
  loading: false,
  error: null,
};

/**
 * Reads the user's Circles history and derives their blob's progress.
 * Incoming CRC = XP; unique senders = feeders; first incoming = hatch date.
 */
export function useBlobProgress(): BlobProgress {
  const sdkState = useSdk();
  const [snapshot, setSnapshot] = useState<Omit<BlobProgress, "refresh">>(EMPTY);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Flatten the variant into a stable dep set the linter is happy with.
  const isReady = sdkState.kind === "ready";
  const userAddress = sdkState.kind === "ready" ? sdkState.address : null;
  const hasAvatar = sdkState.kind === "ready" ? sdkState.hasAvatar : false;
  const avatar = useMemo(
    () =>
      sdkState.kind === "ready" && sdkState.hasAvatar
        ? (sdkState.avatar as AvatarLike | null)
        : null,
    [sdkState],
  );

  useEffect(() => {
    if (!isReady || !hasAvatar || !avatar || !userAddress) {
      setSnapshot(EMPTY);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setSnapshot((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const page = await avatar.history.getTransactions(100);
        const me = userAddress.toLowerCase();
        const incoming = (page.results ?? []).filter(
          (r) => r.to?.toLowerCase() === me,
        );

        let xp = 0;
        let firstFedAt: number | null = null;
        let lastFedAt: number | null = null;
        const feedersSet = new Set<string>();

        for (const r of incoming) {
          xp += r.crc ?? 0;
          const from = r.from?.toLowerCase();
          if (from && from !== me) feedersSet.add(from);
          if (r.timestamp != null) {
            firstFedAt =
              firstFedAt == null ? r.timestamp : Math.min(firstFedAt, r.timestamp);
            lastFedAt =
              lastFedAt == null ? r.timestamp : Math.max(lastFedAt, r.timestamp);
          }
        }

        if (cancelled) return;
        setSnapshot({
          xp,
          stage: stageFromXp(xp),
          feedersCount: feedersSet.size,
          feedersSet,
          firstFedAt,
          lastFedAt,
          totalIncoming: incoming.length,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setSnapshot((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isReady, hasAvatar, avatar, userAddress, tick]);

  return { ...snapshot, refresh };
}
